-- Faux particuliers et collecteurs de devis (ADR 0157) : recoupement à l'envoi (téléphone, nom,
-- adresse) → demandes « à vérifier », invisibles des artisans, ticket et note interne ; décision de
-- l'équipe (transmettre ou bloquer) ; 2 projets en cours tant qu'aucun chantier n'est concrétisé ;
-- annulation d'une demande en vérification ; signalement par l'artisan. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c8100000-0000-4000-9000-000000000001', 'faux81.client@example.test', false, now(), '{"role":"particulier"}',
   '{"first_name":"Camille","last_name":"Durand"}'),
  ('c8100000-0000-4000-9000-000000000002', 'faux81.homonyme@example.test', false, now(), '{"role":"particulier"}',
   '{"first_name":"Léa","last_name":"Bérard"}'),
  ('c8100000-0000-4000-9000-000000000009', 'faux81.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c8100000-0000-4000-9000-00000000010' || n)::uuid, 'faux81.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', case when n = 2 then '{"first_name":"Lea","last_name":"Berard"}' else '{}' end::jsonb
from generate_series(1, 4) n;

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('c8110000-0000-4000-9000-00000000000' || n)::uuid
$$;

-- Isolement : artisans du seed et des autres tests en pause.
update public.artisans set paused = true;
-- A1 (téléphone connu), A2 (homonyme d'un particulier), A3 plombier contacté, A4 (adresse de base à Nice).
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled, base_location)
select pg_temp.artisan(n), ('c8100000-0000-4000-9000-00000000010' || n)::uuid, 'valide', 'FAUX81 ' || n, 'communes', true,
  case when n = 4 then 'SRID=4326;POINT(7.2701 43.7012)'::extensions.geography end
from generate_series(1, 4) n;
insert into public.artisan_trades (artisan_id, trade_code) select pg_temp.artisan(n), 'plombier' from generate_series(1, 4) n;
insert into public.artisan_zones (artisan_id, code_insee, nom) select pg_temp.artisan(n), '06088', 'Nice' from generate_series(1, 4) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_f81_' || n, 'sub_f81_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 4) n;
update public.profiles set phone = '+33622222222' where user_id = 'c8100000-0000-4000-9000-000000000101';

insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, adresse,
  location, criteria_validated_at)
select ('c8120000-0000-4000-9000-00000000000' || n)::uuid, 'c8100000-0000-4000-9000-000000000001', 'criteres_valides',
  'Fuite ' || n, 'plombier', '06088', 'Nice', null, null, now()
from generate_series(1, 4) n;
-- Projet du second particulier : adresse à quelques mètres de la base de A4.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, adresse,
  location, criteria_validated_at) values
  ('c8120000-0000-4000-9000-000000000005', 'c8100000-0000-4000-9000-000000000002', 'criteres_valides',
   'Douche', 'plombier', '06088', 'Nice', '3 Rue de l''Exemple 06000 Nice',
   'SRID=4326;POINT(7.27012 43.70121)', now());

create function pg_temp.envoyer(p_project uuid, p_artisan int, p_phone text) returns int language sql as $$
  select public.send_project_requests(p_project, array[pg_temp.artisan(p_artisan)], null, p_phone,
    'des_que_possible', null, null)
$$;

-- ---------- Envoi sans correspondance ----------
select pg_temp.connecter('c8100000-0000-4000-9000-000000000001', 'particulier');
set local role authenticated;
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000001', 3, '+33633333333'), 1, 'demande envoyée');
select is((select status::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000001'),
  'envoyee', 'sans correspondance : transmise');

-- ---------- Téléphone d'un artisan ----------
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000002', 3, '+33622222222'), 1, 'demande enregistrée');
select is((select status::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000002'),
  'a_verifier', 'téléphone d''un artisan inscrit : à vérifier');
select is((select subject from public.tickets where project_id = 'c8120000-0000-4000-9000-000000000002'),
  'Demande en cours de vérification', 'ticket au texte neutre pour le particulier');

-- ---------- 2 projets en cours tant qu'aucun chantier n'est concrétisé ----------
select throws_like(
  $$ select pg_temp.envoyer('c8120000-0000-4000-9000-000000000003', 3, '+33633333333') $$,
  'Vous avez déjà 2 projets en attente de réponse%', 'troisième projet en cours refusé');
reset role;

select is((select type::text from public.tickets where project_id = 'c8120000-0000-4000-9000-000000000002'),
  'particulier_a_verifier', 'ticket « particulier à vérifier »');
select matches(
  (select n.body from public.ticket_notes n join public.tickets t on t.id = n.ticket_id
   where t.project_id = 'c8120000-0000-4000-9000-000000000002'),
  'telephone.*FAUX81 1', 'note interne : motif et artisan concerné');
select is_empty(
  $$ select 1 from public.notifications where type = 'nouvelle_demande'
     and data ->> 'request_id' in (select id::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000002') $$,
  'aucune notification à l''artisan tant que la demande est en vérification');

-- L'artisan ne voit pas la demande en vérification.
select pg_temp.connecter('c8100000-0000-4000-9000-000000000103', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_inbox()), 1, 'boîte de l''artisan : la demande transmise seulement');
select is_empty($$ select 1 from public.requests where project_id = 'c8120000-0000-4000-9000-000000000002' $$,
  'lecture directe : demande en vérification invisible');
select ok(public.artisan_request_detail(
  (select r.id from public.requests r where r.project_id = 'c8120000-0000-4000-9000-000000000001')) is not null,
  'détail d''une demande transmise');
select ok(public.artisan_request_detail(
  (select r.id from public.requests r where r.project_id = 'c8120000-0000-4000-9000-000000000002')) is null,
  'détail d''une demande en vérification : rien');
reset role;

-- ---------- Décision de l'équipe ----------
select pg_temp.connecter('c8100000-0000-4000-9000-000000000103', 'artisan');
set local role authenticated;
select throws_ok($$ select public.staff_review_held_requests('c8120000-0000-4000-9000-000000000002', true) $$,
  '42501', null, 'décision réservée à l''équipe');
reset role;
select pg_temp.connecter('c8100000-0000-4000-9000-000000000009', 'admin');
set local role authenticated;
select throws_ok($$ select public.staff_review_held_requests('c8120000-0000-4000-9000-000000000002', false, ' ') $$,
  '22023', 'Indiquez le motif du blocage.', 'blocage sans motif refusé');
select is(public.staff_review_held_requests('c8120000-0000-4000-9000-000000000002', true), 1, 'demande transmise');
select throws_ok($$ select public.staff_review_held_requests('c8120000-0000-4000-9000-000000000002', true) $$,
  '22023', 'Aucune demande en vérification pour ce projet.', 'plus rien à transmettre');
reset role;
select results_eq(
  $$ select status::text, expires_at > now() + interval '71 hours' from public.requests
     where project_id = 'c8120000-0000-4000-9000-000000000002' $$,
  $$ values ('envoyee', true) $$, 'transmise avec un délai de 72 h à partir de maintenant');
select is((select count(*)::int from public.notifications where type = 'nouvelle_demande'
           and data ->> 'request_id' in (select id::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000002')),
  1, 'l''artisan est prévenu à la transmission');
select is((select count(*)::int from public.audit_logs where action = 'demande.transmise'
           and target_id = 'c8120000-0000-4000-9000-000000000002'), 1, 'décision journalisée');

-- ---------- Nom d'un artisan, puis adresse à quelques mètres d'une base d'artisan ----------
select pg_temp.connecter('c8100000-0000-4000-9000-000000000002', 'particulier');
set local role authenticated;
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000005', 3, '+33644444444'), 1, 'demande enregistrée');
reset role;
select is((select status::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000005'),
  'a_verifier', 'homonyme d''un artisan et adresse de sa base : à vérifier');
select matches(
  (select n.body from public.ticket_notes n join public.tickets t on t.id = n.ticket_id
   where t.project_id = 'c8120000-0000-4000-9000-000000000005'),
  'adresse, nom', 'les deux motifs');

-- Annulation par le particulier : l'artisan n'en a jamais rien su.
select pg_temp.connecter('c8100000-0000-4000-9000-000000000002', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.particulier_cancel_request(
       (select id from public.requests where project_id = 'c8120000-0000-4000-9000-000000000005'), 'plus_besoin') $$,
  'demande en vérification annulée par le particulier');
reset role;
select is_empty($$ select 1 from public.notifications where type = 'demande_annulee'
                   and user_id = 'c8100000-0000-4000-9000-000000000103' $$,
  'pas d''avis d''annulation à l''artisan');

-- ---------- Blocage par l'équipe ----------
select pg_temp.connecter('c8100000-0000-4000-9000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.particulier_cancel_request(
       (select id from public.requests where project_id = 'c8120000-0000-4000-9000-000000000001'), 'plus_besoin') $$,
  'une place se libère');
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000003', 1, '+33622222222'), 1, 'nouvelle demande retenue');
reset role;
select pg_temp.connecter('c8100000-0000-4000-9000-000000000009', 'admin');
set local role authenticated;
select is(public.staff_review_held_requests('c8120000-0000-4000-9000-000000000003', false, 'Artisan inscrit'), 1,
  'demande bloquée');
reset role;
select is((select status::text from public.requests where project_id = 'c8120000-0000-4000-9000-000000000003'),
  'annulee', 'demande bloquée : annulée');

-- ---------- Chantier concrétisé : plus de limite ----------
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c8130000-0000-4000-9000-000000000001', 'c8120000-0000-4000-9000-000000000003', pg_temp.artisan(2),
   'c8100000-0000-4000-9000-000000000001', '+33633333333', 'acceptee');
insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title)
values ('c8120000-0000-4000-9000-000000000003', 'c8130000-0000-4000-9000-000000000001', pg_temp.artisan(2),
  'c8100000-0000-4000-9000-000000000001', 'Fuite 3');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'devis_signe' where request_id = 'c8130000-0000-4000-9000-000000000001';
select set_config('menao.transition_chantier', '', true);
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
values ('c8120000-0000-4000-9000-000000000006', 'c8100000-0000-4000-9000-000000000001', 'criteres_valides',
  'Fuite 6', 'plombier', '06088', 'Nice', now());
select pg_temp.connecter('c8100000-0000-4000-9000-000000000001', 'particulier');
set local role authenticated;
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000004', 3, '+33633333333'), 1, 'troisième projet : accepté');
select is(pg_temp.envoyer('c8120000-0000-4000-9000-000000000006', 3, '+33633333333'), 1,
  'chantier concrétisé : plus de limite de projets');
reset role;

-- ---------- Signalement par l'artisan ----------
select pg_temp.connecter('c8100000-0000-4000-9000-000000000103', 'artisan');
set local role authenticated;
select lives_ok(
  $$ select public.artisan_report_fake_client(
       (select id from public.requests where project_id = 'c8120000-0000-4000-9000-000000000004'), 'Même voix qu''un concurrent') $$,
  'signalement envoyé');
select throws_ok(
  $$ select public.artisan_report_fake_client(
       (select id from public.requests where project_id = 'c8120000-0000-4000-9000-000000000004')) $$,
  '22023', 'Vous avez déjà signalé cette demande.', 'un seul signalement par demande');
select throws_ok(
  $$ select public.artisan_report_fake_client('c8130000-0000-4000-9000-000000000001') $$,
  '42501', null, 'demande d''un autre artisan : refusé');
reset role;
select is(
  (select type::text || ' : ' || message from public.tickets
   where type = 'faux_particulier' and project_id = 'c8120000-0000-4000-9000-000000000004'),
  'faux_particulier : Même voix qu''un concurrent', 'ticket « faux particulier » pour l''équipe');

select * from finish();
rollback;
