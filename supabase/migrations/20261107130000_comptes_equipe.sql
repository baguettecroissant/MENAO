-- Comptes d'équipe (F-89, ADR 0240), PR 1 : fondations et invitations. Le patron (titulaire de la
-- fiche artisan) invite ses salariés par e-mail, avec un rôle (chef d'équipe ou ouvrier), dans la
-- limite des comptes de sa formule (`plans.limites.comptes` : 1, 3 et 10, patron compris). Un membre
-- actif est reconnu par app.my_artisan_id() : il travaille sur les données de l'entreprise (les
-- droits propres à chaque rôle arrivent avec la PR 2). Une personne appartient à une seule
-- entreprise. Formule réduite : les derniers invités sont suspendus, jamais supprimés, jusqu'au choix
-- du patron ; ils reviennent, dans l'ordre d'invitation, quand des places se libèrent.
-- Le compte du membre porte le rôle 'artisan' (app_metadata, règle 7), posé par l'Edge Function
-- team-members ; il redevient 'particulier' à son retrait.
-- TODO(legal) : information des salariés (RGPD), acceptation des CGU par les membres, responsabilité
-- de l'entreprise pour les actions de ses membres.

create type public.team_role as enum ('chef', 'ouvrier');

create table public.artisan_members (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  -- Une seule entreprise par personne.
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role public.team_role not null,
  invited_by uuid references auth.users (id) on delete set null,
  -- 'places' : formule réduite (retour automatique quand une place se libère) ; 'patron' : son choix.
  suspended_reason text check (suspended_reason in ('places', 'patron')),
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((suspended_at is null) = (suspended_reason is null))
);
create index artisan_members_artisan_idx on public.artisan_members (artisan_id, created_at);
create trigger artisan_members_set_updated_at before update on public.artisan_members
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Qui est l'artisan ? Le titulaire de la fiche (le patron), ou un membre actif de son équipe.
-- ---------------------------------------------------------------------------
create function app.artisan_id_of(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.id from public.artisans a where a.user_id = p_user_id),
    (select m.artisan_id from public.artisan_members m
     where m.user_id = p_user_id and m.suspended_at is null)
  )
$$;
revoke execute on function app.artisan_id_of(uuid) from public, anon, authenticated;

-- Désormais security definer : la politique de lecture des fiches par les membres s'en sert, sans
-- boucle sur les règles d'accès de la table.
create or replace function app.my_artisan_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select app.artisan_id_of((select auth.uid()))
$$;

-- Fiche dont l'utilisateur est le titulaire : actions réservées au patron.
create function app.my_owned_artisan_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.artisans a where a.user_id = (select auth.uid())
$$;
revoke execute on function app.my_owned_artisan_id() from public, anon;
grant execute on function app.my_owned_artisan_id() to authenticated;

-- Rôle dans l'entreprise : 'patron', 'chef' ou 'ouvrier' (membre actif), sinon null.
create function app.my_team_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.artisans a where a.user_id = (select auth.uid())) then 'patron'
    else (select m.role::text from public.artisan_members m
          where m.user_id = (select auth.uid()) and m.suspended_at is null)
  end
$$;
revoke execute on function app.my_team_role() from public, anon;
grant execute on function app.my_team_role() to authenticated;

alter table public.artisan_members enable row level security;
revoke all on public.artisan_members from anon, authenticated;
grant select on public.artisan_members to authenticated;
-- Écritures par les seules fonctions ci-dessous.
create policy "artisan_members : lecture par le patron, le membre ou l'équipe MENAO"
  on public.artisan_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or artisan_id = (select app.my_owned_artisan_id())
    or (select app.is_staff())
  );

-- Les membres actifs lisent la fiche de leur entreprise ; seul le patron la modifie (politique de
-- modification inchangée, sur le titulaire).
create policy "artisans : lecture par les membres de l'entreprise"
  on public.artisans for select to authenticated
  using (id = (select app.my_artisan_id()));

-- ---------------------------------------------------------------------------
-- Contexte de l'espace pro : fiche, rôle, accès suspendu, nom de l'entreprise.
-- ---------------------------------------------------------------------------
create function public.my_team_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('artisan_id', a.id, 'role', 'patron', 'suspendu', false,
       'entreprise', coalesce(a.nom_commercial, a.raison_sociale))
     from public.artisans a where a.user_id = (select auth.uid())),
    (select jsonb_build_object(
       'artisan_id', case when m.suspended_at is null then m.artisan_id end,
       'role', m.role, 'suspendu', m.suspended_at is not null,
       'entreprise', coalesce(a.nom_commercial, a.raison_sociale))
     from public.artisan_members m
     join public.artisans a on a.id = m.artisan_id
     where m.user_id = (select auth.uid()))
  )
$$;
revoke execute on function public.my_team_context() from public, anon;
grant execute on function public.my_team_context() to authenticated;

-- ---------------------------------------------------------------------------
-- Places de la formule (patron compris) : 1 sans abonnement actif.
-- ---------------------------------------------------------------------------
create function app.artisan_seats(p_artisan_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(coalesce(
    (select (p.limites ->> 'comptes')::int
     from public.subscriptions s
     join public.plans p on p.code = s.plan_code
     where s.artisan_id = p_artisan_id and app.artisan_subscription_active(p_artisan_id)),
    1), 1)
$$;
revoke execute on function app.artisan_seats(uuid) from public, anon, authenticated;

-- Membres ramenés aux places : les derniers invités au-delà sont suspendus ('places'), ceux
-- suspendus faute de place reviennent dans l'ordre d'invitation. Renvoie le nombre de changements.
create function app.sync_team_seats(p_artisan_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free int;
  v_changes int := 0;
begin
  v_free := app.artisan_seats(p_artisan_id) - 1 - (
    select count(*)::int from public.artisan_members
    where artisan_id = p_artisan_id and suspended_at is null
  );
  if v_free < 0 then
    update public.artisan_members set suspended_at = now(), suspended_reason = 'places'
    where id in (
      select id from public.artisan_members
      where artisan_id = p_artisan_id and suspended_at is null
      order by created_at desc, id desc
      limit -v_free
    );
    get diagnostics v_changes = row_count;
  elsif v_free > 0 then
    update public.artisan_members set suspended_at = null, suspended_reason = null
    where id in (
      select id from public.artisan_members
      where artisan_id = p_artisan_id and suspended_reason = 'places'
      order by created_at, id
      limit v_free
    );
    get diagnostics v_changes = row_count;
  end if;
  return v_changes;
end;
$$;
revoke execute on function app.sync_team_seats(uuid) from public, anon, authenticated;

-- Tâche quotidienne (fin de période de grâce d'un impayé, par exemple).
create function app.sync_all_team_seats()
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(app.sync_team_seats(x.artisan_id)), 0)::int
  from (select distinct artisan_id from public.artisan_members) x
$$;
revoke execute on function app.sync_all_team_seats() from public, anon, authenticated;
select cron.schedule('menao-places-equipe', '15 4 * * *', 'select app.sync_all_team_seats()');

-- Changement de formule ou d'état de l'abonnement : places revues aussitôt.
create function app.after_subscription_sync_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.sync_team_seats(new.artisan_id);
  return null;
end;
$$;
revoke execute on function app.after_subscription_sync_team() from public, anon, authenticated;
create trigger subscriptions_sync_team after insert or update of status, plan_code, past_due_since
  on public.subscriptions for each row execute function app.after_subscription_sync_team();

-- Membre retiré (ou entreprise supprimée) : le compte redevient particulier, ses sessions sont
-- fermées.
create function app.after_team_member_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "particulier"}'::jsonb
  where id = old.user_id
    and raw_app_meta_data ->> 'role' = 'artisan'
    and not exists (select 1 from public.artisans a where a.user_id = old.user_id);
  delete from auth.sessions where user_id = old.user_id;
  return null;
end;
$$;
revoke execute on function app.after_team_member_delete() from public, anon, authenticated;
create trigger artisan_members_after_delete after delete on public.artisan_members
  for each row execute function app.after_team_member_delete();

-- ---------------------------------------------------------------------------
-- « Mon équipe » (patron) : places, membres, état de chacun.
-- ---------------------------------------------------------------------------
create function public.my_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé au patron de l''entreprise.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'entreprise', (select coalesce(a.nom_commercial, a.raison_sociale)
                   from public.artisans a where a.id = v_artisan),
    'formule', (select s.plan_code from public.subscriptions s
                where s.artisan_id = v_artisan and app.artisan_subscription_active(v_artisan)),
    'places', app.artisan_seats(v_artisan),
    'utilisees', 1 + (select count(*)::int from public.artisan_members m
                      where m.artisan_id = v_artisan and m.suspended_at is null),
    'membres', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'prenom', p.first_name,
        'nom', p.last_name,
        'email', u.email,
        'role', m.role,
        'depuis', m.created_at,
        'en_attente', u.last_sign_in_at is null,
        'suspension', m.suspended_reason
      ) order by m.created_at, m.id)
      from public.artisan_members m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.user_id = m.user_id
      where m.artisan_id = v_artisan
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.my_team() from public, anon;
grant execute on function public.my_team() to authenticated;

-- Invitation enregistrée au nom du patron par l'Edge Function team-members, après création du
-- compte (rôle 'artisan', jamais connecté) : entreprise validée, place libre, une seule entreprise.
create function public.artisan_record_team_invite(p_user_id uuid, p_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
begin
  if v_artisan is null
     or not exists (select 1 from public.artisans where id = v_artisan and status = 'valide') then
    raise exception 'Réservé au patron d''une entreprise validée.' using errcode = '42501';
  end if;
  if p_role is null then
    raise exception 'Rôle invalide : chef d''équipe ou ouvrier.' using errcode = '22023';
  end if;
  -- Deux invitations simultanées ne dépassent pas les places.
  perform 1 from public.artisans where id = v_artisan for update;
  if 1 + (select count(*) from public.artisan_members
          where artisan_id = v_artisan and suspended_at is null) >= app.artisan_seats(v_artisan) then
    raise exception 'Toutes les places de votre formule sont prises.' using errcode = '22023';
  end if;
  if not exists (
       select 1 from auth.users u
       where u.id = p_user_id and u.raw_app_meta_data ->> 'role' = 'artisan'
         and u.last_sign_in_at is null
     )
     or exists (select 1 from public.artisans a where a.user_id = p_user_id)
     or exists (select 1 from public.artisan_members m where m.user_id = p_user_id) then
    raise exception 'Compte invité introuvable.' using errcode = '22023';
  end if;
  insert into public.artisan_members (artisan_id, user_id, role, invited_by)
  values (v_artisan, p_user_id, p_role, (select auth.uid()));
  perform app.audit('equipe_artisan.invitation', 'compte', p_user_id,
    jsonb_build_object('artisan_id', v_artisan, 'role', p_role));
end;
$$;
revoke execute on function public.artisan_record_team_invite(uuid, public.team_role) from public, anon;
grant execute on function public.artisan_record_team_invite(uuid, public.team_role) to authenticated;

-- Retrait d'un membre par le patron ; « en_attente » : jamais connecté, l'Edge Function supprime
-- alors le compte (l'invitation ne sert plus).
create function public.remove_team_member(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
  v_pending boolean;
begin
  if v_artisan is null then
    raise exception 'Réservé au patron de l''entreprise.' using errcode = '42501';
  end if;
  select u.last_sign_in_at is null into v_pending
  from public.artisan_members m
  join auth.users u on u.id = m.user_id
  where m.artisan_id = v_artisan and m.user_id = p_user_id;
  if not found then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;
  delete from public.artisan_members where artisan_id = v_artisan and user_id = p_user_id;
  perform app.sync_team_seats(v_artisan);
  perform app.audit('equipe_artisan.retrait', 'compte', p_user_id,
    jsonb_build_object('artisan_id', v_artisan));
  return jsonb_build_object('en_attente', v_pending);
end;
$$;
revoke execute on function public.remove_team_member(uuid) from public, anon;
grant execute on function public.remove_team_member(uuid) to authenticated;

-- Rôle d'un membre (chef d'équipe ou ouvrier).
create function public.set_team_member_role(p_user_id uuid, p_role public.team_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé au patron de l''entreprise.' using errcode = '42501';
  end if;
  if p_role is null then
    raise exception 'Rôle invalide : chef d''équipe ou ouvrier.' using errcode = '22023';
  end if;
  update public.artisan_members set role = p_role
  where artisan_id = v_artisan and user_id = p_user_id;
  if not found then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;
  perform app.audit('equipe_artisan.role', 'compte', p_user_id,
    jsonb_build_object('artisan_id', v_artisan, 'role', p_role));
end;
$$;
revoke execute on function public.set_team_member_role(uuid, public.team_role) from public, anon;
grant execute on function public.set_team_member_role(uuid, public.team_role) to authenticated;

-- Choix du patron : suspendre un membre (sans le supprimer) ou le réactiver s'il reste une place.
create function public.set_team_member_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_owned_artisan_id();
  m public.artisan_members;
begin
  if v_artisan is null then
    raise exception 'Réservé au patron de l''entreprise.' using errcode = '42501';
  end if;
  perform 1 from public.artisans where id = v_artisan for update;
  select * into m from public.artisan_members where artisan_id = v_artisan and user_id = p_user_id;
  if m.id is null then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;
  if coalesce(p_active, false) then
    if m.suspended_at is null then
      return;
    end if;
    if 1 + (select count(*) from public.artisan_members
            where artisan_id = v_artisan and suspended_at is null) >= app.artisan_seats(v_artisan) then
      raise exception 'Toutes les places de votre formule sont prises.' using errcode = '22023';
    end if;
    update public.artisan_members set suspended_at = null, suspended_reason = null where id = m.id;
  else
    update public.artisan_members
    set suspended_at = coalesce(suspended_at, now()), suspended_reason = 'patron'
    where id = m.id;
    delete from auth.sessions where user_id = p_user_id;
  end if;
  perform app.audit(case when coalesce(p_active, false) then 'equipe_artisan.reactivation'
    else 'equipe_artisan.suspension' end, 'compte', p_user_id,
    jsonb_build_object('artisan_id', v_artisan));
end;
$$;
revoke execute on function public.set_team_member_active(uuid, boolean) from public, anon;
grant execute on function public.set_team_member_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Photos du journal et pièces jointes des messages (Edge Function process-upload) : le patron ou un
-- membre actif de l'entreprise du chantier.
-- ---------------------------------------------------------------------------
create or replace function public.record_chantier_photo(p_chantier_id uuid, p_user_id uuid, p_storage_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.chantier_status;
begin
  select c.status into v_status
  from public.chantiers c
  where c.id = p_chantier_id and c.artisan_id = app.artisan_id_of(p_user_id)
  for update of c;
  if not found then
    return 'forbidden';
  end if;
  if not app.chantier_journal_open(v_status) then
    return 'locked';
  end if;
  if (select count(*) from public.chantier_updates
      where chantier_id = p_chantier_id and kind = 'photo') >= 100 then
    return 'limit';
  end if;
  insert into public.chantier_updates (chantier_id, author_id, kind, storage_path)
  values (p_chantier_id, p_user_id, 'photo', p_storage_path);
  return 'ok';
end;
$$;

create or replace function public.record_message_attachment(
  p_chantier_id uuid,
  p_user_id uuid,
  p_kind public.message_kind,
  p_storage_path text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if p_kind not in ('photo', 'fichier') then
    return 'invalid';
  end if;
  select ch.* into c from public.chantiers ch
  where ch.id = p_chantier_id
    and (ch.particulier_id = p_user_id or ch.artisan_id = app.artisan_id_of(p_user_id));
  if not found then
    return 'forbidden';
  end if;
  if app.conversation_closed(c.status) then
    return 'locked';
  end if;
  if (select count(*) from public.messages
      where chantier_id = c.id and kind in ('photo', 'fichier')) >= 200 then
    return 'limit';
  end if;
  insert into public.messages (chantier_id, author_id, kind, storage_path)
  values (c.id, p_user_id, p_kind, p_storage_path);
  return 'ok';
end;
$$;
