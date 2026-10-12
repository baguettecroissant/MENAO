-- F-56 (lot 4b, ADR 0050) : alertes de l'équipe MENAO. Nouveau ticket (admins et support),
-- dossier artisan envoyé en vérification (admins), ticket en retard (responsable, sinon toute
-- l'équipe ; une seule alerte par ticket).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1100000-0000-4000-8000-000000000001', 'alerte.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('c1200000-0000-4000-8000-000000000001', 'alerte.artisan@example.test', false, now(), '{"role":"artisan_en_attente"}', '{}'),
  ('c1300000-0000-4000-8000-000000000001', 'alerte.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1300000-0000-4000-8000-000000000002', 'alerte.support@example.test', false, now(), '{"role":"support"}', '{}');

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode)
values ('c1400000-0000-4000-8000-000000000001', 'c1200000-0000-4000-8000-000000000001', 'brouillon',
  'ALERTE EXEMPLE', 'communes');

-- ---------- Nouveau ticket : admins et support prévenus, pas les autres ----------
insert into public.tickets (id, type, user_id, contact_email, subject, message, due_at) values
  ('c1500000-0000-4000-8000-000000000001', 'contact', 'c1100000-0000-4000-8000-000000000001',
   'alerte.client@example.test', 'Alerte : question', 'Une question.', now() + interval '7 days');

select results_eq(
  $$ select user_id::text, data ->> 'type', data ->> 'objet' from public.notifications
     where type = 'equipe_nouveau_ticket' and data ->> 'ticket_id' = 'c1500000-0000-4000-8000-000000000001'
       and user_id in ('c1300000-0000-4000-8000-000000000001', 'c1300000-0000-4000-8000-000000000002')
     order by user_id $$,
  $$ values ('c1300000-0000-4000-8000-000000000001', 'contact', 'Alerte : question'),
            ('c1300000-0000-4000-8000-000000000002', 'contact', 'Alerte : question') $$,
  'nouveau ticket : admin et support prévenus');
select is(
  (select count(*)::int from public.notifications n
   join public.profiles p on p.user_id = n.user_id
   where n.type = 'equipe_nouveau_ticket' and n.data ->> 'ticket_id' = 'c1500000-0000-4000-8000-000000000001'
     and p.role not in ('admin', 'support')),
  0, 'nouveau ticket : personne hors de l''équipe');
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_nouveau_ticket' and data ->> 'ticket_id' = 'c1500000-0000-4000-8000-000000000001'),
  (select count(*)::int from public.profiles where role in ('admin', 'support')),
  'nouveau ticket : toute l''équipe');

-- ---------- Dossier envoyé en vérification : admins seulement ----------
update public.artisans set status = 'en_verification', submitted_at = now()
where id = 'c1400000-0000-4000-8000-000000000001';
select is(
  (select data ->> 'entreprise' from public.notifications
   where type = 'equipe_dossier_a_verifier' and user_id = 'c1300000-0000-4000-8000-000000000001'
     and data ->> 'artisan_id' = 'c1400000-0000-4000-8000-000000000001'),
  'ALERTE EXEMPLE', 'dossier à vérifier : admin prévenu');
select is_empty(
  $$ select 1 from public.notifications
     where type = 'equipe_dossier_a_verifier' and user_id = 'c1300000-0000-4000-8000-000000000002' $$,
  'dossier à vérifier : pas le support');
-- Une autre modification du dossier en vérification ne relance pas l'alerte.
update public.artisans set presentation = 'Peintre.' where id = 'c1400000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_dossier_a_verifier' and user_id = 'c1300000-0000-4000-8000-000000000001'
     and data ->> 'artisan_id' = 'c1400000-0000-4000-8000-000000000001'),
  1, 'une seule alerte par envoi');

-- ---------- Tickets en retard : une seule alerte ----------
insert into public.tickets (id, type, user_id, contact_email, subject, due_at, handled_by) values
  ('c1500000-0000-4000-8000-000000000002', 'contact', 'c1100000-0000-4000-8000-000000000001',
   'alerte.client@example.test', 'Alerte : en retard sans responsable', now() - interval '1 day', null),
  ('c1500000-0000-4000-8000-000000000003', 'contact', 'c1100000-0000-4000-8000-000000000001',
   'alerte.client@example.test', 'Alerte : en retard pris en charge', now() - interval '1 day',
   'c1300000-0000-4000-8000-000000000002');

select ok(app.notify_overdue_tickets() >= 2, 'tickets en retard signalés');
select results_eq(
  $$ select user_id::text from public.notifications
     where type = 'equipe_ticket_en_retard' and data ->> 'ticket_id' = 'c1500000-0000-4000-8000-000000000003' $$,
  $$ values ('c1300000-0000-4000-8000-000000000002') $$,
  'ticket pris en charge : son responsable seulement');
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_ticket_en_retard' and data ->> 'ticket_id' = 'c1500000-0000-4000-8000-000000000002'),
  (select count(*)::int from public.profiles where role in ('admin', 'support')),
  'ticket sans responsable : toute l''équipe');
select is(app.notify_overdue_tickets(), 0, 'pas de seconde alerte');

select * from finish();
rollback;
