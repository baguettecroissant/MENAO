-- Candidature des commerciaux avec CV (F-183, lot 79, ADR 0382) : CV obligatoire rangé dans le
-- dossier du compte qui candidate, une seule fois ; LinkedIn facultatif et contrôlé ; e-mail de
-- bonne réception ; CV lisibles par les administrateurs seulement ; CV d'une candidature supprimée
-- mis en file, vidée par un administrateur. Données fictives (example.test, 06 fictifs).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1770000-0000-4000-8000-000000000001', 'cv177.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1770000-0000-4000-8000-000000000002', 'cv177.commercial@example.test', false, now(), '{"role":"commercial"}', '{}');
insert into auth.users (id, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('e1770000-0000-4000-8000-0000000000a1', true, '{}', '{}'),
  ('e1770000-0000-4000-8000-0000000000a2', true, '{}', '{}');
insert into storage.objects (bucket_id, name) values
  ('candidate-cvs', 'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf'),
  ('candidate-cvs', 'e1770000-0000-4000-8000-0000000000a2/e1771000-0000-4000-8000-000000000002.pdf');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2', anonyme boolean default false)
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'is_anonymous', anonyme,
    'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

create function pg_temp.candidater(email text, phone text, cv text, linkedin text default null)
returns uuid language sql as $$
  select public.apply_as_commercial('Julie', 'Exemple', email, phone, 'Nice', 'auto_entrepreneur',
    true, 'plus_2_ans', 'temps_partiel', 'linkedin', null, true, cv, linkedin);
$$;
grant execute on function pg_temp.candidater(text, text, text, text) to authenticated;

-- Session anonyme du premier candidat.
select pg_temp.connecter('e1770000-0000-4000-8000-0000000000a1', '', 'aal1', true);
set local role authenticated;
select throws_ok($$ select pg_temp.candidater('julie177@example.test', '+33600001771', null) $$,
  '22023', 'Ajoutez votre CV en PDF.', 'sans CV : refusé');
select throws_ok($$ select pg_temp.candidater('julie177@example.test', '+33600001771',
  'e1770000-0000-4000-8000-0000000000a2/e1771000-0000-4000-8000-000000000002.pdf') $$,
  '22023', 'Ajoutez votre CV en PDF.', 'CV du dossier d''un autre compte : refusé');
select throws_ok($$ select pg_temp.candidater('julie177@example.test', '+33600001771',
  'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-0000000000ff.pdf') $$,
  '22023', 'Ajoutez votre CV en PDF.', 'CV absent du stockage : refusé');
select throws_ok($$ select pg_temp.candidater('julie177@example.test', '+33600001771',
  'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf',
  'https://exemple.test/julie') $$,
  '22023', null, 'lien qui n''est pas LinkedIn : refusé');
select isnt(pg_temp.candidater('julie177@example.test', '+33600001771',
  'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf',
  ' https://www.linkedin.com/in/julie-exemple '), null, 'CV et LinkedIn : candidature reçue');
select throws_ok($$ select pg_temp.candidater('karim177@example.test', '+33600001772',
  'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf') $$,
  '22023', 'Ajoutez votre CV en PDF.', 'un CV ne sert qu''une fois');
select is((select count(*)::int from storage.objects where bucket_id = 'candidate-cvs'), 0,
  'candidat : ne lit aucun CV');
reset role;

select is((select cv_path || ' ' || linkedin_url from public.commercial_candidates where email = 'julie177@example.test'),
  'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf https://www.linkedin.com/in/julie-exemple',
  'CV et lien enregistrés, nettoyés');
select is((select count(*)::int from public.notifications n join public.commercial_candidates c on c.id = n.candidate_id
  where c.email = 'julie177@example.test' and n.type = 'recrutement_recue'), 1, 'e-mail de bonne réception');

-- Lecture des CV : administrateurs seulement.
select pg_temp.connecter('e1770000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'candidate-cvs'), 0,
  'commercial : ne lit aucun CV');
select throws_ok($$ select public.admin_cv_deletions_done(array['x']) $$, '42501', null,
  'commercial : ne vide pas la file');
reset role;
select pg_temp.connecter('e1770000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'candidate-cvs'
  and name like 'e1770000-%'), 2, 'admin : lit les CV');
reset role;

-- Candidature supprimée : son CV entre dans la file ; l'admin la vide après l'effacement.
delete from public.commercial_candidates where email = 'julie177@example.test';
select is((select count(*)::int from public.candidate_cv_deletions
  where cv_path = 'e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf'), 1,
  'CV d''une candidature supprimée : en file');
select pg_temp.connecter('e1770000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is((select count(*)::int from public.candidate_cv_deletions where cv_path like 'e1770000-%'), 1,
  'admin : lit la file');
select lives_ok($$ select public.admin_cv_deletions_done(
  array['e1770000-0000-4000-8000-0000000000a1/e1771000-0000-4000-8000-000000000001.pdf']) $$,
  'admin : file vidée après effacement');
reset role;
select is((select count(*)::int from public.candidate_cv_deletions where cv_path like 'e1770000-%'), 0,
  'file vide');

select * from finish();
rollback;
