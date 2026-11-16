-- Vidéos de l'aide (ADR 0349) : compartiment public, limité aux vidéos et aux aperçus, et fermé
-- en écriture aux visiteurs comme aux comptes connectés.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (select public from storage.buckets where id = 'aide-videos'),
  true,
  'compartiment aide-videos public'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'aide-videos'),
  array['video/mp4', 'image/jpeg'],
  'seulement des vidéos MP4 et des aperçus JPEG'
);

set local role anon;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('aide-videos', 'piege.mp4') $$,
  '42501',
  null,
  'un visiteur ne dépose rien'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e1660000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"artisan"}}', true);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('aide-videos', 'piege.mp4') $$,
  '42501',
  null,
  'un compte connecté ne dépose rien'
);
reset role;

select * from finish();
rollback;
