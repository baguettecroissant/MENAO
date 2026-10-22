-- « Invitez votre artisan de confiance » (ADR 0162) : invitation par un particulier connecté
-- (ticket pour l'équipe, consigne en note interne), règles de saisie, 5 invitations sur 30 jours,
-- pas de doublon ; artisan validé au même téléphone ou e-mail → « inscrit » et note sur le ticket ;
-- coordonnées effacées après 12 mois. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8500000-0000-4000-8000-000000000001', 'lot85.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e8500000-0000-4000-8000-000000000002', 'lot85.autre@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e8500000-0000-4000-8000-000000000003', 'lot85.elec@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e8500000-0000-4000-8000-000000000004', 'lot85.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
update public.profiles set phone = '+33611111111' where user_id = 'e8500000-0000-4000-8000-000000000003';
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e8510000-0000-4000-8000-000000000003', 'e8500000-0000-4000-8000-000000000003', 'brouillon', 'ELEC 85', 'communes');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Invitation ----------
select pg_temp.connecter('e8500000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.invite_artisan('Élec 85', 'Jean', '+33611111111', '', 'electricien', 'Nice', 'Très soigneux') $$,
  'un particulier invite un artisan');
select results_eq(
  $$ select company, phone, email, trade_code, status::text from public.artisan_invitations $$,
  $$ values ('Élec 85', '+33611111111', null::text, 'electricien', 'envoyee') $$,
  'le particulier voit son invitation');
select throws_ok(
  $$ select public.invite_artisan('Élec 85', '', '+33611111111', '', '', '', '') $$,
  '22023', 'Vous avez déjà invité cet artisan : l''équipe MENAO s''en occupe.', 'pas de doublon');
select throws_ok($$ select public.invite_artisan('Carrelage 85', '', '', '', '', '', '') $$,
  '22023', 'Indiquez le téléphone ou l''e-mail de l''artisan.', 'téléphone ou e-mail obligatoire');
select throws_ok($$ select public.invite_artisan('Carrelage 85', '', '0611', '', '', '', '') $$,
  '22023', 'Numéro de téléphone invalide.', 'téléphone au format international');
select throws_ok($$ select public.invite_artisan('Carrelage 85', '', '', 'pas-un-email', '', '', '') $$,
  '22023', 'Adresse e-mail invalide.', 'e-mail vérifié');
select throws_ok($$ select public.invite_artisan('Carrelage 85', '', '', 'a@b.fr', 'inconnu', '', '') $$,
  '22023', 'Métier inconnu.', 'métier du référentiel');
select throws_ok($$ select public.invite_artisan('', '', '', 'a@b.fr', '', '', '') $$,
  '22023', 'Indiquez le nom de l''artisan ou de son entreprise.', 'nom obligatoire');
select lives_ok($$ select public.invite_artisan('Maçon ' || n, '', '', 'macon' || n || '@example.test', '', '', '')
                   from generate_series(1, 4) n $$, 'quatre autres invitations');
select throws_ok($$ select public.invite_artisan('Peintre 85', '', '', 'peintre@example.test', '', '', '') $$,
  '22023', 'Vous avez déjà invité 5 artisans ce mois-ci : merci ! Réessayez un peu plus tard.',
  '5 invitations au plus sur 30 jours');
select throws_ok($$ insert into public.artisan_invitations (particulier_id, company, email)
                    values (auth.uid(), 'Direct', 'direct@example.test') $$,
  '42501', null, 'pas d''écriture directe');
select pg_temp.connecter('e8500000-0000-4000-8000-000000000002', 'particulier');
select is_empty($$ select 1 from public.artisan_invitations $$, 'un autre particulier ne voit rien');
select pg_temp.connecter('e8500000-0000-4000-8000-000000000004', 'artisan');
select throws_ok($$ select public.invite_artisan('Élec 86', '', '+33622222222', '', '', '', '') $$,
  '42501', null, 'réservé aux particuliers');
reset role;

-- Ticket pour l'équipe : ce que le client a saisi, consigne en note interne.
select results_eq(
  $$ select t.type::text, t.contact_email, t.subject from public.tickets t
     join public.artisan_invitations i on i.ticket_id = t.id where i.company = 'Élec 85' $$,
  $$ values ('invitation_artisan', 'lot85.client@example.test', 'Invitation d''un artisan : Élec 85') $$,
  'ticket « Invitation d''un artisan »');
select matches(
  (select t.message from public.tickets t join public.artisan_invitations i on i.ticket_id = t.id
   where i.company = 'Élec 85'),
  '^Entreprise : Élec 85\nContact : Jean\nTéléphone : \+33611111111\nMétier : Électricien\nVille : Nice\nMessage du client : Très soigneux$',
  'message : coordonnées et mot du client');
select is(
  (select count(*)::int from public.ticket_notes n join public.artisan_invitations i on i.ticket_id = n.ticket_id
   where i.company = 'Élec 85'),
  1, 'consigne de rappel en note interne');

-- ---------- Artisan validé au même téléphone ----------
update public.artisans set status = 'valide' where id = 'e8510000-0000-4000-8000-000000000003';
select results_eq(
  $$ select status::text, artisan_id, joined_at is not null from public.artisan_invitations where company = 'Élec 85' $$,
  $$ values ('inscrit', 'e8510000-0000-4000-8000-000000000003'::uuid, true) $$,
  'invitation « inscrit »');
select ok(
  (select bool_or(n.body like 'L''artisan invité a rejoint MENAO (ELEC 85)%')
   from public.ticket_notes n join public.artisan_invitations i on i.ticket_id = n.ticket_id
   where i.company = 'Élec 85'),
  'note pour l''équipe : cadeau de remerciement à prévoir');
select is((select count(*)::int from public.artisan_invitations where status = 'envoyee'), 4,
  'les autres invitations restent ouvertes');

-- ---------- Effacement après 12 mois ----------
update public.artisan_invitations set created_at = now() - interval '13 months' where company = 'Maçon 1';
update public.artisan_invitations set created_at = now() - interval '13 months' where company = 'Élec 85';
select is(app.purge_artisan_invitations(), 1, 'invitation restée sans suite effacée, pas celle de l''inscrit');
select is_empty($$ select 1 from public.artisan_invitations where company = 'Maçon 1' $$, 'coordonnées effacées');
select is(
  (select count(*)::int from public.tickets
   where type = 'invitation_artisan' and message like '%coordonnées effacées%' and subject = 'Invitation d''un artisan'),
  1, 'ticket nettoyé aussi');

select * from finish();
rollback;
