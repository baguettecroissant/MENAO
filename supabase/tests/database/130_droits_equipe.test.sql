-- Comptes d'équipe, droits par rôle (F-89, ADR 0241) : le chef d'équipe voit tous les chantiers et
-- l'argent, sans les réglages du patron ; l'ouvrier ne voit que les chantiers qui lui sont attribués
-- et aucun montant ; attribution par le patron ou le chef ; aucune fonction redéfinie ne revient à
-- app.my_artisan_id(). Données fictives (c130…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1300000-0000-4000-8000-000000000001', 'droits130.patron@example.test', false, now(), now(), '{"role":"artisan"}', '{}'),
  ('c1300000-0000-4000-8000-000000000002', 'droits130.chef@example.test', false, now(), now(), '{"role":"artisan"}', '{"first_name":"Chef"}'),
  ('c1300000-0000-4000-8000-000000000003', 'droits130.ouvrier@example.test', false, now(), now(), '{"role":"artisan"}', '{"first_name":"Ouvrier"}'),
  ('c1300000-0000-4000-8000-000000000004', 'droits130.second@example.test', false, now(), now(), '{"role":"artisan"}', '{}'),
  ('c1300000-0000-4000-8000-000000000005', 'droits130.client@example.test', false, now(), now(), '{"role":"particulier"}', '{}'),
  ('c1300000-0000-4000-8000-000000000006', 'droits130.autre@example.test', false, now(), now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1301000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000001', 'valide', 'PATRON 130', 'Plomberie 130', 'communes'),
  ('c1301000-0000-4000-8000-000000000006', 'c1300000-0000-4000-8000-000000000006', 'valide', 'AUTRE 130', null, 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1301000-0000-4000-8000-000000000001', 'entreprise', 'cus_c130', 'sub_c130', 'active');
insert into public.artisan_members (artisan_id, user_id, role, invited_by) values
  ('c1301000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000002', 'chef', 'c1300000-0000-4000-8000-000000000001'),
  ('c1301000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000003', 'ouvrier', 'c1300000-0000-4000-8000-000000000001'),
  ('c1301000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000004', 'ouvrier', 'c1300000-0000-4000-8000-000000000001');

-- Deux chantiers de l'entreprise, journal ouvert ; un devis envoyé et un acompte payé sur le premier.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
select ('c1302000-0000-4000-8000-00000000000' || n)::uuid, 'c1300000-0000-4000-8000-000000000005', 'criteres_valides',
  'Projet 130-' || n, 'plombier', '06004', 'Antibes', now()
from generate_series(1, 2) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status)
select ('c1303000-0000-4000-8000-00000000000' || n)::uuid, ('c1302000-0000-4000-8000-00000000000' || n)::uuid,
  'c1301000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000005', '+33600001300', 'acceptee'
from generate_series(1, 2) n;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c1304000-0000-4000-8000-00000000000' || n)::uuid, ('c1302000-0000-4000-8000-00000000000' || n)::uuid,
  ('c1303000-0000-4000-8000-00000000000' || n)::uuid, 'c1301000-0000-4000-8000-000000000001',
  'c1300000-0000-4000-8000-000000000005', 'Chantier 130-' || n
from generate_series(1, 2) n;
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'en_cours' where artisan_id = 'c1301000-0000-4000-8000-000000000001';
select set_config('menao.transition_chantier', '', true);
insert into public.quotes (id, chantier_id, artisan_id, status, numero, total_ht_cents, total_tva_cents, total_ttc_cents,
  sent_at, valid_until, start_date, duration_days, payment_schedule, document) values
  ('c1305000-0000-4000-8000-000000000001', 'c1304000-0000-4000-8000-000000000001', 'c1301000-0000-4000-8000-000000000001',
   'envoye', 'DEVIS-2026-1301', 45600, 0, 45600, now(), current_date + 30, current_date + 40, 5, '[]', '{}');
insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, status, stripe_account_id, paid_at) values
  ('c1305000-0000-4000-8000-000000000001', 'c1304000-0000-4000-8000-000000000001', 'c1301000-0000-4000-8000-000000000001',
   'acompte', 13700, 'paye', 'acct_c130', now());
insert into public.expenses (artisan_id, title, issued_on, total_ht_cents, total_tva_cents) values
  ('c1301000-0000-4000-8000-000000000001', 'Tuyaux 130', current_date, 2000, 400);

-- Garde-fou : aucune fonction redéfinie ne revient à app.my_artisan_id().
select is((
  select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app') and p.prosrc like '%app.my_artisan_id()%'
    and p.proname = any (array[
      'artisan_claim_reward', 'artisan_mark_badges_seen', 'artisan_remove_logo', 'artisan_reply_review',
      'choose_welcome_gift', 'my_referral', 'my_referrals', 'my_voice_topups', 'my_welcome_gift',
      'set_artisan_budget_minimum', 'set_artisan_diploma', 'set_artisan_trades', 'set_artisan_zone',
      'set_decennale_non_soumis', 'add_artisan_absence', 'add_artisan_blocked_slot', 'artisan_cancel_chantier',
      'artisan_confirm_planning', 'artisan_confirm_start', 'artisan_declare_finished', 'artisan_delete_dictation',
      'artisan_fix_appointment', 'artisan_inbox', 'artisan_previous_lines', 'artisan_propose_slots',
      'artisan_quotes', 'artisan_rate_client', 'artisan_report_expertise', 'artisan_report_fake_client',
      'artisan_request_detail', 'artisan_reschedule_appointment', 'artisan_respond_request',
      'artisan_save_dictation', 'artisan_save_quote_draft', 'artisan_send_payment_reminder', 'artisan_send_quote',
      'artisan_signal_reserves_lifted', 'clear_external_busy', 'client_reputation', 'delete_artisan_absence',
      'delete_artisan_blocked_slot', 'disable_artisan_calendar_feed', 'invoice_document', 'my_client_reminders',
      'my_money_overview', 'quote_document', 'reception_document', 'renew_artisan_calendar_feed',
      'replace_external_busy', 'save_client_reminder_settings', 'save_secretary_settings',
      'secretary_message_done', 'set_artisan_availability', 'set_artisan_available_from', 'set_artisan_hours',
      'set_artisan_paused', 'set_payment_reminders_auto', 'settle_voice_quote_drafts', 'artisan_request_detail'])
), 0, 'aucune fonction du patron ou de l''encadrement ne revient à my_artisan_id');
select is((
  select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'app') and p.prosrc like '%can_see_chantier(%'
    and p.proname = any (array[
      'artisan_add_chantier_message', 'artisan_chantier_detail', 'artisan_chantiers',
      'artisan_save_appointment_notes', 'chantier_appointment', 'chantier_messages', 'mark_conversation_read',
      'my_conversations', 'my_unread_messages', 'report_chantier_problem', 'report_message', 'send_message',
      'can_read_chantier_folder', 'record_chantier_photo', 'record_message_attachment'])
), 15, 'fonctions des chantiers : ouvrier attribué seulement');

-- ---------- Patron ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.chantiers), 2, 'patron : tous les chantiers');
select is((select count(*)::int from public.quotes), 1, 'patron : devis');
select is(jsonb_array_length(public.chantier_team('c1304000-0000-4000-8000-000000000001')), 3,
  'patron : équipe du chantier (membres actifs)');
select lives_ok($$ select public.set_chantier_team('c1304000-0000-4000-8000-000000000001',
  array['c1300000-0000-4000-8000-000000000003']::uuid[]) $$, 'patron : attribue l''ouvrier au premier chantier');
select is((select count(*)::int from jsonb_array_elements(public.chantier_team('c1304000-0000-4000-8000-000000000001')) m
  where (m ->> 'affecte')::boolean), 1, 'équipe du chantier : ouvrier attribué');
select throws_ok($$ select public.set_chantier_team('c1304000-0000-4000-8000-000000000001',
  array['c1300000-0000-4000-8000-000000000006']::uuid[]) $$, '22023', 'Membre de l''équipe introuvable.',
  'attribution : membres de l''entreprise seulement');
select ok(public.my_money_overview(now())::text like '%13700%', 'patron : suivi de l''argent');
select is(public.my_assistant_context() ->> 'place', 'patron', 'assistant : place du patron');

-- ---------- Chef d'équipe ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(app.my_manager_artisan_id(), 'c1301000-0000-4000-8000-000000000001'::uuid, 'chef : encadrement');
select is((select count(*)::int from public.chantiers), 2, 'chef : tous les chantiers');
select is((select count(*)::int from public.artisan_chantiers()), 2, 'chef : liste des chantiers');
select is((select count(*)::int from public.quotes), 1, 'chef : devis');
select is((select count(*)::int from public.payments), 1, 'chef : paiements');
select is((select count(*)::int from public.expenses), 1, 'chef : dépenses');
select is((select count(*)::int from public.requests), 2, 'chef : demandes');
select is((select count(*)::int from public.artisan_quotes()), 1, 'chef : liste des devis');
select ok(public.my_money_overview(now())::text like '%13700%', 'chef : suivi de l''argent');
select is(public.my_assistant_context() ->> 'place', 'chef', 'assistant : place du chef');
select is((public.my_assistant_context() -> 'chantiers' ->> 'en_cours')::int, 2, 'assistant : tous les chantiers du chef');
select lives_ok($$ select public.set_chantier_team('c1304000-0000-4000-8000-000000000002',
  array['c1300000-0000-4000-8000-000000000002']::uuid[]) $$, 'chef : attribue un chantier');
select lives_ok($$ select public.set_artisan_paused(false) $$, 'chef : disponibilité');
select is((select count(*)::int from public.voice_credits), 0, 'chef : pas les recharges');
select is((select count(*)::int from public.accountant_settings), 0, 'chef : pas l''export comptable');
select ok(public.my_referral() is null, 'chef : pas le parrainage');
select throws_ok($$ select public.my_team() $$, '42501', null, 'chef : pas l''équipe');
update public.artisans set presentation = 'Modifiée par le chef' where id = 'c1301000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.artisans where presentation = 'Modifiée par le chef'), 0,
  'chef : fiche de l''entreprise non modifiable');

-- ---------- Ouvrier attribué au premier chantier ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(app.my_artisan_id(), 'c1301000-0000-4000-8000-000000000001'::uuid, 'ouvrier : membre de l''entreprise');
select is(app.my_manager_artisan_id(), null, 'ouvrier : pas d''encadrement');
select is((select array_agg(id)::text from public.chantiers), '{c1304000-0000-4000-8000-000000000001}',
  'ouvrier : son chantier seulement');
select is((select array_agg(chantier_id)::text from public.artisan_chantiers()), '{c1304000-0000-4000-8000-000000000001}',
  'ouvrier : liste de ses chantiers');
select isnt(public.artisan_chantier_detail('c1304000-0000-4000-8000-000000000001'), null, 'ouvrier : détail de son chantier');
select is(public.artisan_chantier_detail('c1304000-0000-4000-8000-000000000002'), null, 'ouvrier : pas les autres chantiers');
select is(public.artisan_chantier_detail('c1304000-0000-4000-8000-000000000001') -> 'budget', 'null'::jsonb,
  'ouvrier : pas le budget du client');
select is(public.artisan_request_detail('c1303000-0000-4000-8000-000000000002'), null, 'ouvrier : pas les autres demandes');
select is((select count(*)::int from public.quotes), 0, 'ouvrier : aucun devis');
select is((select count(*)::int from public.payments), 0, 'ouvrier : aucun paiement');
select is((select count(*)::int from public.invoices), 0, 'ouvrier : aucune facture');
select is((select count(*)::int from public.expenses), 0, 'ouvrier : aucune dépense');
select is((select count(*)::int from public.requests), 0, 'ouvrier : aucune demande');
select is((select count(*)::int from public.artisan_quotes()), 0, 'ouvrier : liste des devis vide');
select is((select count(*)::int from public.artisan_inbox()), 0, 'ouvrier : demandes vides');
select ok(coalesce(public.my_money_overview(now())::text, '') not like '%13700%', 'ouvrier : aucun montant dans le suivi');
select is(public.my_assistant_context() ->> 'place', 'ouvrier', 'assistant : place de l''ouvrier');
select is((public.my_assistant_context() -> 'chantiers' ->> 'en_cours')::int, 1, 'assistant : ses chantiers seulement');
select ok(not (public.my_assistant_context() ? 'demandes_en_attente') and not (public.my_assistant_context() ? 'abonnement'),
  'assistant : ni demandes ni formule pour l''ouvrier');
select lives_ok($$ select public.send_message('c1304000-0000-4000-8000-000000000001', 'Je passe demain matin.') $$,
  'ouvrier : écrit au client de son chantier');
select throws_ok($$ select public.send_message('c1304000-0000-4000-8000-000000000002', 'Bonjour') $$, '42501', null,
  'ouvrier : pas sur un autre chantier');
select lives_ok($$ select public.artisan_add_chantier_message('c1304000-0000-4000-8000-000000000001', 'Pose terminée.') $$,
  'ouvrier : journal de son chantier');
select is((select count(*)::int from public.chantier_messages('c1304000-0000-4000-8000-000000000001')), 1,
  'ouvrier : messages de son chantier');
select is((select count(*)::int from public.my_conversations()), 1, 'ouvrier : ses conversations');
select throws_ok($$ select public.artisan_declare_finished('c1304000-0000-4000-8000-000000000001') $$, '42501', null,
  'ouvrier : pas de décision sur le chantier');
select throws_ok($$ select public.set_chantier_team('c1304000-0000-4000-8000-000000000001', '{}'::uuid[]) $$,
  '42501', 'Chantier introuvable', 'ouvrier : n''attribue pas');
select throws_ok($$ select public.chantier_team('c1304000-0000-4000-8000-000000000001') $$, '42501', 'Chantier introuvable',
  'ouvrier : pas la liste de l''équipe');
select throws_ok($$ select public.set_artisan_paused(true) $$, '42501', null, 'ouvrier : pas la disponibilité');
select is((select count(*)::int from public.chantier_assignments), 1, 'ouvrier : sa propre attribution');
select ok(app.can_read_chantier_folder('c1304000-0000-4000-8000-000000000001/photo.jpg'), 'ouvrier : photos de son chantier');
select ok(not app.can_read_chantier_folder('c1304000-0000-4000-8000-000000000002/photo.jpg'),
  'ouvrier : pas les photos des autres chantiers');

-- ---------- Second ouvrier, sans chantier ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000004',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.chantiers), 0, 'ouvrier sans attribution : aucun chantier');
select is(public.my_unread_messages(), 0, 'ouvrier sans attribution : aucun message');

-- ---------- Client et autre artisan ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000005',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is((select count(*)::int from public.chantiers), 2, 'client : ses chantiers');
select is((select count(*)::int from public.quotes), 1, 'client : devis envoyé');
select is((select count(*)::int from public.chantier_assignments), 0, 'client : pas les attributions');
select is(public.my_unread_messages(), 1, 'client : message de l''ouvrier');
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000006',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.chantiers), 0, 'autre artisan : aucun chantier');
select throws_ok($$ select public.chantier_team('c1304000-0000-4000-8000-000000000001') $$, '42501', 'Chantier introuvable',
  'autre artisan : pas l''équipe du chantier');

-- ---------- Photo du journal enregistrée par process-upload ----------
reset role;
select is(public.record_chantier_photo('c1304000-0000-4000-8000-000000000001',
  'c1300000-0000-4000-8000-000000000003', 'c1304000-0000-4000-8000-000000000001/ouvrier.jpg'), 'ok',
  'photo : ouvrier sur son chantier');
select is(public.record_chantier_photo('c1304000-0000-4000-8000-000000000002',
  'c1300000-0000-4000-8000-000000000003', 'c1304000-0000-4000-8000-000000000002/ouvrier.jpg'), 'forbidden',
  'photo : pas sur un autre chantier');

-- ---------- Suspension, puis retrait ----------
update public.artisan_members set suspended_reason = 'patron', suspended_at = now()
where user_id = 'c1300000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1300000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.chantiers), 0, 'ouvrier suspendu : aucun chantier');
reset role;
select is((select count(*)::int from public.chantier_assignments
  where user_id = 'c1300000-0000-4000-8000-000000000003'), 1, 'suspension : attribution gardée');
delete from public.artisan_members where user_id = 'c1300000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.chantier_assignments
  where user_id = 'c1300000-0000-4000-8000-000000000003'), 0, 'retrait : attributions supprimées');
select is((select count(*)::int from public.audit_logs where action = 'equipe_artisan.chantier'
  and target_id = 'c1304000-0000-4000-8000-000000000001'), 1, 'attribution journalisée');

select * from finish();
rollback;
