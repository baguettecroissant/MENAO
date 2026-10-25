-- Dépenses de l'artisan (F-62, ADR 0186) : création, modification, lignes, statut de paiement et
-- suppression par l'artisan lui-même ; chantier d'un autre artisan refusé ; rien de lisible pour un
-- autre artisan, le client du chantier, l'équipe MENAO ni un visiteur ; écriture directe interdite ;
-- pièces dans un espace privé. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('dd000000-0000-4000-8000-000000000001', 'depenses102.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd000000-0000-4000-8000-000000000002', 'depenses102.b@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd000000-0000-4000-8000-000000000003', 'depenses102.c@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('dd000000-0000-4000-8000-000000000004', 'depenses102.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('dd000000-0000-4000-8000-000000000005', 'depenses102.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('dd100000-0000-4000-8000-000000000001', 'dd000000-0000-4000-8000-000000000001', 'valide', 'DEPENSES A', 'communes'),
  ('dd100000-0000-4000-8000-000000000002', 'dd000000-0000-4000-8000-000000000002', 'valide', 'DEPENSES B', 'communes'),
  ('dd100000-0000-4000-8000-000000000003', 'dd000000-0000-4000-8000-000000000003', 'en_verification', 'DEPENSES C', 'communes');

-- Un chantier pour chaque artisan validé, avec le même client.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('dd200000-0000-4000-8000-00000000000' || a)::uuid, 'dd000000-0000-4000-8000-000000000004',
  'Projet ' || a, 'electricien', '06088', 'Nice'
from generate_series(1, 2) a;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, expires_at, status)
select ('dd300000-0000-4000-8000-00000000000' || a)::uuid, ('dd200000-0000-4000-8000-00000000000' || a)::uuid,
  ('dd100000-0000-4000-8000-00000000000' || a)::uuid, 'dd000000-0000-4000-8000-000000000004', '+33612345678',
  now() + interval '1 day', 'acceptee'
from generate_series(1, 2) a;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('dd400000-0000-4000-8000-00000000000' || a)::uuid, ('dd200000-0000-4000-8000-00000000000' || a)::uuid,
  ('dd300000-0000-4000-8000-00000000000' || a)::uuid, ('dd100000-0000-4000-8000-00000000000' || a)::uuid,
  'dd000000-0000-4000-8000-000000000004', 'Mise aux normes ' || a
from generate_series(1, 2) a;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Artisan A : création ----------
select pg_temp.connecter('dd000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$
  select set_config('depenses.carburant', public.artisan_save_expense(null, '{
    "title": "Carburant du véhicule", "kind": "ticket", "category": "carburant",
    "issued_on": "2026-10-20", "total_ht_cents": 7000, "total_tva_cents": 1400
  }', null)::text, true)
$$, 'dépense sans chantier (à classer)');
select lives_ok($$
  select set_config('depenses.tableau', public.artisan_save_expense(null, '{
    "title": "Tableau électrique et disjoncteurs", "supplier_name": "Négoce Exemple",
    "reference": "FA-2026-118", "kind": "facture", "category": "materiaux",
    "chantier_id": "dd400000-0000-4000-8000-000000000001", "issued_on": "2026-10-12",
    "due_on": "2026-11-11", "total_ht_cents": 43500, "total_tva_cents": 9135
  }', '[
    {"designation": "Tableau électrique 3 rangées", "reference": "TAB-3R", "quantity_milli": 1000,
     "unit": "u", "unit_price_ht_cents": 18990, "total_ht_cents": 18990},
    {"designation": "Disjoncteur 16 A", "reference": null, "quantity_milli": 12000, "unit": "u",
     "unit_price_ht_cents": 2043, "total_ht_cents": 24510}
  ]')::text, true)
$$, 'dépense rattachée à son chantier, avec ses lignes');

select results_eq($$
  select title, chantier_id, total_ttc_cents, kind::text, origin::text, paid_on
  from public.expenses order by issued_on
$$, $$ values
  ('Tableau électrique et disjoncteurs'::text, 'dd400000-0000-4000-8000-000000000001'::uuid, 52635::bigint,
   'facture'::text, 'manuelle'::text, null::date),
  ('Carburant du véhicule', null, 8400, 'ticket', 'manuelle', null)
$$, 'l''artisan lit ses dépenses ; le TTC est calculé');
select results_eq($$
  select position::int, designation, quantity_milli, unit::text from public.expense_lines order by position
$$, $$ values (1, 'Tableau électrique 3 rangées'::text, 1000, 'u'::text), (2, 'Disjoncteur 16 A', 12000, 'u') $$,
  'les lignes sont rangées dans l''ordre de la pièce');
reset role;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty('select 1 from public.expenses', 'un autre artisan ne voit pas les dépenses');
select is_empty('select 1 from public.expense_lines', 'ni leurs lignes');
reset role;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;

select throws_ok($$
  select public.artisan_save_expense(null, '{
    "title": "Chantier d''un autre", "issued_on": "2026-10-20", "total_ht_cents": 100, "total_tva_cents": 20,
    "chantier_id": "dd400000-0000-4000-8000-000000000002"
  }', null)
$$, '22023', 'chantier_inconnu', 'chantier d''un autre artisan refusé');
select throws_ok($$
  select public.artisan_save_expense(null, '{
    "title": "Montant négatif", "issued_on": "2026-10-20", "total_ht_cents": -100, "total_tva_cents": 0
  }', null)
$$, '23514', null, 'montant négatif refusé');
select throws_ok($$
  select public.artisan_save_expense(null, '{
    "title": "", "issued_on": "2026-10-20", "total_ht_cents": 100, "total_tva_cents": 0
  }', null)
$$, '23514', null, 'titre vide refusé');
select throws_ok($$
  select public.artisan_save_expense(null, '{
    "title": "Lignes", "issued_on": "2026-10-20", "total_ht_cents": 100, "total_tva_cents": 0
  }', '{"designation": "pas un tableau"}')
$$, '22023', 'lignes_invalides', 'lignes qui ne sont pas une liste refusées');

-- ---------- Artisan A : modification, paiement ----------
select lives_ok($$
  select public.artisan_save_expense(current_setting('depenses.tableau')::uuid, '{
    "title": "Tableau électrique", "supplier_name": "Négoce Exemple", "kind": "facture",
    "category": "materiaux", "chantier_id": "dd400000-0000-4000-8000-000000000001",
    "issued_on": "2026-10-12", "due_on": "2026-11-11", "total_ht_cents": 43500, "total_tva_cents": 9135
  }', null)
$$, 'modification de sa dépense');
select is((select title from public.expenses where id = current_setting('depenses.tableau')::uuid),
  'Tableau électrique', 'le titre est modifié');
select is((select count(*)::int from public.expense_lines), 2, 'sans nouvelles lignes, les lignes restent');
select lives_ok($$
  select public.artisan_save_expense(current_setting('depenses.tableau')::uuid, '{
    "title": "Tableau électrique", "kind": "facture", "issued_on": "2026-10-12",
    "total_ht_cents": 43500, "total_tva_cents": 9135
  }', '[]')
$$, 'modification avec une liste de lignes vide');
select is((select count(*)::int from public.expense_lines), 0, 'une liste vide retire les lignes');
select is((select chantier_id from public.expenses where id = current_setting('depenses.tableau')::uuid),
  null, 'la dépense repasse « à classer »');

select ok(public.artisan_set_expense_paid(current_setting('depenses.tableau')::uuid, '2026-10-30'),
  'marquée comme payée');
select is((select paid_on from public.expenses where id = current_setting('depenses.tableau')::uuid),
  '2026-10-30'::date, 'la date de paiement est gardée');
select ok(public.artisan_set_expense_paid(current_setting('depenses.tableau')::uuid, null),
  'marquée comme non payée');
select is((select paid_on from public.expenses where id = current_setting('depenses.tableau')::uuid),
  null, 'la date de paiement est retirée');

select throws_ok($$ insert into public.expenses (artisan_id, title, issued_on, total_ht_cents, total_tva_cents)
  values ('dd100000-0000-4000-8000-000000000001', 'Directe', '2026-10-20', 1, 0) $$,
  '42501', null, 'écriture directe dans expenses interdite');
select throws_ok($$ update public.expenses set total_ht_cents = 0 $$,
  '42501', null, 'modification directe interdite');
select throws_ok($$
  insert into storage.objects (bucket_id, name)
  values ('expense-documents', 'dd100000-0000-4000-8000-000000000001/x/piece.pdf')
$$, '42501', null, 'dépôt direct dans « expense-documents » interdit');
reset role;

-- ---------- Artisan B ----------
select pg_temp.connecter('dd000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$
  select public.artisan_save_expense(current_setting('depenses.carburant')::uuid, '{
    "title": "Pris", "issued_on": "2026-10-20", "total_ht_cents": 1, "total_tva_cents": 0
  }', null)
$$, 'P0002', 'depense_inconnue', 'il ne peut pas la modifier');
select ok(not public.artisan_set_expense_paid(current_setting('depenses.carburant')::uuid, '2026-10-30'),
  'ni la marquer comme payée');
select throws_ok($$ select public.artisan_delete_expense(current_setting('depenses.carburant')::uuid) $$,
  'P0002', 'depense_inconnue', 'ni la supprimer');
reset role;

-- ---------- Client du chantier, équipe MENAO, artisan en vérification, visiteur ----------
-- La dépense est rattachée de nouveau au chantier du client pour le contrôle.
update public.expenses set chantier_id = 'dd400000-0000-4000-8000-000000000001'
where id = current_setting('depenses.tableau')::uuid;
select pg_temp.connecter('dd000000-0000-4000-8000-000000000004', 'particulier');
set local role authenticated;
select is_empty('select 1 from public.expenses', 'le client du chantier ne voit pas les dépenses');
reset role;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000005', 'admin');
set local role authenticated;
select is_empty('select 1 from public.expenses', 'l''équipe MENAO ne lit pas les dépenses');
reset role;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000003', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$
  select public.artisan_save_expense(null, '{
    "title": "Avant validation", "issued_on": "2026-10-20", "total_ht_cents": 1, "total_tva_cents": 0
  }', null)
$$, '42501', 'acces_refuse', 'artisan en vérification : refusé');
reset role;

set local role anon;
select throws_ok($$ select public.artisan_delete_expense(gen_random_uuid()) $$,
  '42501', null, 'visiteur : refusé');
reset role;

-- ---------- Pièces et suppression ----------
insert into storage.objects (bucket_id, name) values
  ('expense-documents', 'dd100000-0000-4000-8000-000000000001/' || current_setting('depenses.tableau') || '/piece.pdf'),
  ('expense-documents', 'dd100000-0000-4000-8000-000000000002/autre/piece.pdf');
update public.expenses
set document_path = 'dd100000-0000-4000-8000-000000000001/' || current_setting('depenses.tableau') || '/piece.pdf',
  document_mime = 'application/pdf'
where id = current_setting('depenses.tableau')::uuid;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'expense-documents'), 1,
  'l''artisan voit ses pièces seulement');
select is(public.artisan_delete_expense(current_setting('depenses.tableau')::uuid),
  'dd100000-0000-4000-8000-000000000001/' || current_setting('depenses.tableau') || '/piece.pdf',
  'la suppression renvoie le chemin de la pièce');
select is(public.artisan_delete_expense(current_setting('depenses.carburant')::uuid), '',
  'sans pièce : chaîne vide');
select is_empty('select 1 from public.expenses', 'les dépenses sont supprimées');
reset role;

select pg_temp.connecter('dd000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'expense-documents'), 1,
  'un autre artisan voit les siennes seulement');
reset role;

select * from finish();
rollback;
