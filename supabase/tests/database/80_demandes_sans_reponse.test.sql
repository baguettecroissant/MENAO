-- Aucune demande sans réponse (ADR 0156) : relances de l'artisan à 24 h puis 48 h, deux au plus,
-- seulement pour une demande qui attend sa réponse ; quand plus aucune demande d'un projet n'attend
-- ni n'est acceptée, le client est prévenu et un ticket « Demande sans réponse » est ouvert, une
-- seule fois même si plusieurs demandes expirent ensemble. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c8000000-0000-4000-8000-000000000001', 'relance80.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c8000000-0000-4000-8000-00000000001' || n)::uuid, 'relance80.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 4) n;
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode)
select ('c8100000-0000-4000-8000-00000000000' || n)::uuid, ('c8000000-0000-4000-8000-00000000001' || n)::uuid,
  'valide', 'RELANCE ' || n, 'communes'
from generate_series(1, 4) n;
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('c8200000-0000-4000-8000-000000000001', 'c8000000-0000-4000-8000-000000000001', 'Fuite sous l''évier', 'plombier', '06088', 'Nice'),
  ('c8200000-0000-4000-8000-000000000002', 'c8000000-0000-4000-8000-000000000001', 'Chauffe-eau en panne', 'plombier', '06088', 'Nice'),
  ('c8200000-0000-4000-8000-000000000003', 'c8000000-0000-4000-8000-000000000001', 'Robinet qui goutte', 'plombier', '06088', 'Nice');

-- Projet 1 : deux demandes envoyées il y a 25 h. Projet 2 : deux demandes qui expireront ensemble.
-- Projet 3 : une demande acceptée, une en attente.
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, created_at, expires_at, status) values
  ('c8300000-0000-4000-8000-000000000011', 'c8200000-0000-4000-8000-000000000001', 'c8100000-0000-4000-8000-000000000001',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '25 hours', now() + interval '47 hours', 'envoyee'),
  ('c8300000-0000-4000-8000-000000000012', 'c8200000-0000-4000-8000-000000000001', 'c8100000-0000-4000-8000-000000000002',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '25 hours', now() + interval '47 hours', 'envoyee'),
  ('c8300000-0000-4000-8000-000000000021', 'c8200000-0000-4000-8000-000000000002', 'c8100000-0000-4000-8000-000000000003',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '10 hours', now() + interval '62 hours', 'envoyee'),
  ('c8300000-0000-4000-8000-000000000022', 'c8200000-0000-4000-8000-000000000002', 'c8100000-0000-4000-8000-000000000004',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '10 hours', now() + interval '62 hours', 'envoyee'),
  ('c8300000-0000-4000-8000-000000000031', 'c8200000-0000-4000-8000-000000000003', 'c8100000-0000-4000-8000-000000000001',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '30 hours', now() + interval '42 hours', 'acceptee'),
  ('c8300000-0000-4000-8000-000000000032', 'c8200000-0000-4000-8000-000000000003', 'c8100000-0000-4000-8000-000000000003',
   'c8000000-0000-4000-8000-000000000001', '+33612345678', now() - interval '2 hours', now() + interval '70 hours', 'envoyee');

create function pg_temp.relances(p_request uuid) returns int language sql as $$
  select count(*)::int from public.notifications where type = 'demande_relance' and data ->> 'request_id' = p_request::text
$$;

-- ---------- Relances de l'artisan ----------
select is(app.remind_pending_requests(), 2, '24 h sans réponse : une relance par artisan du projet 1');
select is(pg_temp.relances('c8300000-0000-4000-8000-000000000011'), 1, 'première relance envoyée');
select is((select data ->> 'etape' from public.notifications
           where type = 'demande_relance' and data ->> 'request_id' = 'c8300000-0000-4000-8000-000000000011'),
  '1', 'étape 1');
select is(pg_temp.relances('c8300000-0000-4000-8000-000000000021'), 0, 'demande de 10 h : pas encore relancée');
select is(pg_temp.relances('c8300000-0000-4000-8000-000000000031'), 0, 'demande acceptée : jamais relancée');
select is(app.remind_pending_requests(), 0, 'nouvel appel : pas de doublon');
-- 24 h plus tard : 2e relance pour le projet 1, 1re pour les demandes du projet 2 et la demande
-- en attente du projet 3.
select is(app.remind_pending_requests(now() + interval '24 hours'), 5,
  '48 h sans réponse : deuxième relance pour le projet 1, première pour les autres');
select is(pg_temp.relances('c8300000-0000-4000-8000-000000000011'), 2, 'deux relances');
select is(app.remind_pending_requests(now() + interval '30 hours'), 0, 'jamais plus de deux relances');

-- Demande au délai dépassé mais pas encore marquée expirée : plus de relance.
update public.requests set created_at = now() - interval '73 hours', expires_at = now() - interval '1 minute'
where id = 'c8300000-0000-4000-8000-000000000032';
select is(app.remind_pending_requests(), 0, 'délai dépassé : plus de relance');
update public.requests set created_at = now() - interval '2 hours', expires_at = now() + interval '70 hours'
where id = 'c8300000-0000-4000-8000-000000000032';

-- ---------- Projet 1 : un refus, puis l'autre demande expire ----------
update public.requests set status = 'refusee', refusal_reason = 'planning_complet', responded_at = now() where id = 'c8300000-0000-4000-8000-000000000011';
select is_empty($$ select 1 from public.notifications where type = 'demande_sans_reponse' $$,
  'une demande attend encore : pas d''alerte');
update public.requests set expires_at = now() - interval '1 minute' where id = 'c8300000-0000-4000-8000-000000000012';
select ok(app.expire_requests() >= 1, 'expiration de la demande restante');
select is(
  (select (data ->> 'project_id') || ' ' || (data ->> 'tous_refus') from public.notifications
   where type = 'demande_sans_reponse' and user_id = 'c8000000-0000-4000-8000-000000000001'),
  'c8200000-0000-4000-8000-000000000001 false', 'client prévenu : un refus et une absence de réponse');
select results_eq(
  $$ select type::text, contact_email, project_id from public.tickets where type = 'demande_sans_reponse' $$,
  $$ values ('demande_sans_reponse', 'relance80.client@example.test',
       'c8200000-0000-4000-8000-000000000001'::uuid) $$,
  'ticket « Demande sans réponse » ouvert pour le SAV');
select ok((select due_at <= now() + interval '1 day' from public.tickets where type = 'demande_sans_reponse'),
  'échéance d''un jour');

-- ---------- Projet 2 : deux demandes qui expirent dans la même instruction ----------
update public.requests set expires_at = now() - interval '1 minute'
where project_id = 'c8200000-0000-4000-8000-000000000002';
select is(app.expire_requests(), 2, 'deux demandes expirées ensemble');
select is((select count(*)::int from public.notifications
           where type = 'demande_sans_reponse' and data ->> 'project_id' = 'c8200000-0000-4000-8000-000000000002'),
  1, 'un seul avis au client');
select is((select count(*)::int from public.tickets
           where type = 'demande_sans_reponse' and project_id = 'c8200000-0000-4000-8000-000000000002'),
  1, 'un seul ticket');

-- ---------- Projet 3 : une demande acceptée ----------
update public.requests set status = 'refusee', refusal_reason = 'planning_complet', responded_at = now() where id = 'c8300000-0000-4000-8000-000000000032';
select is_empty(
  $$ select 1 from public.notifications where type = 'demande_sans_reponse'
     and data ->> 'project_id' = 'c8200000-0000-4000-8000-000000000003' $$,
  'une demande acceptée : pas d''alerte');

-- ---------- Projet 1 bis : tous refusent ----------
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('c8200000-0000-4000-8000-000000000004', 'c8000000-0000-4000-8000-000000000001', 'Douche à refaire', 'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('c8300000-0000-4000-8000-000000000041', 'c8200000-0000-4000-8000-000000000004', 'c8100000-0000-4000-8000-000000000002',
   'c8000000-0000-4000-8000-000000000001', '+33612345678');
update public.requests set status = 'refusee', refusal_reason = 'planning_complet', responded_at = now() where id = 'c8300000-0000-4000-8000-000000000041';
select is(
  (select data ->> 'tous_refus' from public.notifications
   where type = 'demande_sans_reponse' and data ->> 'project_id' = 'c8200000-0000-4000-8000-000000000004'),
  'true', 'tous les artisans ont refusé : le client est prévenu aussitôt');

select * from finish();
rollback;
