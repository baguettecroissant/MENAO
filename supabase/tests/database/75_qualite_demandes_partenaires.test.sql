-- Qualité des demandes des partenaires (F-59, ADR 0145) : primes annulées d'office (partenaire
-- lui-même par son téléphone ou son SIREN, même client ou même téléphone en 90 jours, plafond du
-- partenaire), signaux « à vérifier » (rafale, téléphone partagé) qui bloquent la validation,
-- validation seulement avec un vrai contact (devis envoyé, visite passée), attente d'une visite à
-- venir, signalement de l'artisan, entonnoir. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- 01 admin ; 02 à 11 clients A à J ; 12 et 13 artisans X et Y.
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c7500000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'q75.' || n || '@example.test', false, now(),
  jsonb_build_object('role', case when n = 1 then 'admin' when n >= 12 then 'artisan' else 'particulier' end), '{}'
from generate_series(1, 13) n;
-- X : artisan indépendant ; Y : un établissement de l'entreprise du partenaire (même SIREN).
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('c7510000-0000-4000-8000-000000000001', 'c7500000-0000-4000-8000-000000000012', 'valide',
   '00000075000018', 'PLOMBERIE X', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true),
  ('c7510000-0000-4000-8000-000000000002', 'c7500000-0000-4000-8000-000000000013', 'valide',
   '73282932000090', 'AGENCE TRAVAUX Y', '5710', '2 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);
-- Partenaires : P (téléphone renseigné), P2 (plafond d'une demande par mois), P3.
insert into public.partners (id, code, nom, siret, contact_email, contact_phone, plafond_demandes_mois) values
  ('c7520000-0000-4000-8000-000000000001', 'agence-q75', 'Agence Exemple', '73282932000074',
   'q75.agence@example.test', '+33611111175', null),
  ('c7520000-0000-4000-8000-000000000002', 'cabinet-q75', 'Cabinet Exemple', '00000077000016',
   'q75.cabinet@example.test', null, 1),
  ('c7520000-0000-4000-8000-000000000003', 'notaire-q75', 'Office Exemple', '00000078000015',
   'q75.notaire@example.test', null, null);
-- Projets : un par client sauf A (deux projets).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom)
select ('c7530000-0000-4000-8000-0000000000' || p.n)::uuid,
  ('c7500000-0000-4000-8000-0000000000' || p.client)::uuid, 'demande_envoyee', 'Projet ' || p.n, 'plombier', '06088', 'Nice'
from (values ('01', '02'), ('02', '02'), ('03', '04'), ('04', '05'), ('05', '06'), ('06', '07'),
             ('07', '08'), ('08', '09'), ('09', '10'), ('10', '11')) as p (n, client);
select public.attribute_project_partner(('c7530000-0000-4000-8000-0000000000' || p.n)::uuid, p.code)
from (values ('01', 'agence-q75'), ('02', 'agence-q75'), ('03', 'agence-q75'), ('04', 'agence-q75'),
             ('05', 'agence-q75'), ('06', 'cabinet-q75'), ('07', 'cabinet-q75'), ('08', 'agence-q75'),
             ('09', 'notaire-q75'), ('10', 'notaire-q75')) as p (n, code);

-- Demande envoyée puis acceptée : (projet, client, artisan, téléphone donné à l'envoi).
create function pg_temp.accepter(p_project text, p_client text, p_artisan text, p_phone text) returns uuid language sql as $$
  insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, responded_at)
  values (('c7530000-0000-4000-8000-0000000000' || p_project)::uuid, ('c7510000-0000-4000-8000-0000000000' || p_artisan)::uuid,
          ('c7500000-0000-4000-8000-0000000000' || p_client)::uuid, p_phone, 'acceptee', now())
  returning id;
$$;
create function pg_temp.prime(p_project text) returns table (status text, cancel_reason text, review_reason text) language sql as $$
  select status::text, cancel_reason, review_reason from public.partner_commissions
  where project_id = ('c7530000-0000-4000-8000-0000000000' || p_project)::uuid;
$$;
create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Annulées d'office ----------
select pg_temp.accepter('01', '02', '01', '+33600000751');
select results_eq($$ select * from pg_temp.prime('01') $$, $$ values ('en_attente', null::text, null::text) $$,
  'première demande du client A : en attente, sans signal');
select pg_temp.accepter('02', '02', '01', '+33600000752');
select results_eq($$ select status, cancel_reason from pg_temp.prime('02') $$,
  $$ values ('annulee', 'Même client déjà compté il y a moins de 90 jours') $$, 'même client en 90 jours : annulée');
select pg_temp.accepter('03', '04', '01', '+33600000751');
select results_eq($$ select status, cancel_reason from pg_temp.prime('03') $$,
  $$ values ('annulee', 'Même téléphone qu''une demande déjà comptée il y a moins de 90 jours') $$,
  'autre compte, même téléphone : annulée');
select pg_temp.accepter('04', '05', '01', '+33611111175');
select results_eq($$ select status, cancel_reason from pg_temp.prime('04') $$,
  $$ values ('annulee', 'Téléphone du partenaire lui-même') $$, 'téléphone du partenaire : annulée');
select pg_temp.accepter('05', '06', '02', '+33600000755');
select results_eq($$ select status, cancel_reason from pg_temp.prime('05') $$,
  $$ values ('annulee', 'Entreprise du partenaire lui-même') $$,
  'artisan de l''entreprise du partenaire (même SIREN) : annulée');
select pg_temp.accepter('06', '07', '01', '+33600000756');
select pg_temp.accepter('07', '08', '01', '+33600000757');
select results_eq($$ select status, cancel_reason from pg_temp.prime('07') $$,
  $$ values ('annulee', 'Plafond mensuel de demandes atteint') $$, 'plafond propre au partenaire : annulée');

-- ---------- Signaux « à vérifier » ----------
-- Rafale : trois autres primes de P dans les dernières 24 h, plus celle du client A.
insert into public.partner_commissions (partner_id, kind, amount_cents, validate_after)
select 'c7520000-0000-4000-8000-000000000001', 'demande_qualifiee', 0, now() + interval '30 days'
from generate_series(1, 3);
select pg_temp.accepter('08', '09', '01', '+33600000758');
select results_eq($$ select * from pg_temp.prime('08') $$,
  $$ values ('en_attente', null::text, 'Beaucoup de demandes en 24 h pour ce partenaire') $$,
  'cinquième demande en 24 h : à vérifier');
-- Téléphone déjà enregistré sur le profil d'un autre client.
update public.profiles set phone = '+33600000799' where user_id = 'c7500000-0000-4000-8000-000000000003';
select pg_temp.accepter('09', '10', '01', '+33600000799');
select results_eq($$ select * from pg_temp.prime('09') $$,
  $$ values ('en_attente', null::text, 'Téléphone utilisé par un autre compte client') $$,
  'téléphone d''un autre compte : à vérifier');

-- ---------- Validation : vrai contact exigé ----------
-- A : devis envoyé ; H (à vérifier) : visite dans dix jours ; F (P2) : rien.
select set_config('menao.transition_chantier', 'on', true);
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c7540000-0000-4000-8000-0000000000' || p.n)::uuid, r.project_id, r.id, r.artisan_id, r.particulier_id, 'Chantier'
from (values ('01'), ('08')) as p (n)
join public.requests r on r.project_id = ('c7530000-0000-4000-8000-0000000000' || p.n)::uuid;
insert into public.quotes (chantier_id, artisan_id, status)
values ('c7540000-0000-4000-8000-000000000001', 'c7510000-0000-4000-8000-000000000001', 'envoye');
insert into public.appointments (chantier_id, starts_at)
values ('c7540000-0000-4000-8000-000000000008', now() + interval '10 days');
update public.partner_commissions set validate_after = now() - interval '1 minute'
where project_id in ('c7530000-0000-4000-8000-000000000001', 'c7530000-0000-4000-8000-000000000006',
                     'c7530000-0000-4000-8000-000000000008');
select is(app.validate_partner_commissions(), 2, 'prime à vérifier laissée de côté');
select is((select status from pg_temp.prime('01')), 'validee', 'devis envoyé : validée');
select results_eq($$ select status, cancel_reason from pg_temp.prime('06') $$,
  $$ values ('annulee', 'Ni visite ni devis dans le délai de validation') $$, 'aucun contact : annulée');

-- Levée du signal par un admin : la validation suit son cours et attend la visite.
select pg_temp.connecter('c7500000-0000-4000-8000-000000000012', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.admin_clear_commission_review((select id from public.partner_commissions where review_reason is not null limit 1)) $$,
  '42501', null, 'artisan : levée impossible');
reset role;
select pg_temp.connecter('c7500000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_partner_funnel('c7520000-0000-4000-8000-000000000001') $$,
  '42501', null, 'admin sans double authentification : entonnoir impossible');
reset role;
select pg_temp.connecter('c7500000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_clear_commission_review(
       (select id from public.partner_commissions where project_id = 'c7530000-0000-4000-8000-000000000008')) $$,
  'admin : signal levé');
select throws_ok(
  $$ select public.admin_clear_commission_review(
       (select id from public.partner_commissions where project_id = 'c7530000-0000-4000-8000-000000000008')) $$,
  '22023', 'Commission introuvable ou déjà traitée.', 'signal déjà levé : refusé');
select results_eq(
  $$ select (d ->> 'demandes')::int, (d ->> 'envoyees')::int, (d ->> 'acceptees')::int, (d ->> 'contact')::int,
            (d ->> 'signees')::int, (d ->> 'a_verifier')::int
     from (select public.admin_partner_funnel('c7520000-0000-4000-8000-000000000001') as d) s $$,
  $$ values (6, 6, 2, 1, 0, 0) $$,
  'entonnoir de P : 6 demandes, 2 acceptées (rendez-vous), 1 avec un vrai contact');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'partenaires.commission_verifiee'), 1,
  'levée du signal journalisée');
select is(app.validate_partner_commissions(), 1, 'prime de H reprise par la validation');
select ok((select status = 'en_attente' and validate_after > now() + interval '12 days'
           from public.partner_commissions where project_id = 'c7530000-0000-4000-8000-000000000008'),
  'visite à venir : validation repoussée après la visite');

-- ---------- Signalement de l'artisan ----------
select pg_temp.accepter('10', '11', '01', '+33600000760');
select is((select status from pg_temp.prime('10')), 'en_attente', 'demande de J : en attente');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select 'c7540000-0000-4000-8000-000000000010', r.project_id, r.id, r.artisan_id, r.particulier_id, 'Chantier'
from public.requests r where r.project_id = 'c7530000-0000-4000-8000-000000000010';
update public.chantiers set status = 'rdv_planifie' where id = 'c7540000-0000-4000-8000-000000000010';
select pg_temp.connecter('c7500000-0000-4000-8000-000000000012', 'artisan');
set local role authenticated;
select lives_ok(
  $$ select public.artisan_cancel_chantier('c7540000-0000-4000-8000-000000000010', 'Désolé, je ne peux pas.',
       'client_injoignable') $$,
  'artisan : annulation avec signalement');
select is_empty($$ select 1 from public.chantier_reports $$, 'artisan : signalements illisibles');
reset role;
select results_eq($$ select status, cancel_reason from pg_temp.prime('10') $$,
  $$ values ('annulee', 'Signalée par l''artisan : client injoignable') $$, 'signalement : prime annulée');
select results_eq(
  $$ select status::text, (details ->> 'motif') from public.chantiers c
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'annulation'
     where c.id = 'c7540000-0000-4000-8000-000000000010' $$,
  $$ values ('annule', 'Désolé, je ne peux pas.') $$,
  'chantier annulé, le journal ne garde que le message pour le client');
select pg_temp.connecter('c7500000-0000-4000-8000-000000000011', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.chantier_reports $$, 'client : signalements illisibles');
reset role;
select pg_temp.connecter('c7500000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq($$ select kind::text from public.chantier_reports $$, $$ values ('client_injoignable') $$,
  'équipe : signalement lisible');

-- ---------- Fiche partenaire : téléphone et plafond ----------
select throws_ok(
  $$ select public.admin_save_partner('notaire-q75', 'Office Exemple', '00000078000015', 'q75.notaire@example.test',
       'actif', null, null, null, 'c7520000-0000-4000-8000-000000000003', '0612', null) $$,
  '22023', 'Téléphone invalide : format international, par exemple +33612345678.', 'téléphone invalide : refusé');
select throws_ok(
  $$ select public.admin_save_partner('notaire-q75', 'Office Exemple', '00000078000015', 'q75.notaire@example.test',
       'actif', null, null, null, 'c7520000-0000-4000-8000-000000000003', null, 0) $$,
  '22023', 'Plafond mensuel : entre 1 et 10 000 demandes.', 'plafond nul : refusé');
select lives_ok(
  $$ select public.admin_save_partner('notaire-q75', 'Office Exemple', '00000078000015', 'q75.notaire@example.test',
       'actif', null, null, null, 'c7520000-0000-4000-8000-000000000003', '+33 6 12 34 56 78', 20) $$,
  'téléphone et plafond enregistrés');
reset role;
select results_eq(
  $$ select contact_phone, plafond_demandes_mois from public.partners where code = 'notaire-q75' $$,
  $$ values ('+33612345678', 20) $$, 'téléphone normalisé, plafond du partenaire');

select * from finish();
rollback;
