-- F-56 (lot 4a, ADR 0049) : boîte de réception des tickets, prise en charge et notes internes.
-- RLS des notes vérifiée avec chaque rôle : particulier, support et admin.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c0100000-0000-4000-8000-000000000001', 'boite.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Boite"}'),
  ('c0300000-0000-4000-8000-000000000001', 'boite.admin@example.test', false, now(), '{"role":"admin"}', '{"first_name":"Alex","last_name":"Equipe"}'),
  ('c0300000-0000-4000-8000-000000000002', 'boite.support@example.test', false, now(), '{"role":"support"}', '{"first_name":"Sacha","last_name":"Support"}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Un message de contact en retard, une demande de suppression, un ticket clos.
insert into public.tickets (id, type, user_id, contact_email, subject, message, due_at, status, resolved_at) values
  ('c0400000-0000-4000-8000-000000000001', 'contact', 'c0100000-0000-4000-8000-000000000001',
   'boite.client@example.test', 'Boîte : question garantie', 'Combien de temps dure la garantie ?',
   now() - interval '1 day', 'ouvert', null),
  ('c0400000-0000-4000-8000-000000000002', 'suppression_compte', 'c0100000-0000-4000-8000-000000000001',
   'boite.client@example.test', 'Boîte : suppression du compte', null,
   now() + interval '1 month', 'ouvert', null),
  ('c0400000-0000-4000-8000-000000000003', 'contact', 'c0100000-0000-4000-8000-000000000001',
   'boite.client@example.test', 'Boîte : ancien message', 'Merci.',
   now() - interval '10 days', 'resolu', now() - interval '5 days');

-- ---------- Accès réservé à l'équipe ----------
select pg_temp.connecter('c0100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.staff_tickets() $$, '42501', null, 'particulier : pas de boîte de réception');
select throws_ok($$ select public.staff_ticket_counts() $$, '42501', null, 'particulier : pas de compteurs');
select throws_ok(
  $$ select public.staff_take_ticket('c0400000-0000-4000-8000-000000000001') $$,
  '42501', null, 'particulier : ne prend pas un ticket en charge');
select throws_ok(
  $$ insert into public.ticket_notes (ticket_id, body) values ('c0400000-0000-4000-8000-000000000001', 'Intrusion') $$,
  '42501', null, 'particulier : pas de note interne');
select is_empty($$ select 1 from public.ticket_notes $$, 'particulier : ne lit aucune note');
reset role;

-- ---------- Support : boîte de réception, prise en charge, notes ----------
select pg_temp.connecter('c0300000-0000-4000-8000-000000000002', 'support');
set local role authenticated;
select results_eq(
  $$ select f, (select string_agg(right(t.ticket_id::text, 1), ',' order by t.ticket_id)
                from public.staff_tickets(f, 'Boîte :') t)
     from unnest(array['a_traiter', 'en_retard', 'messages', 'suppressions', 'clos', 'tous']) f $$,
  $$ values ('a_traiter', '1,2'), ('en_retard', '1'), ('messages', '1'), ('suppressions', '2'),
            ('clos', '3'), ('tous', '1,2,3') $$,
  'filtres de la boîte de réception');
select results_eq(
  $$ select right(ticket_id::text, 1) from public.staff_tickets('tous', 'Boîte :') $$,
  $$ values ('1'), ('2'), ('3') $$,
  'les plus urgents d''abord, les tickets clos à la fin');
select results_eq(
  $$ select declarant, contact_email from public.staff_tickets('a_traiter', 'garantie') $$,
  $$ values ('Camille Boite', 'boite.client@example.test') $$,
  'recherche dans le message, avec le déclarant');

select lives_ok(
  $$ select public.staff_take_ticket('c0400000-0000-4000-8000-000000000001') $$,
  'support : « Je m''en occupe »');
select results_eq(
  $$ select status, handler from public.staff_tickets('mes_tickets', 'Boîte :') $$,
  $$ values ('en_cours', 'Sacha Support') $$,
  'ticket pris en charge, passé en cours');
select throws_ok(
  $$ select public.staff_take_ticket('c0400000-0000-4000-8000-000000000003') $$,
  '22023', null, 'ticket clos : pas de prise en charge');

select lives_ok(
  $$ insert into public.ticket_notes (ticket_id, body)
     values ('c0400000-0000-4000-8000-000000000001', 'Rappeler la cliente demain.') $$,
  'support : note interne ajoutée');
select throws_ok(
  $$ insert into public.ticket_notes (ticket_id, author_id, body)
     values ('c0400000-0000-4000-8000-000000000001', 'c0300000-0000-4000-8000-000000000001', 'Au nom d''un autre') $$,
  '42501', null, 'note au nom d''un autre refusée');
select throws_ok(
  $$ insert into public.ticket_notes (ticket_id, body) values ('c0400000-0000-4000-8000-000000000001', '   ') $$,
  '23514', null, 'note vide refusée');
select throws_ok($$ update public.ticket_notes set body = 'Modifiée' $$, '42501', null,
  'note interne non modifiable');
select throws_ok($$ delete from public.ticket_notes $$, '42501', null, 'note interne non supprimable');
reset role;
select results_eq(
  $$ select body from public.ticket_notes where ticket_id = 'c0400000-0000-4000-8000-000000000001' $$,
  $$ values ('Rappeler la cliente demain.') $$,
  'notes ni modifiées ni supprimées');

-- ---------- Admin : lit les notes, rend la main ----------
select pg_temp.connecter('c0300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select results_eq(
  $$ select body, author_id::text from public.ticket_notes where ticket_id = 'c0400000-0000-4000-8000-000000000001' $$,
  $$ values ('Rappeler la cliente demain.', 'c0300000-0000-4000-8000-000000000002') $$,
  'admin : lit la note du support');
select is(
  (select notes from public.staff_tickets('a_traiter', 'garantie')), 1, 'nombre de notes dans la boîte');
select lives_ok(
  $$ select public.staff_take_ticket('c0400000-0000-4000-8000-000000000001', false) $$,
  'rendre la main');
select is(
  (select handled_by from public.staff_tickets('a_traiter', 'garantie')), null,
  'ticket de nouveau sans responsable');
select is(
  (public.staff_ticket_counts('Boîte :') ->> 'a_traiter')::int, 2, 'compteur « à traiter »');
select is(
  (public.staff_ticket_counts('Boîte :') ->> 'clos')::int, 1, 'compteur « clos »');
reset role;

select * from finish();
rollback;
