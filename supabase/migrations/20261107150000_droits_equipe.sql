-- Comptes d'équipe, PR 2A (F-89, ADR 0241) : droits propres à chaque rôle.
-- - Patron (titulaire de la fiche) : tout.
-- - Chef d'équipe : tous les chantiers, demandes, devis, factures, paiements, dépenses, agenda,
--   secrétaire ; ni abonnement, ni recharges, ni export comptable, ni vitrine, dossier ou équipe.
-- - Ouvrier : seulement les chantiers qui lui sont attribués (journal, photos, messages, rendez-vous),
--   aucun montant nulle part, aucune demande.
-- Les règles d'accès des tables et les fonctions reposaient sur app.my_artisan_id() (patron ou membre
-- actif, ADR 0240) ; elles passent selon le cas par :
-- - app.my_manager_artisan_id() : patron ou chef d'équipe, sinon rien ;
-- - app.my_owned_artisan_id() : le patron seul ;
-- - app.can_see_chantier() : patron et chef, ou ouvrier attribué au chantier.

-- ---------------------------------------------------------------------------
-- Rôles
-- ---------------------------------------------------------------------------
-- Rôle d'un compte dans son entreprise : 'patron', 'chef' ou 'ouvrier' (membre actif), sinon null.
create function app.team_role_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.artisans a where a.user_id = p_user_id) then 'patron'
    else (select m.role::text from public.artisan_members m
          where m.user_id = p_user_id and m.suspended_at is null)
  end
$$;
revoke execute on function app.team_role_of(uuid) from public, anon, authenticated;

create or replace function app.my_team_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select app.team_role_of((select auth.uid()))
$$;

-- Fiche de l'entreprise pour le patron ou le chef d'équipe ; rien pour un ouvrier.
create function app.my_manager_artisan_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when app.team_role_of((select auth.uid())) in ('patron', 'chef')
    then app.artisan_id_of((select auth.uid())) end
$$;
revoke execute on function app.my_manager_artisan_id() from public, anon;
grant execute on function app.my_manager_artisan_id() to authenticated;

-- Comme app.my_pro_artisan_id() (espace pro ouvert), pour le patron ou le chef d'équipe.
create function app.my_manager_pro_artisan_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.artisans a
  where a.id = app.my_manager_artisan_id() and a.status in ('valide', 'suspendu', 'radie')
$$;
revoke execute on function app.my_manager_pro_artisan_id() from public, anon;
grant execute on function app.my_manager_pro_artisan_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Attribution des chantiers
-- ---------------------------------------------------------------------------
-- Membres de l'équipe qui travaillent sur un chantier (plusieurs possibles). Retiré de l'équipe :
-- attributions supprimées ; suspendu : gardées, sans accès tant que la suspension dure.
create table public.chantier_assignments (
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  user_id uuid not null references public.artisan_members (user_id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (chantier_id, user_id)
);
create index chantier_assignments_user_idx on public.chantier_assignments (user_id);

-- Un compte voit-il ce chantier ? Patron ou chef de l'entreprise, ou ouvrier attribué.
create function app.user_can_see_chantier(p_user_id uuid, p_chantier_id uuid, p_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_user_id is not null and p_artisan_id is not null
    and p_artisan_id = app.artisan_id_of(p_user_id)
    and (
      app.team_role_of(p_user_id) in ('patron', 'chef')
      or exists (select 1 from public.chantier_assignments ca
                 where ca.chantier_id = p_chantier_id and ca.user_id = p_user_id)
    ),
    false)
$$;
revoke execute on function app.user_can_see_chantier(uuid, uuid, uuid) from public, anon, authenticated;

create function app.can_see_chantier(p_chantier_id uuid, p_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.user_can_see_chantier((select auth.uid()), p_chantier_id, p_artisan_id)
$$;
revoke execute on function app.can_see_chantier(uuid, uuid) from public, anon;
grant execute on function app.can_see_chantier(uuid, uuid) to authenticated;

alter table public.chantier_assignments enable row level security;
revoke all on public.chantier_assignments from anon, authenticated;
grant select on public.chantier_assignments to authenticated;
-- Écritures par set_chantier_team seulement.
create policy "chantier_assignments : lecture par l'encadrement, l'intéressé ou l'équipe MENAO"
  on public.chantier_assignments for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.chantiers c
               where c.id = chantier_assignments.chantier_id
                 and c.artisan_id = (select app.my_manager_artisan_id()))
    or (select app.is_staff())
  );

-- Équipe d'un chantier pour le patron ou le chef : membres actifs, attribués ou non.
create function public.chantier_team(p_chantier_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
begin
  if v_artisan is null or not exists (
    select 1 from public.chantiers c where c.id = p_chantier_id and c.artisan_id = v_artisan
  ) then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', m.user_id,
      'prenom', p.first_name,
      'nom', p.last_name,
      'role', m.role,
      'affecte', exists (select 1 from public.chantier_assignments ca
                         where ca.chantier_id = p_chantier_id and ca.user_id = m.user_id)
    ) order by m.created_at, m.id)
    from public.artisan_members m
    left join public.profiles p on p.user_id = m.user_id
    where m.artisan_id = v_artisan and m.suspended_at is null
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.chantier_team(uuid) from public, anon;
grant execute on function public.chantier_team(uuid) to authenticated;

-- Le patron ou le chef choisit qui travaille sur un chantier (liste complète des membres actifs
-- attribués ; les membres suspendus gardent leur attribution).
create function public.set_chantier_team(p_chantier_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_manager_artisan_id();
  v_ids uuid[] := array(select distinct u from unnest(coalesce(p_user_ids, '{}'::uuid[])) u where u is not null);
begin
  if v_artisan is null or not exists (
    select 1 from public.chantiers c where c.id = p_chantier_id and c.artisan_id = v_artisan
  ) then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(v_ids) u
    where not exists (select 1 from public.artisan_members m
                      where m.user_id = u and m.artisan_id = v_artisan and m.suspended_at is null)
  ) then
    raise exception 'Membre de l''équipe introuvable.' using errcode = '22023';
  end if;
  delete from public.chantier_assignments ca
  where ca.chantier_id = p_chantier_id
    and ca.user_id <> all (v_ids)
    and exists (select 1 from public.artisan_members m
                where m.user_id = ca.user_id and m.suspended_at is null);
  insert into public.chantier_assignments (chantier_id, user_id, assigned_by)
  select p_chantier_id, u, (select auth.uid()) from unnest(v_ids) u
  on conflict do nothing;
  perform app.audit('equipe_artisan.chantier', 'chantier', p_chantier_id,
    jsonb_build_object('membres', to_jsonb(v_ids)));
end;
$$;
revoke execute on function public.set_chantier_team(uuid, uuid[]) from public, anon;
grant execute on function public.set_chantier_team(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Règles d'accès des tables et des fichiers
-- ---------------------------------------------------------------------------
-- Restent ouvertes à toute l'équipe (rien d'argent) : horaires, absences, créneaux bloqués, métiers,
-- zones, réalisations, certifications et RGE (lecture), badges, score, abonnement (formule et
-- statut), minutes de la secrétaire, logos ; photos et pièces jointes des chantiers suivent
-- app.can_read_chantier_folder (ci-dessous).

-- Patron et chef d'équipe : argent, demandes, réception, avis, secrétaire, agenda partagé (lien
-- d'abonnement), justificatifs de dépenses.
alter policy "créneaux proposés : lecture par l'artisan ou le client" on public.appointment_proposals
  using (((artisan_id = (select app.my_manager_artisan_id())) OR (particulier_id = ( SELECT auth.uid() AS uid))));
alter policy "artisan_calendar_feeds : lecture par l'artisan" on public.artisan_calendar_feeds
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "client_ratings : lecture par l'artisan auteur, ou par l'équipe" on public.client_ratings
  using (((artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "client_reminder_settings : lecture par l'artisan" on public.client_reminder_settings
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "expense_lines : lecture par l'artisan" on public.expense_lines
  using ((EXISTS ( SELECT 1 FROM public.expenses e WHERE ((e.id = expense_lines.expense_id) AND (e.artisan_id = (select app.my_manager_artisan_id()))))));
alter policy "expenses : lecture par l'artisan" on public.expenses
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "invoices : lecture par les parties du chantier ou l'équipe" on public.invoices
  using (((artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = invoices.chantier_id) AND (c.particulier_id = ( SELECT auth.uid() AS uid)))))));
alter policy "partner_recommendations : lecture par le particulier, l'artisan" on public.partner_recommendations
  using (((from_artisan_id = app.my_manager_artisan_id()) OR (EXISTS ( SELECT 1 FROM public.projects p WHERE ((p.id = partner_recommendations.project_id) AND (p.user_id = auth.uid())))) OR app.is_staff()));
alter policy "payment_reminder_settings : lecture par l'artisan" on public.payment_reminder_settings
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "payment_reminders : lecture par l'artisan" on public.payment_reminders
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "payments : lecture par les parties du chantier ou l'équipe" on public.payments
  using (((artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = payments.chantier_id) AND (c.particulier_id = ( SELECT auth.uid() AS uid)))))));
alter policy "quote_dictations : lecture par l'artisan" on public.quote_dictations
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "quotes : lecture par l'artisan, le particulier (hors brouillon)" on public.quotes
  using (((artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff) OR ((status <> 'brouillon'::public.quote_status) AND (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = quotes.chantier_id) AND (c.particulier_id = ( SELECT auth.uid() AS uid))))))));
alter policy "receptions : lecture par les parties du chantier ou l'équipe" on public.receptions
  using (((artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = receptions.chantier_id) AND (c.particulier_id = ( SELECT auth.uid() AS uid)))))));
alter policy "requests : lecture par le particulier, l'artisan ou l'équipe" on public.requests
  using (((particulier_id = ( SELECT auth.uid() AS uid)) OR ((artisan_id = (select app.my_manager_artisan_id())) AND (status <> 'a_verifier'::public.request_status)) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "reviews : lecture par l'auteur, l'artisan noté ou l'équipe" on public.reviews
  using (((particulier_id = ( SELECT auth.uid() AS uid)) OR (artisan_id = (select app.my_manager_artisan_id())) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "secretary_messages : lecture par l'artisan" on public.secretary_messages
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "secretary_settings : lecture par l'artisan" on public.secretary_settings
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "signature_requests : lecture par les parties du chantier ou l'" on public.signature_requests
  using ((( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM (quotes q JOIN public.chantiers c ON ((c.id = q.chantier_id))) WHERE ((q.id = signature_requests.quote_id) AND ((c.particulier_id = ( SELECT auth.uid() AS uid)) OR (q.artisan_id = (select app.my_manager_artisan_id())))))) OR (EXISTS ( SELECT 1 FROM (receptions r JOIN public.chantiers c ON ((c.id = r.chantier_id))) WHERE ((r.id = signature_requests.reception_id) AND ((c.particulier_id = ( SELECT auth.uid() AS uid)) OR (r.artisan_id = (select app.my_manager_artisan_id()))))))));
alter policy "voice_quote_drafts : lecture par l'artisan" on public.voice_quote_drafts
  using ((artisan_id = (select app.my_manager_artisan_id())));
alter policy "expense-documents : lecture par l'artisan" on storage.objects
  using (((bucket_id = 'expense-documents'::text) AND ((storage.foldername(name))[1] = ((select app.my_manager_artisan_id()))::text)));
alter policy "expense-documents : suppression par l'artisan" on storage.objects
  using (((bucket_id = 'expense-documents'::text) AND ((storage.foldername(name))[1] = ((select app.my_manager_artisan_id()))::text)));

-- Patron seul : export comptable, dossier, mois offerts, parrainage, cadeau, récompenses, recharges
-- de la secrétaire, retours de MENAO ; suppression des réalisations, certifications et logos.
alter policy "accountant_exports : lecture par l'artisan" on public.accountant_exports
  using ((artisan_id = (select app.my_owned_artisan_id())));
alter policy "accountant_settings : lecture par l'artisan" on public.accountant_settings
  using ((artisan_id = (select app.my_owned_artisan_id())));
alter policy "artisan_documents : lecture par le propriétaire ou un admin" on public.artisan_documents
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_admin() AS is_admin)));
alter policy "artisan_free_months : lecture par l'artisan ou un admin" on public.artisan_free_months
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_admin() AS is_admin)));
alter policy "artisan_photos : suppression des siennes" on public.artisan_photos
  using ((artisan_id = (select app.my_owned_artisan_id())));
alter policy "artisan_referral_codes : lecture par l'artisan ou un admin" on public.artisan_referral_codes
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_admin() AS is_admin)));
alter policy "artisan_referrals : lecture par le parrain, le filleul ou un ad" on public.artisan_referrals
  using (((referrer_artisan_id = (select app.my_owned_artisan_id())) OR (referred_artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_admin() AS is_admin)));
alter policy "artisan_reviews : lecture par l'artisan concerné ou un admin" on public.artisan_reviews
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_admin() AS is_admin)));
alter policy "artisan_welcome_gifts : lecture par l'artisan ou l'équipe" on public.artisan_welcome_gifts
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "certifications : ajout pour soi" on public.certifications
  with check ((artisan_id = (select app.my_owned_artisan_id())));
alter policy "certifications : suppression des siennes" on public.certifications
  using ((artisan_id = (select app.my_owned_artisan_id())));
alter policy "reward_claims : lecture par l'artisan ou l'équipe" on public.reward_claims
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "voice_credits : lecture par l'artisan ou l'équipe" on public.voice_credits
  using (((artisan_id = (select app.my_owned_artisan_id())) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "artisan-documents : lecture par le propriétaire ou un admin" on storage.objects
  using (((bucket_id = 'artisan-documents'::text) AND (((storage.foldername(name))[1] = ((select app.my_owned_artisan_id()))::text) OR ( SELECT app.is_admin() AS is_admin))));
alter policy "artisan-logos : suppression de ses logos inutilisés" on storage.objects
  using (((bucket_id = 'artisan-logos'::text) AND ((storage.foldername(name))[1] = ((select app.my_owned_artisan_id()))::text) AND (NOT app.artisan_logo_in_use(name))));
alter policy "portfolio : suppression de ses photos" on storage.objects
  using (((bucket_id = 'portfolio'::text) AND ((storage.foldername(name))[1] = ((select app.my_owned_artisan_id()))::text)));

-- Chantiers et ce qui en dépend : patron, chef, ou ouvrier attribué.
alter policy "appointments : lecture par l'artisan du chantier" on public.appointments
  using ((EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = appointments.chantier_id) AND ((c.artisan_id = (select app.my_artisan_id())) AND app.can_see_chantier(c.id, c.artisan_id))))));
alter policy "chantier_events : lecture par les parties ou l'équipe" on public.chantier_events
  using ((( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = chantier_events.chantier_id) AND ((c.particulier_id = ( SELECT auth.uid() AS uid)) OR ((c.artisan_id = (select app.my_artisan_id())) AND app.can_see_chantier(c.id, c.artisan_id))))))));
alter policy "chantier_updates : lecture par les parties ou l'équipe" on public.chantier_updates
  using ((( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = chantier_updates.chantier_id) AND ((c.particulier_id = ( SELECT auth.uid() AS uid)) OR ((c.artisan_id = (select app.my_artisan_id())) AND app.can_see_chantier(c.id, c.artisan_id))))))));
alter policy "chantiers : lecture par les parties ou l'équipe" on public.chantiers
  using (((particulier_id = ( SELECT auth.uid() AS uid)) OR ((artisan_id = (select app.my_artisan_id())) AND app.can_see_chantier(id, artisan_id)) OR ( SELECT app.is_staff() AS is_staff)));
alter policy "messages : lecture par les parties du chantier ou l'équipe" on public.messages
  using ((( SELECT app.is_staff() AS is_staff) OR (EXISTS ( SELECT 1 FROM public.chantiers c WHERE ((c.id = messages.chantier_id) AND ((c.particulier_id = ( SELECT auth.uid() AS uid)) OR ((c.artisan_id = (select app.my_artisan_id())) AND app.can_see_chantier(c.id, c.artisan_id))))))));

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Chaque fonction est redéfinie depuis sa définition en vigueur (pg_get_functiondef), avec la seule
-- aide d'accès remplacée ; rien d'autre ne change (droits d'exécution compris). Chantiers : la
-- condition sur l'entreprise reste devant app.can_see_chantier, pour garder l'index. Le test
-- 130_droits_equipe vérifie qu'aucune ne revient à l'ancienne aide seule.
create function app.redefine_team_functions(
  p_names text[], p_schema text, p_pattern text, p_replacement text, p_expected text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_fn record;
  v_def text;
  v_count int := 0;
begin
  for v_fn in
    select p.oid, p.proname from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = p_schema and p.proname = any (p_names)
  loop
    v_def := pg_catalog.regexp_replace(pg_catalog.pg_get_functiondef(v_fn.oid), p_pattern, p_replacement, 'g');
    if pg_catalog.strpos(v_def, p_expected) = 0 then
      raise exception 'Fonction %.% : aide d''accès introuvable', p_schema, v_fn.proname;
    end if;
    execute v_def;
    v_count := v_count + 1;
  end loop;
  if v_count <> pg_catalog.cardinality(p_names) then
    raise exception 'Fonctions attendues : %, trouvées : %', pg_catalog.cardinality(p_names), v_count;
  end if;
end;
$$;
revoke execute on function app.redefine_team_functions(text[], text, text, text, text)
  from public, anon, authenticated;

-- Patron seul : vitrine (métiers, zone, budget, diplôme, décennale, logo, réponses aux avis, badges),
-- parrainage, cadeau, récompenses, recharges de la secrétaire.
select app.redefine_team_functions(array[
    'artisan_claim_reward', 'artisan_mark_badges_seen', 'artisan_remove_logo',
    'artisan_reply_review', 'choose_welcome_gift', 'my_referral', 'my_referrals',
    'my_voice_topups', 'my_welcome_gift', 'set_artisan_budget_minimum', 'set_artisan_diploma',
    'set_artisan_trades', 'set_artisan_zone', 'set_decennale_non_soumis'
  ], 'public', 'app\.my_artisan_id\(\)', 'app.my_owned_artisan_id()', 'app.my_owned_artisan_id()');

-- Patron et chef d'équipe : demandes, devis, factures, relances, réception, décisions sur le
-- chantier, agenda (créneaux, absences, horaires, disponibilité), secrétaire.
select app.redefine_team_functions(array[
    'add_artisan_absence', 'add_artisan_blocked_slot', 'artisan_cancel_chantier',
    'artisan_confirm_planning', 'artisan_confirm_start', 'artisan_declare_finished',
    'artisan_delete_dictation', 'artisan_fix_appointment', 'artisan_inbox',
    'artisan_previous_lines', 'artisan_propose_slots', 'artisan_quotes', 'artisan_rate_client',
    'artisan_report_expertise', 'artisan_report_fake_client',
    'artisan_reschedule_appointment', 'artisan_respond_request', 'artisan_save_dictation',
    'artisan_save_quote_draft', 'artisan_send_payment_reminder', 'artisan_send_quote',
    'artisan_signal_reserves_lifted', 'clear_external_busy', 'client_reputation',
    'delete_artisan_absence', 'delete_artisan_blocked_slot', 'disable_artisan_calendar_feed',
    'invoice_document', 'my_client_reminders', 'my_money_overview', 'quote_document',
    'reception_document', 'renew_artisan_calendar_feed', 'replace_external_busy',
    'save_client_reminder_settings', 'save_secretary_settings', 'secretary_message_done',
    'set_artisan_availability', 'set_artisan_available_from', 'set_artisan_hours',
    'set_artisan_paused', 'set_payment_reminders_auto', 'settle_voice_quote_drafts'
  ], 'public', 'app\.my_artisan_id\(\)', 'app.my_manager_artisan_id()', 'app.my_manager_artisan_id()');

-- Détail d'une demande : patron et chef ; l'ouvrier le lit pour un chantier qui lui est attribué
-- (description, adresse, client), sans le budget annoncé.
select app.redefine_team_functions(array['artisan_request_detail'], 'public',
  '''budget'', p\.budget,', '''budget'', case when r.artisan_id = app.my_manager_artisan_id() then p.budget end,',
  'then p.budget end');
select app.redefine_team_functions(array['artisan_request_detail'], 'public',
  'r\.artisan_id = app\.my_artisan_id\(\)',
  '(r.artisan_id = app.my_manager_artisan_id() or exists (select 1 from public.chantiers ch'
  || ' where ch.request_id = r.id and app.can_see_chantier(ch.id, ch.artisan_id)))',
  'app.can_see_chantier(ch.id');

-- Dépenses : patron et chef d'équipe (l'export comptable reste au patron, app.my_pro_artisan_id).
select app.redefine_team_functions(array[
    'artisan_delete_expense', 'artisan_save_expense', 'artisan_set_expense_paid'
  ], 'public', 'app\.my_pro_artisan_id\(\)', 'app.my_manager_pro_artisan_id()',
  'app.my_manager_pro_artisan_id()');

-- Chantiers : patron, chef, ou ouvrier attribué (journal, messages, rendez-vous, signalements).
select app.redefine_team_functions(array[
    'artisan_add_chantier_message', 'artisan_chantier_detail', 'artisan_chantiers',
    'artisan_save_appointment_notes', 'chantier_appointment', 'chantier_messages',
    'mark_conversation_read', 'my_conversations', 'my_unread_messages', 'report_chantier_problem',
    'report_message', 'send_message'
  ], 'public', '(\m[a-z]+\.)?\martisan_id = app\.my_artisan_id\(\)',
  '(\1artisan_id = app.my_artisan_id() and app.can_see_chantier(\1id, \1artisan_id))', 'app.can_see_chantier(');
select app.redefine_team_functions(array['can_read_chantier_folder'], 'app',
  '(\m[a-z]+\.)?\martisan_id = app\.my_artisan_id\(\)', '(\1artisan_id = app.my_artisan_id() and app.can_see_chantier(\1id, \1artisan_id))',
  'app.can_see_chantier(');

-- Photos du journal et pièces jointes des messages, enregistrées par process-upload au nom du compte.
select app.redefine_team_functions(array[
    'record_chantier_photo', 'record_message_attachment'
  ], 'public', '(\m[a-z]+\.)?\martisan_id = app\.artisan_id_of\(p_user_id\)',
  'app.user_can_see_chantier(p_user_id, \1id, \1artisan_id)', 'app.user_can_see_chantier(');

drop function app.redefine_team_functions(text[], text, text, text, text);
