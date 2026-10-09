-- Données FICTIVES de développement local (jamais de données réelles, jamais appliqué en production).
-- Mot de passe commun des comptes : « menao-local-dev-only » (local uniquement).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('menao-local-dev-only', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u.role),
  jsonb_build_object(
    'first_name', u.first_name, 'last_name', u.last_name,
    'legal', jsonb_build_object('cgu', '2026-10-09-brouillon', 'confidentialite', '2026-10-09-brouillon')
  ),
  now(), now(), '', '', '', '', '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'particulier@example.test', 'particulier', 'Camille', 'Exemple'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'support@example.test', 'support', 'Sacha', 'Support'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'admin@example.test', 'admin', 'Alex', 'Admin')
) as u (id, email, role, first_name, last_name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users as u
where u.email like '%@example.test';
