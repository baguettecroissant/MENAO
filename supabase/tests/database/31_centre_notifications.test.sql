-- F-41 : centre de notifications (lecture, non lues, marquées lues) et préférences d'e-mail
-- (facultatives ignorées, transactionnelles toujours envoyées), droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d7100000-0000-4000-8000-000000000001', 'notif.a@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('d7100000-0000-4000-8000-000000000002', 'notif.b@example.test', false, now(), '{}', '{"first_name":"Alex"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Isolement : les notifications du seed sont considérées comme envoyées.
update public.notifications set status = 'envoyee' where status in ('a_envoyer', 'en_cours');
select app.notify('d7100000-0000-4000-8000-000000000001', 'devis_recu', '{"titre":"Prises"}');
select app.notify('d7100000-0000-4000-8000-000000000001', 'chantier_nouveautes', '{"titre":"Prises","photos":2}');
select app.notify('d7100000-0000-4000-8000-000000000001', 'rdv_rappel', '{"titre":"Prises"}');
select app.notify('d7100000-0000-4000-8000-000000000002', 'devis_recu', '{"titre":"Tableau"}');

-- ---------- Centre de notifications ----------
select pg_temp.connecter('d7100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select type::text from public.my_notifications() $$,
  $$ values ('rdv_rappel'::text), ('chantier_nouveautes'::text), ('devis_recu'::text) $$,
  'client : ses notifications, de la plus récente à la plus ancienne');
select is(public.my_unread_notifications(), 3, 'client : trois non lues');
select is(public.mark_notifications_read(array[(select notification_id from public.my_notifications()
  where type = 'devis_recu')]), 1, 'une notification marquée lue');
select is(public.my_unread_notifications(), 2, 'client : deux non lues');
select is(public.mark_notifications_read(), 2, 'toutes marquées lues');
select is(public.my_unread_notifications(), 0, 'client : plus de non lues');
reset role;
select pg_temp.connecter('d7100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select results_eq($$ select type::text from public.my_notifications() $$, $$ values ('devis_recu'::text) $$,
  'autre client : seulement ses notifications');
select is(public.mark_notifications_read(array(select id from public.notifications)), 1,
  'autre client : ne peut marquer que les siennes');
reset role;
select is((select count(*)::int from public.notifications
  where user_id = 'd7100000-0000-4000-8000-000000000001' and read_at is not null), 3,
  'les notifications du client restent comme il les a marquées');
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select * from public.my_notifications() $$, '42501', null, 'visiteur : aucune lecture');
reset role;

-- ---------- Préférences d'e-mail ----------
select pg_temp.connecter('d7100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select public.set_notification_preferences(null, true) $$, '22023', 'Préférences incomplètes',
  'préférences incomplètes refusées');
select lives_ok($$ select public.set_notification_preferences(false, true) $$, 'activité désactivée, rappels gardés');
reset role;
select is((select notification_preferences -> 'email' from public.profiles
  where user_id = 'd7100000-0000-4000-8000-000000000001'), '{"activite": false, "rappels": true}'::jsonb,
  'préférences enregistrées');

-- Envoi : facultative refusée ignorée, rappel gardé et transactionnelle envoyés.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select type::text from public.claim_notifications(10) order by type::text $$,
  $$ values ('devis_recu'::text), ('devis_recu'::text), ('rdv_rappel'::text) $$,
  'e-mails envoyés : transactionnels et rappel ; activité refusée exclue');
reset role;
select results_eq(
  $$ select type::text, status::text from public.notifications
     where user_id = 'd7100000-0000-4000-8000-000000000001' order by type::text $$,
  $$ values ('chantier_nouveautes'::text, 'ignoree'::text), ('devis_recu'::text, 'en_cours'::text),
            ('rdv_rappel'::text, 'en_cours'::text) $$,
  'notification d''activité ignorée, toujours lisible dans l''espace du client');

select * from finish();
rollback;
