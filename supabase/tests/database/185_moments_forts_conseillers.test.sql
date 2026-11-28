-- Moments forts des conseillers (F-196, lot 85, ADR 0396) : notification et célébration d'une prime,
-- artisans à relancer (fin d'essai, bloqué, lien pas ouvert) avec portable, report de 2 jours,
-- une notification par sujet et par semaine, abonnements web push et préférences, file push qui
-- inclut les abonnements web, réglages réservés aux admins. Données fictives (c185…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1850000-0000-4000-8000-000000000001', 'c185.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1850000-0000-4000-8000-000000000002', 'c185.sarah@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1850000-0000-4000-8000-000000000003', 'c185.ines@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1850000-0000-4000-8000-000000000004', 'c185.marc@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1850000-0000-4000-8000-000000000005', 'c185.paul@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.profiles (user_id, first_name, phone) values
  ('c1850000-0000-4000-8000-000000000004', 'Marc', '+33611111185'),
  ('c1850000-0000-4000-8000-000000000005', 'Paul', '+33622222185')
on conflict (user_id) do update set first_name = excluded.first_name, phone = excluded.phone;

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1851000-0000-4000-8000-000000000001', 'c1850000-0000-4000-8000-000000000002', 'sarah-185', 'Sarah Exemple', 'actif'),
  ('c1851000-0000-4000-8000-000000000002', 'c1850000-0000-4000-8000-000000000003', 'ines-185', 'Inès Exemple', 'actif');

-- Marc : dossier en brouillon, immobile depuis 5 jours. Paul : validé, en essai jusqu'à J+5.
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1852000-0000-4000-8000-000000000001', 'c1850000-0000-4000-8000-000000000004', '00000185900016', 'THERMO C185', 'brouillon'),
  ('c1852000-0000-4000-8000-000000000002', 'c1850000-0000-4000-8000-000000000005', '00000186700019', 'OLIVIERS C185', 'brouillon');
insert into public.commercial_attributions (commercial_id, artisan_id) values
  ('c1851000-0000-4000-8000-000000000001', 'c1852000-0000-4000-8000-000000000001'),
  ('c1851000-0000-4000-8000-000000000001', 'c1852000-0000-4000-8000-000000000002');
-- Sans déclencheurs, sinon updated_at serait remis à maintenant.
set local session_replication_role = replica;
update public.artisans set updated_at = now() - interval '5 days' where id = 'c1852000-0000-4000-8000-000000000001';
set local session_replication_role = origin;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c1852000-0000-4000-8000-000000000002', 'base', 'cus_c185', 'sub_c185', 'trialing', now() + interval '5 days');
-- Un lien préparé il y a 3 jours, jamais ouvert.
insert into public.prepared_signups (id, commercial_id, siret, company_name, draft, first_name, email, phone, created_at, expires_at)
values ('c1853000-0000-4000-8000-000000000001', 'c1851000-0000-4000-8000-000000000001', '00000185400012', 'PAILLON C185',
  '{}', 'Nadia', 'nadia@example.test', '+33633333185', now() - interval '3 days', now() + interval '4 days');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select ok((select relrowsecurity from pg_class where oid = 'public.web_push_subscriptions'::regclass), 'RLS : abonnements web');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_alert_settings'::regclass), 'RLS : réglages');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_alert_snoozes'::regclass), 'RLS : reports');

-- ---------- Prime : notification ----------
update public.artisans set status = 'valide' where id = 'c1852000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.notifications
  where user_id = 'c1850000-0000-4000-8000-000000000002' and type = 'conseiller_prime'), 1,
  'validation : notification de prime au conseiller');
select is((select data ->> 'entreprise' from public.notifications
  where user_id = 'c1850000-0000-4000-8000-000000000002' and type = 'conseiller_prime' limit 1), 'OLIVIERS C185',
  'notification : nom de l''entreprise');

-- ---------- Sarah : célébration et artisans à relancer ----------
select pg_temp.connecter('c1850000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is(public.commercial_next_celebration() ->> 'entreprise', 'OLIVIERS C185', 'prime à célébrer');
select lives_ok($$ select public.commercial_mark_celebrated((public.commercial_next_celebration() ->> 'id')::uuid) $$,
  'célébration vue');
select is(public.commercial_next_celebration(), null, 'plus rien à célébrer');
select is(
  array(select kind from public.commercial_artisan_alerts() order by kind),
  array['bloque', 'fin_essai', 'lien'], 'trois artisans à relancer');
select is((select phone from public.commercial_artisan_alerts() where kind = 'bloque'), '+33611111185',
  'bloqué : portable de l''artisan');
select is((select first_name from public.commercial_artisan_alerts() where kind = 'lien'), 'Nadia',
  'lien : prénom préparé');
select ok((select cardinality(steps) > 0 from public.commercial_artisan_alerts() where kind = 'bloque'),
  'bloqué : étapes manquantes');
select throws_ok($$ select public.commercial_snooze_alert('nimporte') $$, '22023', 'Rappel inconnu.', 'report : sujet inconnu');
select lives_ok($$ select public.commercial_snooze_alert('lien:c1853000-0000-4000-8000-000000000001') $$, 'report de 2 jours');
select is((select count(*)::int from public.commercial_artisan_alerts() where kind = 'lien'), 0, 'lien reporté : caché');
select throws_ok($$ select public.admin_save_commercial_alert_settings(3, 7, 2) $$, '42501', null, 'réglages réservés aux admins');

-- Abonnement web push et préférences.
select throws_ok($$ select public.register_web_push('http://pas-https', 'x', 'y') $$, '22023', 'Abonnement invalide.',
  'abonnement invalide refusé');
select lives_ok($$ select public.register_web_push('https://push.example.test/c185', repeat('k', 87), repeat('a', 22)) $$,
  'abonnement enregistré');
select is((select count(*)::int from public.web_push_subscriptions), 1, 'son abonnement');
select is((public.commercial_onboarding_state() ->> 'push')::boolean, true, 'Bien démarrer : notifications activées');
select lives_ok($$ select public.set_push_preference('conseiller_lien', false) $$, 'préférence enregistrée');
select throws_ok($$ select public.set_push_preference('autre', false) $$, '22023', 'Préférence inconnue.', 'type inconnu');
reset role;
select is((select notification_preferences #>> '{push,conseiller_lien}' from public.profiles
  where user_id = 'c1850000-0000-4000-8000-000000000002'), 'false', 'préférence gardée');

-- ---------- Inès ne voit rien de Sarah ----------
select pg_temp.connecter('c1850000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_artisan_alerts()), 0, 'aucun artisan d''un collègue');
select is((select count(*)::int from public.web_push_subscriptions), 0, 'abonnements d''un autre compte invisibles');
select is(public.commercial_next_celebration(), null, 'primes d''un collègue invisibles');
reset role;

-- ---------- Envoi du matin ----------
select lives_ok($$ select app.send_commercial_alerts() $$, 'envoi du matin');
select is((select count(*)::int from public.notifications where user_id = 'c1850000-0000-4000-8000-000000000002'
  and type in ('conseiller_relance', 'conseiller_fin_essai', 'conseiller_lien')), 2,
  'notifications : bloqué et fin d''essai (le lien est reporté)');
select lives_ok($$ select app.send_commercial_alerts() $$, 'second envoi');
select is((select count(*)::int from public.notifications where user_id = 'c1850000-0000-4000-8000-000000000002'
  and type in ('conseiller_relance', 'conseiller_fin_essai', 'conseiller_lien')), 2,
  'une seule notification par sujet et par semaine');
select is((select (data ->> 'jours')::int from public.notifications
  where user_id = 'c1850000-0000-4000-8000-000000000002' and type = 'conseiller_relance' limit 1), 5,
  'relance : jours sans avancer');

-- ---------- File push : abonnements web et préférences ----------
select is((select count(*)::int from public.notifications
  where user_id = 'c1850000-0000-4000-8000-000000000002' and push_status = 'a_envoyer'), 2,
  'les notifications envoyées après l''abonnement partent en push');
insert into public.notifications (user_id, type, data)
values ('c1850000-0000-4000-8000-000000000002', 'conseiller_lien', '{"entreprise": "PAILLON C185"}');
select is(
  (select jsonb_array_length(web) from public.claim_push_notifications(50) where type = 'conseiller_relance'),
  1, 'file push : l''abonnement web du conseiller');
select is((select push_status from public.notifications
  where user_id = 'c1850000-0000-4000-8000-000000000002' and type = 'conseiller_lien'), 'ignoree',
  'type désactivé : pas de push');

-- ---------- Admin ----------
select pg_temp.connecter('c1850000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_alert_settings(0, 7, 2) $$, '22023', 'Délais invalides.', 'délai invalide');
select lives_ok($$ select public.admin_save_commercial_alert_settings(4, 10, 3) $$, 'délais enregistrés');
select is((select bloque_jours from public.commercial_alert_settings), 4, 'délai du blocage changé');
reset role;

select * from finish();
rollback;
