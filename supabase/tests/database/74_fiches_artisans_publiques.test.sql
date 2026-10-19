-- Fiches artisans publiques (F-61, ADR 0144) : adresse fixée à la validation (nom et commune,
-- sans accents, suffixe en cas de doublon, stable ensuite), lecture publique des seuls artisans
-- visibles, liste des fiches, case « Google » modifiable par l'artisan seul ; jamais la raison
-- sociale d'un artisan en diffusion partielle à l'INSEE. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c7400000-0000-4000-8000-00000000000' || n)::uuid, 'fiche74.' || n || '@example.test', false, now(),
  '{"role":"artisan"}', jsonb_build_object('first_name', 'Artisan ' || n)
from generate_series(1, 6) n;

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;

-- ---------- Texte en adresse ----------
select is(app.slugify('Électricité Côte d''Azur'), 'electricite-cote-d-azur', 'accents, apostrophe et espaces');
select is(app.slugify('  Œuvre & Cœur  '), 'oeuvre-coeur', 'ligatures et symboles');
select ok(app.slugify(' -- ') is null, 'texte vide : rien');

-- ---------- Adresse fixée à la validation ----------
-- A et B : même nom, même commune ; C : validé d'emblée, sans zone ; D : dossier en cours ;
-- E : validé sans abonnement (invisible).
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode, assujetti_tva,
  connect_charges_enabled, stripe_account_id) values
  ('c7410000-0000-4000-8000-000000000001', 'c7400000-0000-4000-8000-000000000001', 'en_verification',
   'SARL EXEMPLE UN', 'Électricité Côte d''Azur', 'communes', true, true, 'acct_fiche74_1'),
  ('c7410000-0000-4000-8000-000000000002', 'c7400000-0000-4000-8000-000000000002', 'en_verification',
   'SARL EXEMPLE DEUX', 'Électricité Côte d''Azur', 'communes', true, true, 'acct_fiche74_2'),
  ('c7410000-0000-4000-8000-000000000003', 'c7400000-0000-4000-8000-000000000003', 'valide',
   'PLOMBERIE NICE FICHE', null, 'communes', true, true, 'acct_fiche74_3'),
  ('c7410000-0000-4000-8000-000000000004', 'c7400000-0000-4000-8000-000000000004', 'en_verification',
   'DOSSIER EN COURS', null, 'communes', true, false, null),
  ('c7410000-0000-4000-8000-000000000005', 'c7400000-0000-4000-8000-000000000005', 'valide',
   'SANS ABONNEMENT', null, 'communes', true, true, 'acct_fiche74_5');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('c7410000-0000-4000-8000-000000000001', '06004', 'Antibes'), ('c7410000-0000-4000-8000-000000000001', '06088', 'Nice'),
  ('c7410000-0000-4000-8000-000000000002', '06004', 'Antibes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c7410000-0000-4000-8000-000000000001', 'base', 'cus_fiche74_1', 'sub_fiche74_1', 'trialing', now() + interval '30 days'),
  ('c7410000-0000-4000-8000-000000000002', 'base', 'cus_fiche74_2', 'sub_fiche74_2', 'trialing', now() + interval '30 days'),
  ('c7410000-0000-4000-8000-000000000003', 'base', 'cus_fiche74_3', 'sub_fiche74_3', 'trialing', now() + interval '30 days');

-- F : diffusion partielle à l'INSEE, sans nom commercial (la raison sociale est son nom).
insert into public.artisans (id, user_id, status, raison_sociale, sirene_partial, zone_mode, assujetti_tva,
  connect_charges_enabled, stripe_account_id) values
  ('c7410000-0000-4000-8000-000000000006', 'c7400000-0000-4000-8000-000000000006', 'en_verification',
   'NOM PRENOM EXEMPLE', true, 'communes', true, true, 'acct_fiche74_6');
insert into public.artisan_trades (artisan_id, trade_code) values ('c7410000-0000-4000-8000-000000000006', 'plombier');
insert into public.artisan_zones (artisan_id, code_insee, nom) values ('c7410000-0000-4000-8000-000000000006', '06088', 'Nice');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c7410000-0000-4000-8000-000000000006', 'base', 'cus_fiche74_6', 'sub_fiche74_6', 'trialing', now() + interval '30 days');
update public.artisans set status = 'valide' where id = 'c7410000-0000-4000-8000-000000000006';

update public.artisans set status = 'valide' where id = 'c7410000-0000-4000-8000-000000000001';
update public.artisans set status = 'valide' where id = 'c7410000-0000-4000-8000-000000000002';

select results_eq(
  $$ select slug from public.artisans where id::text like 'c7410000-%' order by id $$,
  $$ values ('electricite-cote-d-azur-antibes'), ('electricite-cote-d-azur-antibes-2'),
            ('plomberie-nice-fiche'), (null::text), ('sans-abonnement'), ('plombier-nice') $$,
  'adresse : nom et première commune, suffixe en cas de doublon, rien avant la validation, métier si diffusion partielle');

update public.artisans set nom_commercial = 'Nouveau nom', status = 'suspendu', suspension_reason = 'decision_admin'
where id = 'c7410000-0000-4000-8000-000000000003';
update public.artisans set status = 'valide', suspension_reason = null where id = 'c7410000-0000-4000-8000-000000000003';
select is((select slug from public.artisans where id = 'c7410000-0000-4000-8000-000000000003'),
  'plomberie-nice-fiche', 'adresse stable après un changement de nom, une suspension et un rétablissement');

-- ---------- Lecture publique ----------
set local role anon;
select is(public.artisan_public_page(' Electricite-Cote-D-Azur-Antibes ') ->> 'id',
  'c7410000-0000-4000-8000-000000000001', 'visiteur : fiche lue par son adresse');
select is(public.artisan_public_page('electricite-cote-d-azur-antibes') ->> 'indexable', 'true',
  'fiche indexable par défaut');
select is(public.artisan_public_page('electricite-cote-d-azur-antibes') ->> 'public_company',
  'Électricité Côte d''Azur', 'nom d''entreprise publiable : nom commercial');
select ok(public.artisan_public_page('plombier-nice') ->> 'public_company' is null,
  'diffusion partielle : jamais la raison sociale');
select ok(public.artisan_public_page('sans-abonnement') is null, 'artisan invisible : pas de fiche');
select ok(public.artisan_public_page('inconnue') is null, 'adresse inconnue : rien');
select ok(public.artisan_public_page('electricite-cote-d-azur-antibes') -> 'siret' is null,
  'jamais de SIRET');
select results_eq(
  $$ select slug from public.public_artisan_pages() where slug like any (array['electricite-cote%', 'plomberie-nice-fiche', 'sans-abonnement']) $$,
  $$ values ('electricite-cote-d-azur-antibes'), ('electricite-cote-d-azur-antibes-2'), ('plomberie-nice-fiche') $$,
  'liste des fiches : artisans visibles seulement');
select throws_ok($$ select slug from public.artisans $$, '42501', null, 'visiteur : table fermée');
reset role;

-- ---------- Case « Google » : l'artisan seul ----------
select pg_temp.connecter('c7400000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok(
  $$ update public.artisans set indexable = false where id = 'c7410000-0000-4000-8000-000000000001' $$,
  'artisan : retire sa fiche de Google');
select throws_ok(
  $$ update public.artisans set slug = 'autre-adresse' where id = 'c7410000-0000-4000-8000-000000000001' $$,
  '42501', null, 'artisan : adresse non modifiable');
update public.artisans set indexable = false where id = 'c7410000-0000-4000-8000-000000000002';
reset role;
select results_eq(
  $$ select indexable from public.public_artisan_pages() where slug like 'electricite-cote%' order by slug $$,
  $$ values (false), (true) $$,
  'choix enregistré pour sa fiche, sans effet sur celle d''un autre artisan');

select * from finish();
rollback;
