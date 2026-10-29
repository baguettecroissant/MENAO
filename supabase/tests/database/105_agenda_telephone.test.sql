-- F-44 (ADR 0203) : plages occupées du calendrier du téléphone. Remplacement sur une période,
-- limites, oubli, et droits de chaque rôle (RLS, CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e2200000-0000-4000-8000-000000000001', 'tel.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e2200000-0000-4000-8000-000000000002', 'tel.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e2100000-0000-4000-8000-000000000001', 'tel.client@example.test', false, now(), '{}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('e2400000-0000-4000-8000-000000000001', 'e2200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN TEL', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true),
  ('e2400000-0000-4000-8000-000000000002', 'e2200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true);

select is((select relrowsecurity from pg_class where oid = 'public.artisan_external_busy'::regclass), true,
  'RLS activée');

-- ---------- Envoi par l'artisan ----------
select pg_temp.connecter('e2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is(
  public.replace_external_busy(now(), now() + interval '30 days', jsonb_build_array(
    jsonb_build_object('starts_at', now() + interval '1 day', 'ends_at', now() + interval '1 day 1 hour'),
    jsonb_build_object('starts_at', now() + interval '2 days', 'ends_at', now() + interval '2 days 2 hours'),
    -- Commence avant la période : coupée au début de la période.
    jsonb_build_object('starts_at', now() - interval '1 hour', 'ends_at', now() + interval '1 hour'),
    -- Vide ou inversée : ignorée.
    jsonb_build_object('starts_at', now() + interval '3 days', 'ends_at', now() + interval '3 days')
  )),
  3, 'artisan : trois plages enregistrées');
select is((select count(*)::int from public.artisan_external_busy), 3, 'artisan : ses plages visibles');
select is(
  public.replace_external_busy(now(), now() + interval '30 days', jsonb_build_array(
    jsonb_build_object('starts_at', now() + interval '5 days', 'ends_at', now() + interval '5 days 1 hour')
  )),
  1, 'nouvel envoi sur la même période');
select is((select count(*)::int from public.artisan_external_busy), 1,
  'les plages disparues du calendrier disparaissent de MENAO');
select throws_ok($$ select public.replace_external_busy(now(), now() + interval '200 days', '[]') $$,
  '22023', 'Période invalide', 'période de plus de 120 jours refusée');
select throws_ok($$ select public.replace_external_busy(now() + interval '1 day', now(), '[]') $$,
  '22023', 'Période invalide', 'période inversée refusée');
select throws_ok(
  $$ select public.replace_external_busy(now(), now() + interval '1 day',
       (select jsonb_agg(jsonb_build_object('starts_at', now(), 'ends_at', now() + interval '1 hour'))
        from generate_series(1, 501))) $$,
  '22023', 'Trop de plages', 'plus de 500 plages refusées');
select throws_ok($$ insert into public.artisan_external_busy (artisan_id, starts_at, ends_at)
    values ((select app.my_artisan_id()), now(), now() + interval '1 hour') $$,
  '42501', null, 'écriture directe refusée');
reset role;

-- ---------- Autres comptes ----------
select pg_temp.connecter('e2200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_external_busy), 0, 'autre artisan : rien de visible');
select lives_ok($$ select public.clear_external_busy() $$, 'autre artisan : oubli sans effet chez les autres');
reset role;
select is((select count(*)::int from public.artisan_external_busy), 1, 'plages du premier artisan conservées');

select pg_temp.connecter('e2100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.artisan_external_busy), 0, 'particulier : rien de visible');
select throws_ok($$ select public.replace_external_busy(now(), now() + interval '1 day', '[]') $$,
  '42501', 'Réservé aux artisans', 'particulier : pas d''envoi');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select * from public.artisan_external_busy', '42501', null, 'visiteur : aucun accès');
select throws_ok($$ select public.clear_external_busy() $$, '42501', null, 'visiteur : pas d''oubli');
reset role;

-- ---------- Oubli ----------
select pg_temp.connecter('e2200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.clear_external_busy() $$, 'artisan : « ne plus en tenir compte »');
select is((select count(*)::int from public.artisan_external_busy), 0, 'toutes ses plages oubliées');
reset role;

select * from finish();
rollback;
