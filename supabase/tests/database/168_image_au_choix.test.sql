-- Image au choix et facultative (F-165, lot 64, ADR 0355) : sans image, l'étape « profil » ne
-- manque plus dès que la présentation est écrite ; la fiche publique dit si l'image est un logo.
-- Données fictives (identifiants e168…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1680000-0000-4000-8000-000000000001', 'image168.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva, presentation) values
  ('e1681000-0000-4000-8000-000000000001', 'e1680000-0000-4000-8000-000000000001', 'brouillon', 'IMAGE 168', 'communes', true, null);

select ok('profil' = any(app.onboarding_missing_steps('e1681000-0000-4000-8000-000000000001')),
  'sans présentation : « profil » manque');

update public.artisans set presentation = repeat('Présentation fictive. ', 6)
where id = 'e1681000-0000-4000-8000-000000000001';
select is((select avatar_path from public.profiles where user_id = 'e1680000-0000-4000-8000-000000000001'),
  null, 'aucune image déposée');
select ok(not ('profil' = any(app.onboarding_missing_steps('e1681000-0000-4000-8000-000000000001'))),
  'présentation écrite, sans image : « profil » ne manque plus');

select is(app.artisan_profile_json('e1681000-0000-4000-8000-000000000001') -> 'image_logo', 'false'::jsonb,
  'fiche publique : pas un logo par défaut');
update public.artisans set image_logo = true where id = 'e1681000-0000-4000-8000-000000000001';
select is(app.artisan_profile_json('e1681000-0000-4000-8000-000000000001') -> 'image_logo', 'true'::jsonb,
  'fiche publique : image signalée comme logo');

select * from finish();
rollback;
