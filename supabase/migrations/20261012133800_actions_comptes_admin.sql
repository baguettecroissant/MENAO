-- F-52 (lot 3b, ADR 0048) : actions de l'équipe sur un compte. Suspension de l'accès (connexion
-- bloquée, sessions fermées) et rétablissement, journal des liens de mot de passe et des exports
-- RGPD, demandes de suppression dans la vue d'ensemble. Réservé aux admins en session aal2.
-- L'effacement des données reste manuel tant que les durées de conservation ne sont pas validées
-- (ADR 0039, TODO(legal)).

-- ---------------------------------------------------------------------------
-- Compte visé par une action de l'équipe : existant, jamais une session anonyme, jamais un membre
-- de l'équipe ni l'admin lui-même.
-- ---------------------------------------------------------------------------
create function app.admin_account_target(p_user_id uuid)
returns public.app_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  select pr.role into v_role
  from auth.users u
  join public.profiles pr on pr.user_id = u.id
  where u.id = p_user_id and not coalesce(u.is_anonymous, false);
  if not found then
    raise exception 'Compte introuvable.' using errcode = '22023';
  end if;
  if v_role in ('admin', 'support') or p_user_id = auth.uid() then
    raise exception 'Les comptes de l''équipe MENAO ne se gèrent pas ici.' using errcode = '22023';
  end if;
  return v_role;
end;
$$;
revoke execute on function app.admin_account_target(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Suspension de l'accès : connexion refusée (banned_until, lu par Supabase Auth) et sessions
-- fermées ; la personne est prévenue avec le motif. Ses données ne changent pas.
-- ---------------------------------------------------------------------------
create function public.admin_suspend_account(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  perform app.admin_account_target(p_user_id);
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'Indiquez le motif de la suspension (1 000 caractères au plus).' using errcode = '22023';
  end if;
  update auth.users set banned_until = now() + interval '100 years'
  where id = p_user_id and (banned_until is null or banned_until <= now());
  if not found then
    raise exception 'L''accès à ce compte est déjà suspendu.' using errcode = '22023';
  end if;
  delete from auth.sessions where user_id = p_user_id;
  perform app.audit('compte.suspendu', 'compte', p_user_id, jsonb_build_object('motif', v_reason));
  perform app.notify(p_user_id, 'acces_suspendu', jsonb_build_object('motif', v_reason));
end;
$$;

create function public.admin_reactivate_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  perform app.admin_account_target(p_user_id);
  update auth.users set banned_until = null
  where id = p_user_id and banned_until > now();
  if not found then
    raise exception 'L''accès à ce compte n''est pas suspendu.' using errcode = '22023';
  end if;
  perform app.audit('compte.retabli', 'compte', p_user_id, '{}');
  perform app.notify(p_user_id, 'acces_retabli', '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- Journal des actions faites hors de la base : lien de réinitialisation envoyé, export RGPD.
-- ---------------------------------------------------------------------------
create function public.admin_log_account_action(p_user_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if p_action not in ('compte.lien_mot_de_passe', 'compte.export') then
    raise exception 'Action inconnue.' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id and not coalesce(u.is_anonymous, false)) then
    raise exception 'Compte introuvable.' using errcode = '22023';
  end if;
  perform app.audit(p_action, 'compte', p_user_id, '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- Vue d'ensemble (ADR 0045) : demandes de suppression en attente et leur échéance la plus proche.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  -- « Aujourd'hui » des compteurs : depuis minuit, heure de Paris.
  v_today_date date := (now() at time zone 'Europe/Paris')::date;
  v_today timestamptz := (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris';
  v_30 timestamptz := now() - interval '30 days';
  v_7 timestamptz := now() - interval '7 days';
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'artisans', (
      select jsonb_build_object(
        'en_verification', count(*) filter (where a.status = 'en_verification'),
        'plus_ancien_dossier', min(a.submitted_at) filter (where a.status = 'en_verification'),
        'valides', count(*) filter (where a.status = 'valide'),
        'visibles', count(*) filter (where a.status = 'valide' and app.artisan_is_visible(a.id)),
        'suspendus', count(*) filter (where a.status = 'suspendu'),
        'inscrits_30j', count(*) filter (where a.created_at >= v_30)
      )
      from public.artisans a
    ),
    'abonnements', (
      select jsonb_build_object(
        'actifs', count(*) filter (where s.status = 'active'),
        'essais', count(*) filter (where s.status = 'trialing'),
        'impayes', count(*) filter (where s.status in ('past_due', 'unpaid')),
        'resilies_30j', count(*) filter (where s.status = 'canceled' and s.updated_at >= v_30)
      )
      from public.subscriptions s
    ),
    'recherches', (
      select jsonb_build_object(
        'aujourdhui', count(*) filter (where p.created_at >= v_today),
        'j30', count(*) filter (where p.created_at >= v_30),
        'envoyees_30j', count(*) filter (where p.created_at >= v_30 and p.status = 'demande_envoyee'),
        'non_envoyees_7j', count(*) filter (
          where p.created_at >= v_7 and p.status in ('brouillon', 'criteres_valides')
        )
      )
      from public.projects p
    ),
    'demandes', (
      select jsonb_build_object(
        'aujourdhui', count(*) filter (where r.created_at >= v_today),
        'j7', count(*) filter (where r.created_at >= v_7),
        'j30', count(*) filter (where r.created_at >= v_30),
        'en_attente', count(*) filter (where r.status = 'envoyee' and r.expires_at > v_now),
        'expirent_12h', count(*) filter (
          where r.status = 'envoyee' and r.expires_at > v_now and r.expires_at <= v_now + interval '12 hours'
        ),
        'acceptees_30j', count(*) filter (where r.status = 'acceptee' and r.created_at >= v_30),
        'refusees_30j', count(*) filter (where r.status = 'refusee' and r.created_at >= v_30),
        'expirees_30j', count(*) filter (where r.status = 'expiree' and r.created_at >= v_30)
      )
      from public.requests r
    ),
    'devis', (
      select jsonb_build_object(
        'envoyes_30j', count(*) filter (where q.sent_at >= v_30),
        'signes_30j', count(*) filter (where q.signed_at >= v_30),
        'signes_30j_cents', coalesce(sum(q.total_ttc_cents) filter (where q.signed_at >= v_30), 0)
      )
      from public.quotes q
    ),
    'chantiers', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (select c.status, count(*) as n from public.chantiers c group by c.status) s
    ),
    -- Paiements des clients aux artisans, sur leurs comptes Stripe : MENAO n'encaisse rien.
    'paiements', (
      select jsonb_build_object(
        'payes_30j', count(*) filter (where pa.status = 'paye' and pa.paid_at >= v_30),
        'payes_30j_cents', coalesce(
          sum(pa.amount_cents) filter (where pa.status = 'paye' and pa.paid_at >= v_30), 0
        ),
        'echoues_7j', count(*) filter (where pa.status = 'echoue' and pa.updated_at >= v_7)
      )
      from public.payments pa
    ),
    'avis', (
      select jsonb_build_object(
        'publies_30j', count(*) filter (where rv.status = 'publie' and rv.created_at >= v_30),
        'note_moyenne', round(avg(rv.score) filter (where rv.status = 'publie'))
      )
      from public.reviews rv
    ),
    'tickets', (
      select jsonb_build_object(
        'ouverts', count(*) filter (where t.status <> 'resolu'),
        'en_retard', count(*) filter (where t.status <> 'resolu' and t.due_at < v_now),
        'litiges', count(*) filter (where t.status <> 'resolu' and t.type = 'litige'),
        -- Demandes de suppression du compte (RGPD, réponse sous un mois ; ADR 0039, 0048).
        'suppressions', count(*) filter (where t.status <> 'resolu' and t.type = 'suppression_compte'),
        'suppression_echeance', min(t.due_at) filter (
          where t.status <> 'resolu' and t.type = 'suppression_compte'
        )
      )
      from public.tickets t
    ),
    -- F-51 : renouvellements déposés à vérifier, assurances d'artisans actifs proches de l'échéance.
    'documents', (
      select jsonb_build_object(
        'renouvellements', count(*) filter (where d.status = 'en_attente'),
        'assurances_7j', count(*) filter (
          where d.status = 'valide' and d.type in ('decennale', 'rc_pro')
            and d.date_fin <= v_today_date + 7
            and not exists (
              select 1 from public.artisan_documents n
              where n.artisan_id = d.artisan_id and n.type = d.type and n.status = 'en_attente'
            )
        )
      )
      from public.artisan_documents d
      join public.artisans a on a.id = d.artisan_id
      where a.status in ('valide', 'suspendu')
    )
  );
end;
$$;

revoke execute on function public.admin_suspend_account(uuid, text) from public, anon;
revoke execute on function public.admin_reactivate_account(uuid) from public, anon;
revoke execute on function public.admin_log_account_action(uuid, text) from public, anon;
grant execute on function public.admin_suspend_account(uuid, text) to authenticated;
grant execute on function public.admin_reactivate_account(uuid) to authenticated;
grant execute on function public.admin_log_account_action(uuid, text) to authenticated;
