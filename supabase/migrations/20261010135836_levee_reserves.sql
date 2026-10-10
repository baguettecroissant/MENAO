-- F-26 (phase 5b) — levée des réserves : l'artisan signale qu'il a levé les réserves du PV, le
-- client confirme la levée (« Le chantier est-il parfait ? ») et le chantier est réceptionné ; le
-- solde est demandé ensuite (5c, ADR 0011 et 0027). Sans confirmation : relance du client à J+7
-- après le signalement, puis ticket pour l'équipe MENAO à J+30. ADR 0028.

-- ---------------------------------------------------------------------------
-- Suivi de la levée sur le PV
-- ---------------------------------------------------------------------------
alter table public.receptions
  add column lift_signaled_at timestamptz,
  add column lift_message text check (char_length(lift_message) <= 1000),
  add column lift_reminded_at timestamptz,
  add column lift_escalated_at timestamptz,
  add column lifted_at timestamptz,
  add constraint receptions_levee_avec_reserves check (
    with_reserves or (lift_signaled_at is null and lifted_at is null)
  );

-- F-26 : « Signaler la levée des réserves » (artisan). Nouveau signalement possible (reprise
-- complétée) : la relance et l'escalade repartent de cette date.
create function public.artisan_signal_reserves_lifted(p_chantier_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_message text := nullif(btrim(p_message), '');
begin
  select * into c from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status <> 'reserves_a_lever' then
    raise exception 'Aucune réserve à lever sur ce chantier' using errcode = '22023';
  end if;
  if char_length(v_message) > 1000 then
    raise exception 'Votre message dépasse 1 000 caractères' using errcode = '22023';
  end if;
  update public.receptions set lift_signaled_at = now(), lift_message = v_message,
    lift_reminded_at = null, lift_escalated_at = null
  where chantier_id = c.id;
  perform app.notify(c.particulier_id, 'levee_signalee', jsonb_build_object(
    'chantier_id', c.id,
    'titre', c.title,
    'artisan', app.artisan_display_name(c.artisan_id),
    'message', v_message
  ));
end;
$$;
revoke execute on function public.artisan_signal_reserves_lifted(uuid, text) from public, anon;
grant execute on function public.artisan_signal_reserves_lifted(uuid, text) to authenticated;

-- F-26 : « Confirmer la levée des réserves » (client) : réserves levées, chantier réceptionné.
-- Possible même si l'artisan n'a rien signalé (le client constate la reprise).
create function public.particulier_confirm_reserves_lifted(p_chantier_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  select * into c from public.chantiers
  where id = p_chantier_id and particulier_id = auth.uid()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if c.status <> 'reserves_a_lever' then
    raise exception 'Aucune réserve à lever sur ce chantier' using errcode = '22023';
  end if;
  update public.receptions set lifted_at = now() where chantier_id = c.id;
  perform public.transition_chantier(c.id, 'reserves_levees', jsonb_build_object(
    'signalee_le', (select lift_signaled_at from public.receptions where chantier_id = c.id)
  ));
end;
$$;
revoke execute on function public.particulier_confirm_reserves_lifted(uuid) from public, anon;
grant execute on function public.particulier_confirm_reserves_lifted(uuid) to authenticated;

-- Relance du client à J+7 après le signalement, puis ticket pour l'équipe à J+30 (une fois chacun).
-- p_now : instant de référence (tests). Tâche pg_cron quotidienne.
create function app.remind_reserves_lifting(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select rc.id, rc.lift_signaled_at, rc.lift_reminded_at, rc.lift_escalated_at, c.id as chantier_id,
      c.title, c.project_id, c.particulier_id, c.artisan_id, u.email
    from public.receptions rc
    join public.chantiers c on c.id = rc.chantier_id
    join auth.users u on u.id = c.particulier_id
    where c.status = 'reserves_a_lever'
      and rc.lift_signaled_at is not null
      and ((rc.lift_reminded_at is null and rc.lift_signaled_at <= p_now - interval '7 days')
           or (rc.lift_escalated_at is null and rc.lift_signaled_at <= p_now - interval '30 days'))
    for update of rc skip locked
  loop
    if r.lift_reminded_at is null and r.lift_signaled_at <= p_now - interval '7 days' then
      perform app.notify(r.particulier_id, 'levee_relance', jsonb_build_object(
        'chantier_id', r.chantier_id,
        'titre', r.title,
        'artisan', app.artisan_display_name(r.artisan_id)
      ));
      update public.receptions set lift_reminded_at = p_now where id = r.id;
      v_count := v_count + 1;
    end if;
    if r.lift_escalated_at is null and r.lift_signaled_at <= p_now - interval '30 days' then
      insert into public.tickets (type, user_id, project_id, contact_email, subject, message)
      values ('reserves', r.particulier_id, r.project_id, lower(r.email),
        left('Levée des réserves non confirmée : ' || r.title, 150),
        'Levée des réserves signalée par l''artisan il y a plus de 30 jours, sans confirmation du client.');
      update public.receptions set lift_escalated_at = p_now where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_reserves_lifting(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relance-levee-reserves', '0 8 * * *', 'select app.remind_reserves_lifting()');

-- ---------------------------------------------------------------------------
-- Notifications (F-41) : levée confirmée, à l'artisan.
-- ---------------------------------------------------------------------------
create or replace function app.notify_chantier_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
begin
  if new.event in ('rdv_fixe', 'devis_envoye')
     or (new.event = 'annulation' and new.details ->> 'par' = 'artisan') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'rdv_fixe' then 'rdv_fixe'::public.notification_type
        when 'devis_envoye' then 'devis_recu'::public.notification_type
        else 'chantier_annule'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'rendez_vous', new.details ->> 'rendez_vous',
        'motif', new.details ->> 'motif',
        'quote_id', new.details ->> 'quote_id',
        'numero', new.details ->> 'numero',
        'montant_ttc', new.details -> 'montant_ttc'
      ));
  elsif new.event in ('devis_refuse', 'revision_demandee', 'devis_signe') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'devis_refuse' then 'devis_refuse'::public.notification_type
        when 'devis_signe' then 'devis_signe'::public.notification_type
        else 'devis_modification'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'motif', new.details ->> 'motif',
        'message', new.details ->> 'message',
        'montant_ttc', new.details -> 'montant_ttc'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'acompte_paye' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'artisan',
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name,
      'montant', new.details -> 'montant'
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
    perform app.notify(c.particulier_id, 'acompte_paye'::public.notification_type, jsonb_build_object(
      'destinataire', 'client',
      'chantier_id', c.id,
      'titre', c.title,
      'artisan', app.artisan_display_name(c.artisan_id),
      'montant', new.details -> 'montant'
    ));
  elsif new.event in ('pv_sans_reserves', 'pv_avec_reserves') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id,
      case new.event
        when 'pv_sans_reserves' then 'pv_signe'::public.notification_type
        else 'reserves_emises'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'client', cp.first_name,
        'numero', new.details ->> 'numero',
        'reserves', new.details ->> 'reserves'
      ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event = 'reserves_levees' then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(a.user_id, 'levee_confirmee'::public.notification_type, jsonb_build_object(
      'chantier_id', c.id,
      'titre', c.title,
      'client', cp.first_name
    ))
    from public.artisans a
    left join public.profiles cp on cp.user_id = c.particulier_id
    where a.id = c.artisan_id;
  elsif new.event in ('date_confirmee', 'fin_declaree') then
    select * into c from public.chantiers where id = new.chantier_id;
    perform app.notify(c.particulier_id,
      case new.event
        when 'date_confirmee' then 'chantier_planifie'::public.notification_type
        else 'travaux_termines'::public.notification_type
      end,
      jsonb_build_object(
        'chantier_id', c.id,
        'titre', c.title,
        'artisan', app.artisan_display_name(c.artisan_id),
        'demarrage', new.details ->> 'demarrage',
        'photos', new.details -> 'photos'
      ));
  end if;
  return new;
end;
$$;
