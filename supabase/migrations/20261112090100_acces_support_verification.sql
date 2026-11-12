-- Rangement du back-office, lot 4 (F-135, ADR 0286) : accès de l'équipe par rôle.
-- - Support : en plus de la boîte de réception, consultation (sans action) des demandes, chantiers,
--   comptes et fiches artisans. Ses lectures de tables passaient déjà par app.is_staff() ; ce sont
--   les fonctions des listes et fiches, réservées aux admins, qui s'ouvrent. Toutes les actions
--   restent réservées aux admins (app.require_admin). Il ne lit ni les documents des artisans, ni
--   les abonnements, ni le journal d'audit (politiques inchangées, admins seulement).
-- - Vérification : dossiers artisans et conformité (documents, certifications, décision,
--   renouvellements, contrôles aléatoires), double authentification exigée comme pour un admin.
--   Lecture limitée aux artisans : ni demandes, ni chantiers, ni messages, ni argent.

-- ---------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------
-- Vrai pour un admin, ou pour un membre « Vérification » en session aal2.
create function app.is_verifier()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.is_admin()
    or coalesce(app.jwt_role() = 'verification' and (auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create function app.require_verifier()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not app.is_verifier() then
    raise exception 'Réservé aux administrateurs et à la vérification (double authentification requise).' using errcode = '42501';
  end if;
end;
$$;

create function app.require_staff()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
end;
$$;

grant execute on function app.is_verifier() to authenticated;
grant execute on function app.require_verifier() to authenticated;
grant execute on function app.require_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Lectures du rôle Vérification : l'artisan, son dossier et ses contrôles
-- ---------------------------------------------------------------------------
create policy "artisans : lecture par la vérification"
  on public.artisans for select to authenticated using ((select app.is_verifier()));
create policy "artisan_documents : lecture par la vérification"
  on public.artisan_documents for select to authenticated using ((select app.is_verifier()));
create policy "certifications : lecture par la vérification"
  on public.certifications for select to authenticated using ((select app.is_verifier()));
create policy "artisan_trades : lecture par la vérification"
  on public.artisan_trades for select to authenticated using ((select app.is_verifier()));
create policy "artisan_work_types : lecture par la vérification"
  on public.artisan_work_types for select to authenticated using ((select app.is_verifier()));
create policy "artisan_zones : lecture par la vérification"
  on public.artisan_zones for select to authenticated using ((select app.is_verifier()));
create policy "artisan_territories : lecture par la vérification"
  on public.artisan_territories for select to authenticated using ((select app.is_verifier()));
create policy "artisan_photos : lecture par la vérification"
  on public.artisan_photos for select to authenticated using ((select app.is_verifier()));
create policy "artisan_charter_acceptances : lecture par la vérification"
  on public.artisan_charter_acceptances for select to authenticated using ((select app.is_verifier()));
create policy "artisan_rge_qualifications : lecture par la vérification"
  on public.artisan_rge_qualifications for select to authenticated using ((select app.is_verifier()));
create policy "artisan_spot_checks : lecture par la vérification"
  on public.artisan_spot_checks for select to authenticated using ((select app.is_verifier()));
create policy "artisan_reviews : lecture par la vérification"
  on public.artisan_reviews for select to authenticated using ((select app.is_verifier()));
create policy "trades : lecture par la vérification"
  on public.trades for select to authenticated using ((select app.is_verifier()));
create policy "work_types : lecture par la vérification"
  on public.work_types for select to authenticated using ((select app.is_verifier()));
-- Profils : ceux des artisans (dirigeant) et ceux de l'équipe (auteurs des décisions), pas ceux
-- des particuliers.
create policy "profiles : lecture par la vérification (artisans et équipe)"
  on public.profiles for select to authenticated
  using (
    (select app.is_verifier())
    and (
      role in ('admin', 'support', 'verification')
      or exists (select 1 from public.artisans a where a.user_id = profiles.user_id)
    )
  );
create policy "artisan-documents : lecture par la vérification"
  on storage.objects for select to authenticated
  using (bucket_id = 'artisan-documents' and (select app.is_verifier()));
create policy "artisan-logos : lecture par la vérification"
  on storage.objects for select to authenticated
  using (bucket_id = 'artisan-logos' and (select app.is_verifier()));

-- ---------------------------------------------------------------------------
-- Fonctions (définitions en vigueur reprises, seule la garde ou la liste des rôles change)
-- ---------------------------------------------------------------------------
-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_projects(p_filter text DEFAULT 'toutes'::text, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(project_id uuid, created_at timestamp with time zone, etape text, metier text, ville text, client text, demandes integer, acceptees integer, en_attente integer, prochaine_echeance timestamp with time zone, chantier_id uuid, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.project_id, r.created_at, r.etape, r.metier, r.ville, r.client, r.demandes,
    r.acceptees, r.en_attente, r.prochaine_echeance, r.chantier_id, count(*) over ()
  from app.admin_project_rows() r
  where (
      coalesce(p_filter, 'toutes') = 'toutes'
      or r.etape = p_filter
      or (p_filter = 'expirent' and r.prochaine_echeance <= now() + interval '12 hours')
    )
    and (
      v_like is null
      or r.metier ilike v_like or r.ville ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.artisans ilike v_like or r.description ilike v_like
    )
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_project_counts(p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'toutes', count(*),
      'non_envoyee', count(*) filter (where r.etape = 'non_envoyee'),
      'en_attente', count(*) filter (where r.etape = 'en_attente'),
      'expirent', count(*) filter (where r.prochaine_echeance <= now() + interval '12 hours'),
      'chantier', count(*) filter (where r.etape = 'chantier'),
      'sans_suite', count(*) filter (where r.etape = 'sans_suite')
    )
    from app.admin_project_rows() r
    where v_like is null
      or r.metier ilike v_like or r.ville ilike v_like or r.client ilike v_like
      or r.email ilike v_like or r.artisans ilike v_like or r.description ilike v_like
  );
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_chantiers(p_statuses chantier_status[] DEFAULT NULL::chantier_status[], p_query text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(chantier_id uuid, created_at timestamp with time zone, status chantier_status, title text, ville text, artisan_id uuid, artisan text, client text, derniere_activite timestamp with time zone, devis_ttc_cents bigint, paye_cents bigint, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.chantier_id, r.created_at, r.status, r.title, r.ville, r.artisan_id, r.artisan,
    r.client, r.derniere_activite, r.devis_ttc_cents, r.paye_cents, count(*) over ()
  from app.admin_chantier_rows() r
  where (p_statuses is null or cardinality(p_statuses) = 0 or r.status = any (p_statuses))
    and (
      v_like is null
      or r.title ilike v_like or r.ville ilike v_like or r.artisan ilike v_like
      or r.client ilike v_like or r.email ilike v_like
    )
  order by r.derniere_activite desc nulls last
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_chantier_counts(p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
    from (
      select r.status, count(*) as n
      from app.admin_chantier_rows() r
      where v_like is null
        or r.title ilike v_like or r.ville ilike v_like or r.artisan ilike v_like
        or r.client ilike v_like or r.email ilike v_like
      group by r.status
    ) s
  );
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_people(p_role text DEFAULT 'tous'::text, p_query text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, name text, email text, phone text, role text, artisan_id uuid, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.user_id, r.created_at, r.last_sign_in_at, r.name, r.email, r.phone, r.role,
    r.artisan_id, count(*) over ()
  from app.admin_people_rows() r
  where app.admin_role_matches(p_role, r.role)
    and (v_like is null or r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like)
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_people_counts(p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'tous', count(*),
      'particuliers', count(*) filter (where app.admin_role_matches('particuliers', r.role)),
      'artisans', count(*) filter (where app.admin_role_matches('artisans', r.role)),
      'equipe', count(*) filter (where app.admin_role_matches('equipe', r.role))
    )
    from app.admin_people_rows() r
    where v_like is null or r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like
  );
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_user_emails(p_user_ids uuid[])
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text from auth.users u
  where u.id = any (p_user_ids) and not coalesce(u.is_anonymous, false);
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_user_account(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'email_confirmed_at', u.email_confirmed_at,
      'banned_until', u.banned_until
    )
    from auth.users u
    where u.id = p_user_id and not coalesce(u.is_anonymous, false)
  );
end;
$function$;

-- Lecture ouverte au support (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_artisan_activity(p_artisan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not app.is_staff() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'demandes', (
      select jsonb_build_object(
        'total', count(*),
        'en_attente', count(*) filter (where r.status = 'envoyee' and r.expires_at > now()),
        'acceptees', count(*) filter (where r.status = 'acceptee'),
        'refusees', count(*) filter (where r.status = 'refusee'),
        'expirees', count(*) filter (where r.status = 'expiree'),
        'annulees', count(*) filter (where r.status = 'annulee')
      )
      from public.requests r where r.artisan_id = p_artisan_id
    ),
    'chantiers', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (
        select c.status, count(*) as n from public.chantiers c
        where c.artisan_id = p_artisan_id group by c.status
      ) s
    ),
    'avis', (
      select jsonb_build_object(
        'publies', count(*) filter (where rv.status = 'publie'),
        'note_moyenne', round(avg(rv.score) filter (where rv.status = 'publie'))
      )
      from public.reviews rv where rv.artisan_id = p_artisan_id
    )
  );
end;
$function$;

-- Score MENAO de la fiche artisan : lecture ouverte au support.
CREATE OR REPLACE FUNCTION public.admin_artisan_menao_score(p_artisan_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform app.require_staff();
  return (
    select json_build_object('score', s.score, 'verifie', s.verifie, 'experience', s.experience,
      'diplomes', s.diplomes, 'profil', s.profil, 'reactivite', s.reactivite, 'avis', s.avis)
    from app.artisan_menao_score(p_artisan_id) s
    where exists (select 1 from public.artisans a where a.id = p_artisan_id)
  );
end;
$function$;

-- Recherche du haut : admin et support sur tout ; la vérification sur les artisans seulement.
CREATE OR REPLACE FUNCTION public.admin_search(p_query text, p_limit integer DEFAULT 6)
 RETURNS TABLE(kind text, id uuid, label text, detail text, tag text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
  -- SIRET saisi avec des espaces.
  v_digits text := nullif(regexp_replace(coalesce(p_query, ''), '\s', '', 'g'), '');
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 20);
  -- Rôle Vérification (ADR 0286) : artisans seulement.
  v_all boolean := app.is_staff();
begin
  if not (app.is_staff() or app.is_verifier()) then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_like is null then
    return;
  end if;
  return query
  (select 'personne'::text, r.user_id, coalesce(r.name, r.email), r.email, r.role
    from app.admin_people_rows() r
    where v_all and (r.name ilike v_like or r.email ilike v_like or r.phone ilike v_like)
    order by r.created_at desc limit v_limit)
  union all
  (select 'artisan', a.id, coalesce(a.nom_commercial, a.raison_sociale, a.siret), a.siret, a.status::text
    from public.artisans a
    where a.nom_commercial ilike v_like or a.raison_sociale ilike v_like
      or (v_digits ~ '^[0-9]{3,14}$' and left(a.siret, length(v_digits)) = v_digits)
    order by a.created_at desc limit v_limit)
  union all
  (select 'chantier', c.id, c.title, c.ville_nom, c.status::text
    from public.chantiers c
    where v_all and c.title ilike v_like
    order by c.created_at desc limit v_limit)
  union all
  (select 'devis', q.chantier_id, q.numero, c.title, q.status::text
    from public.quotes q
    join public.chantiers c on c.id = q.chantier_id
    where v_all and q.numero ilike v_like
    order by q.created_at desc limit v_limit)
  union all
  (select 'facture', i.chantier_id, i.numero, c.title, i.kind::text
    from public.invoices i
    join public.chantiers c on c.id = i.chantier_id
    where v_all and i.numero ilike v_like
    order by i.created_at desc limit v_limit);
end;
$function$;

-- Ouvert au rôle Vérification (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_review_document(p_document_id uuid, p_status document_status, p_reason text DEFAULT NULL::text, p_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.artisan_documents;
begin
  perform app.require_verifier();
  if p_status not in ('valide', 'refuse') then
    raise exception 'Décision attendue : valide ou refuse.' using errcode = '22023';
  end if;
  if p_status = 'refuse' and (p_code is null or nullif(btrim(coalesce(p_reason, '')), '') is null) then
    raise exception 'Motif de refus obligatoire.' using errcode = '22023';
  end if;

  select * into d from public.artisan_documents where id = p_document_id for update;
  if not found or d.status = 'remplace' then
    raise exception 'Document introuvable.' using errcode = '22023';
  end if;

  if p_status = 'valide' then
    update public.artisan_documents set status = 'remplace'
    where artisan_id = d.artisan_id and type = d.type and status = 'valide' and id <> d.id;
  end if;

  update public.artisan_documents set
    status = p_status,
    refusal_reason = case when p_status = 'refuse' then left(btrim(p_reason), 500) end,
    refusal_code = case when p_status = 'refuse' then p_code end,
    verified_at = now(),
    verified_by = (select auth.uid())
  where id = d.id;

  perform app.audit('document.' || p_status::text, 'artisan_document', d.id,
    jsonb_build_object('artisan_id', d.artisan_id, 'type', d.type, 'motif', p_reason, 'code', p_code));

  if p_status = 'valide' then
    perform app.reactivate_if_compliant(d.artisan_id);
  end if;
end;
$function$;

-- Ouvert au rôle Vérification (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_verify_certification(p_certification_id uuid, p_verified boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform app.require_verifier();
  update public.certifications
  set verified_at = case when p_verified then now() end
  where id = p_certification_id;
  if not found then
    raise exception 'Certification introuvable.' using errcode = '22023';
  end if;
  perform app.audit(case when p_verified then 'certification.verifiee' else 'certification.annulee' end,
    'certification', p_certification_id);
end;
$function$;

-- Ouvert au rôle Vérification (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_decide_artisan(p_artisan_id uuid, p_decision review_decision, p_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.artisans;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  perform app.require_verifier();

  select * into a from public.artisans where id = p_artisan_id for update;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = '22023';
  end if;
  if a.status <> 'en_verification' then
    raise exception 'Seul un dossier en vérification peut faire l''objet d''une décision.' using errcode = '22023';
  end if;
  if p_decision <> 'valide' and v_message is null then
    raise exception 'Un message est obligatoire pour un refus ou une demande de complément.' using errcode = '22023';
  end if;

  if p_decision = 'valide' then
    if not app.documents_complete(a.id, array['valide']::public.document_status[]) then
      raise exception 'Les 5 documents doivent être validés et en cours de validité.' using errcode = '22023';
    end if;
    if not coalesce(a.sirene_active, false) then
      raise exception 'Entreprise inactive selon l''INSEE.' using errcode = '22023';
    end if;

    update public.artisans set status = 'valide', refusal_reason = null where id = a.id;
    -- Rôle « artisan » (app_metadata, synchronisé dans profiles par trigger).
    update auth.users
    set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'artisan')
    where id = a.user_id;
  elsif p_decision = 'refuse' then
    update public.artisans set status = 'refuse', refusal_reason = left(v_message, 500) where id = a.id;
  else
    -- Complément : retour en brouillon, le message est affiché à l'artisan.
    update public.artisans set status = 'brouillon', refusal_reason = left(v_message, 500) where id = a.id;
  end if;

  insert into public.artisan_reviews (artisan_id, admin_id, decision, message)
  values (a.id, (select auth.uid()), p_decision, v_message);
  perform app.audit('artisan.' || p_decision::text, 'artisan', a.id, jsonb_build_object('message', v_message));
end;
$function$;

-- Ouvert au rôle Vérification (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_complete_spot_check(p_id uuid, p_result text, p_note text DEFAULT NULL::text, p_insurer_called boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_artisan uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform app.require_verifier();
  if p_result is null or p_result not in ('conforme', 'non_conforme') then
    raise exception 'Résultat attendu : conforme ou non conforme.' using errcode = '22023';
  end if;
  if p_result = 'non_conforme' and v_note is null then
    raise exception 'Une note est obligatoire pour un contrôle non conforme.' using errcode = '22023';
  end if;

  update public.artisan_spot_checks set
    result = p_result,
    note = left(v_note, 1000),
    insurer_called = coalesce(p_insurer_called, false),
    checked_at = now(),
    checked_by = (select auth.uid())
  where id = p_id
  returning artisan_id into v_artisan;
  if v_artisan is null then
    raise exception 'Contrôle introuvable.' using errcode = '22023';
  end if;

  perform app.audit('artisan.controle_' || p_result, 'artisan', v_artisan,
    jsonb_build_object('note', v_note, 'assureur_appele', coalesce(p_insurer_called, false)));
end;
$function$;

-- Ouvert au rôle Vérification (avant : admins seulement).
CREATE OR REPLACE FUNCTION public.admin_draw_spot_checks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform app.require_verifier();
  return app.draw_spot_checks();
end;
$function$;

-- Inscriptions en cours (Dossiers artisans) : aussi pour le rôle Vérification.
CREATE OR REPLACE FUNCTION public.admin_stalled_signups()
 RETURNS TABLE(artisan_id uuid, entreprise text, etat text, manque text[], depuis timestamp with time zone, relances integer, derniere_relance timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not (app.is_staff() or app.is_verifier()) then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select s.id, s.entreprise, s.etat, s.manque, s.depuis,
         (select count(*)::int from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis),
         (select max(n.created_at) from public.notifications n
          where n.user_id = s.user_id and n.type = s.relance and n.created_at >= s.depuis)
  from (
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale) as entreprise,
           case when a.refusal_reason is not null then 'complement' else 'dossier' end as etat,
           app.onboarding_missing_steps(a.id) as manque,
           app.signup_cycle_start(a.id) as depuis,
           'inscription_relance'::public.notification_type as relance
    from public.artisans a
    where a.status = 'brouillon'
    union all
    select a.id, a.user_id, coalesce(a.nom_commercial, a.raison_sociale), 'activation',
           app.activation_missing_steps(a.id),
           coalesce((select max(rv.created_at) from public.artisan_reviews rv
                     where rv.artisan_id = a.id and rv.decision = 'valide'), a.created_at),
           'activation_relance'::public.notification_type
    from public.artisans a
    where a.status = 'valide' and not app.artisan_is_visible(a.id)
  ) s
  order by s.depuis
  limit 500;
end;
$function$;

-- Alerte « dossier à vérifier » : admins et rôle Vérification.
CREATE OR REPLACE FUNCTION app.artisans_notify_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status = 'en_verification' and new.submitted_at is not null
    and (old.status is distinct from new.status or old.submitted_at is distinct from new.submitted_at)
  then
    perform app.notify(p.user_id, 'equipe_dossier_a_verifier', jsonb_build_object(
      'artisan_id', new.id, 'entreprise', coalesce(new.nom_commercial, new.raison_sociale)
    ))
    from public.profiles p
    where p.role in ('admin', 'verification');
    perform app.notify(new.user_id, 'dossier_envoye', jsonb_build_object(
      'renvoi', old.status = 'refuse' or old.submitted_at is not null
    ));
  end if;
  return null;
end;
$function$;

-- Membres de l'équipe : trois accès.
CREATE OR REPLACE FUNCTION app.staff_target(p_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text;
begin
  select u.raw_app_meta_data ->> 'role' into v_role
  from auth.users u
  where u.id = p_user_id and (u.banned_until is null or u.banned_until <= now());
  if v_role is null or v_role not in ('admin', 'support', 'verification') then
    raise exception 'Membre de l''équipe introuvable.' using errcode = '22023';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Vous ne pouvez pas modifier votre propre accès.' using errcode = '22023';
  end if;
  return v_role::public.app_role;
end;
$function$;

-- Membres de l'équipe : trois accès.
CREATE OR REPLACE FUNCTION public.admin_staff_members()
 RETURNS TABLE(user_id uuid, prenom text, nom text, email text, role app_role, double_auth boolean, derniere_connexion timestamp with time zone, invite_le timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform app.require_admin();
  return query
  select u.id, p.first_name, p.last_name, u.email::text,
         (u.raw_app_meta_data ->> 'role')::public.app_role,
         exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'),
         u.last_sign_in_at,
         coalesce(u.invited_at, u.created_at)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.raw_app_meta_data ->> 'role' in ('admin', 'support', 'verification')
    and (u.banned_until is null or u.banned_until <= now())
  order by case u.raw_app_meta_data ->> 'role' when 'admin' then 0 when 'verification' then 1 else 2 end,
    p.last_name, p.first_name, u.email;
end;
$function$;

-- Changer l'accès : trois accès.
CREATE OR REPLACE FUNCTION public.admin_set_staff_role(p_user_id uuid, p_role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_current public.app_role;
begin
  perform app.require_admin();
  if p_role is null or p_role not in ('admin', 'support', 'verification') then
    raise exception 'Accès invalide : admin, support ou vérification.' using errcode = '22023';
  end if;
  v_current := app.staff_target(p_user_id);
  if v_current = p_role then
    raise exception 'Ce membre a déjà cet accès.' using errcode = '22023';
  end if;
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', p_role::text)
  where id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;
  perform app.audit('equipe.acces', 'compte', p_user_id,
    jsonb_build_object('role', p_role, 'ancien_role', v_current));
end;
$function$;

-- Invitation : trois accès.
CREATE OR REPLACE FUNCTION public.admin_record_staff_invite(p_user_id uuid, p_role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform app.require_admin();
  if p_role is null or p_role not in ('admin', 'support', 'verification') then
    raise exception 'Rôle invalide : admin, support ou vérification.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.raw_app_meta_data ->> 'role' = p_role::text
  ) then
    raise exception 'Compte invité introuvable.' using errcode = '22023';
  end if;
  perform app.audit('equipe.invitation', 'compte', p_user_id, jsonb_build_object('role', p_role));
end;
$function$;

-- Filtre « Équipe » des comptes : trois accès.
CREATE OR REPLACE FUNCTION app.admin_role_matches(p_filter text, p_role text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case coalesce(p_filter, 'tous')
    when 'particuliers' then p_role = 'particulier'
    when 'artisans' then p_role in ('artisan', 'artisan_en_attente')
    when 'equipe' then p_role in ('admin', 'support', 'verification')
    else true
  end
$function$;

-- Les comptes de l'équipe restent hors des actions sur les comptes.
CREATE OR REPLACE FUNCTION app.admin_account_target(p_user_id uuid)
 RETURNS app_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if v_role in ('admin', 'support', 'verification') or p_user_id = auth.uid() then
    raise exception 'Les comptes de l''équipe MENAO ne se gèrent pas ici.' using errcode = '22023';
  end if;
  return v_role;
end;
$function$;
