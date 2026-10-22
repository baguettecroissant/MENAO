-- Réseau du parrain (ADR 0161) : « Artisans partenaires » et « Recommandé par » sur la fiche
-- (artisans visibles, parrainages non annulés), suivi de chaque filleul, propositions de parrainer
-- (premier devis signé, premier paiement, avis 5 étoiles ; une au plus tous les 7 jours, artisans
-- validés seulement). Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8400000-0000-4000-8000-000000000001', 'lot84.parrain@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e8400000-0000-4000-8000-000000000002', 'lot84.elec@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e8400000-0000-4000-8000-000000000003', 'lot84.brouillon@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e8400000-0000-4000-8000-000000000004', 'lot84.annule@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e8400000-0000-4000-8000-000000000009', 'lot84.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('e8410000-0000-4000-8000-000000000001', 'e8400000-0000-4000-8000-000000000001', 'valide', 'PLOMB 84', 'communes', true),
  ('e8410000-0000-4000-8000-000000000002', 'e8400000-0000-4000-8000-000000000002', 'valide', 'ELEC 84', 'communes', true),
  ('e8410000-0000-4000-8000-000000000003', 'e8400000-0000-4000-8000-000000000003', 'brouillon', 'BROUILLON 84', 'communes', false),
  ('e8410000-0000-4000-8000-000000000004', 'e8400000-0000-4000-8000-000000000004', 'valide', 'ANNULE 84', 'communes', true);
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('e8410000-0000-4000-8000-000000000001', 'cus_l84_1', 'sub_l84_1', 'active'),
  ('e8410000-0000-4000-8000-000000000002', 'cus_l84_2', 'sub_l84_2', 'trialing'),
  ('e8410000-0000-4000-8000-000000000004', 'cus_l84_4', 'sub_l84_4', 'active');
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e8410000-0000-4000-8000-000000000001', 'plombier'),
  ('e8410000-0000-4000-8000-000000000002', 'electricien');
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id, status, created_at) values
  ('e8420000-0000-4000-8000-000000000002', 'e8410000-0000-4000-8000-000000000001', 'e8410000-0000-4000-8000-000000000002', 'en_attente', now() - interval '3 days'),
  ('e8420000-0000-4000-8000-000000000003', 'e8410000-0000-4000-8000-000000000001', 'e8410000-0000-4000-8000-000000000003', 'en_attente', now() - interval '2 days'),
  ('e8420000-0000-4000-8000-000000000004', 'e8410000-0000-4000-8000-000000000001', 'e8410000-0000-4000-8000-000000000004', 'annule', now() - interval '1 day');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.suggestions(p_user uuid) returns text[] language sql as $$
  select coalesce(array_agg(data ->> 'moment' order by created_at), '{}')
  from public.notifications where type = 'parrainage_suggestion' and user_id = p_user
$$;

-- ---------- Fiche : artisans partenaires et « Recommandé par » ----------
select results_eq(
  $$ select p ->> 'name', p ->> 'trade', p ->> 'slug' is not null
     from jsonb_array_elements(app.artisan_profile_json('e8410000-0000-4000-8000-000000000001') -> 'partners') p $$,
  $$ values ('ELEC 84', 'Électricien', true) $$,
  'fiche du parrain : le filleul visible seulement (ni dossier en cours, ni parrainage annulé)');
select is(app.artisan_profile_json('e8410000-0000-4000-8000-000000000002') -> 'recommended_by' ->> 'name', 'PLOMB 84',
  'fiche du filleul : « Recommandé par » son parrain');
select is(app.artisan_profile_json('e8410000-0000-4000-8000-000000000004') -> 'recommended_by', 'null'::jsonb,
  'parrainage annulé : pas de « Recommandé par »');
update public.subscriptions set status = 'canceled' where stripe_subscription_id = 'sub_l84_1';
select is(app.artisan_profile_json('e8410000-0000-4000-8000-000000000002') -> 'recommended_by', 'null'::jsonb,
  'parrain plus visible : mention retirée');
update public.subscriptions set status = 'active' where stripe_subscription_id = 'sub_l84_1';

-- ---------- Suivi de chaque filleul ----------
select pg_temp.connecter('e8400000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq(
  $$ select nom, etape from public.my_referrals() $$,
  $$ values ('ANNULE 84', 'annule'), ('BROUILLON 84', 'inscription'), ('ELEC 84', 'valide') $$,
  'filleuls du parrain, les plus récents d''abord, avec leur étape');
reset role;
update public.artisan_referrals set status = 'recompense', rewarded_at = now()
where id = 'e8420000-0000-4000-8000-000000000002';
select pg_temp.connecter('e8400000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select etape from public.my_referrals() where nom = 'ELEC 84'), 'abonne', 'filleul devenu abonné');
select pg_temp.connecter('e8400000-0000-4000-8000-000000000002', 'artisan');
select is_empty($$ select 1 from public.my_referrals() $$, 'un filleul ne voit pas les filleuls de son parrain');
reset role;
set local role anon;
select throws_ok($$ select * from public.my_referrals() $$, '42501', null, 'réservé aux comptes connectés');
reset role;

-- ---------- Propositions de parrainer ----------
select is(app.notification_category('parrainage_suggestion'), 'rappels', 'rappel facultatif (préférences)');

-- Premier devis signé du parrain.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('e8430000-0000-4000-8000-00000000000' || n)::uuid, 'e8400000-0000-4000-8000-000000000009', 'Projet ' || n,
  'plombier', '06088', 'Nice'
from generate_series(1, 4) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status)
select ('e8440000-0000-4000-8000-00000000000' || n)::uuid, ('e8430000-0000-4000-8000-00000000000' || n)::uuid,
  case when n <= 2 then 'e8410000-0000-4000-8000-000000000001' else 'e8410000-0000-4000-8000-000000000004' end::uuid,
  'e8400000-0000-4000-8000-000000000009', '+33612345678', 'acceptee'
from generate_series(1, 4) n;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('e8450000-0000-4000-8000-00000000000' || n)::uuid, r.project_id, r.id, r.artisan_id, r.particulier_id, 'Chantier'
from generate_series(1, 4) n
join public.requests r on r.id = ('e8440000-0000-4000-8000-00000000000' || n)::uuid;
insert into public.quotes (chantier_id, artisan_id, status, numero, sent_at, valid_until, start_date,
  duration_days, payment_schedule, document)
select ('e8450000-0000-4000-8000-00000000000' || n)::uuid, 'e8410000-0000-4000-8000-000000000001', 'envoye',
  'DEVIS-2026-840' || n, now(), current_date + 30, current_date + 40, 5, '[]'::jsonb, '{}'::jsonb
from generate_series(1, 2) n;

update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where numero = 'DEVIS-2026-8401';
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000001'), array['premier_chantier'],
  'premier devis signé : proposition de parrainer');
delete from public.notifications where type = 'parrainage_suggestion';
update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where numero = 'DEVIS-2026-8402';
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000001'), '{}'::text[],
  'deuxième devis signé : rien');

-- Premier paiement de l'abonnement (début du 3e mois).
update public.subscriptions set first_paid_at = now() where stripe_subscription_id = 'sub_l84_2';
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000002'), array['trois_mois'],
  'premier paiement : proposition de parrainer');
update public.subscriptions set first_paid_at = now() - interval '1 day' where stripe_subscription_id = 'sub_l84_2';
select is(cardinality(pg_temp.suggestions('e8400000-0000-4000-8000-000000000002')), 1,
  'date de premier paiement corrigée : rien de plus');

-- Avis publiés : 4 étoiles (rien), puis 5 étoiles.
insert into public.reviews (chantier_id, artisan_id, particulier_id, author_name, quality, delays, communication,
  value_for_money, score, comment, experience_on) values
  ('e8450000-0000-4000-8000-000000000003', 'e8410000-0000-4000-8000-000000000004', 'e8400000-0000-4000-8000-000000000009',
   'Camille D.', 85, 85, 85, 'convenable', 85, 'Travail soigné et dans les temps, artisan à l''écoute et de bon conseil.', current_date);
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000004'), '{}'::text[], 'avis 4 étoiles : rien');
insert into public.reviews (chantier_id, artisan_id, particulier_id, author_name, quality, delays, communication,
  value_for_money, score, comment, experience_on) values
  ('e8450000-0000-4000-8000-000000000004', 'e8410000-0000-4000-8000-000000000004', 'e8400000-0000-4000-8000-000000000009',
   'Camille D.', 95, 95, 95, 'excellent', 95, 'Excellent travail, très propre, délais tenus, je recommande vivement.', current_date);
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000004'), array['avis_5_etoiles'],
  'avis 5 étoiles : proposition de parrainer');

-- Une proposition au plus tous les 7 jours ; artisans validés seulement.
select app.suggest_referral('e8410000-0000-4000-8000-000000000004', 'trois_mois');
select is(cardinality(pg_temp.suggestions('e8400000-0000-4000-8000-000000000004')), 1, 'moins de 7 jours : rien');
update public.notifications set created_at = now() - interval '8 days'
where type = 'parrainage_suggestion' and user_id = 'e8400000-0000-4000-8000-000000000004';
select app.suggest_referral('e8410000-0000-4000-8000-000000000004', 'trois_mois');
select is(cardinality(pg_temp.suggestions('e8400000-0000-4000-8000-000000000004')), 2, '7 jours plus tard : nouvelle proposition');
select app.suggest_referral('e8410000-0000-4000-8000-000000000003', 'trois_mois');
select is(pg_temp.suggestions('e8400000-0000-4000-8000-000000000003'), '{}'::text[], 'dossier pas validé : rien');

select * from finish();
rollback;
