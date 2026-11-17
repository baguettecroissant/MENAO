-- Formules à jour (F-172, ADR 0363) : les fonctions ajoutées depuis fin octobre entrent dans le
-- comparatif, et celles réservées à Premium et Entreprise le sont vraiment.
-- - plans.limites.agents : import_catalogue et prix_a_jour (Premium et Entreprise) ;
-- - import de catalogue, prix à jour d'après les factures et hausse des prix : refusés sans ce
--   droit, par la base (les écrans ne font que le dire) ;
-- - comparatif (plan_features) : sept lignes.
-- Décision de l'utilisateur du 17/11/2026 (proposition « FormulesProposition », lot 69).

update public.plans
set limites = jsonb_set(
  jsonb_set(coalesce(limites, '{}'::jsonb), '{agents,import_catalogue}',
    to_jsonb(code in ('premium', 'entreprise')), true),
  '{agents,prix_a_jour}', to_jsonb(code in ('premium', 'entreprise')), true);

-- Artisan dont la formule comprend ce droit ; sinon refus expliqué. Sans formule en cours, les
-- droits de Base s'appliquent (app.artisan_agents).
create function app.plan_right_artisan(p_artisan_id uuid, p_right text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_artisan_id is null or not coalesce(
    (app.artisan_agents(p_artisan_id) -> 'agents' ->> p_right)::boolean, false) then
    raise exception 'Cette fonction est comprise dans les formules Premium et Entreprise.'
      using errcode = '42501';
  end if;
  return p_artisan_id;
end;
$$;
revoke execute on function app.plan_right_artisan(uuid, text) from public, anon, authenticated;

-- Les trois fonctions sont complétées en place (jamais recopiées : voir la migration
-- 20261117120000) : l'artisan qu'elles lisent doit avoir le droit de sa formule.
do $do$
declare
  v_target record;
  v_def text;
  v_line constant text := 'v_artisan uuid := app.library_artisan();';
begin
  for v_target in
    select * from (values
      ('public.artisan_import_library(text, jsonb, boolean)', 'import_catalogue'),
      ('public.artisan_apply_invoice_prices(jsonb, uuid[], uuid[])', 'prix_a_jour'),
      ('public.artisan_raise_prices(integer, text, boolean, boolean)', 'prix_a_jour')
    ) as t(signature, right_key)
  loop
    v_def := pg_catalog.pg_get_functiondef(v_target.signature::regprocedure);
    if pg_catalog.strpos(v_def, 'app.plan_right_artisan(') > 0 then
      continue;
    end if;
    if pg_catalog.strpos(v_def, v_line) = 0 then
      raise exception 'Fonction % : ligne de l''artisan introuvable', v_target.signature;
    end if;
    execute pg_catalog.replace(v_def, v_line,
      'v_artisan uuid := app.plan_right_artisan(app.library_artisan(), '
        || pg_catalog.quote_literal(v_target.right_key) || ');');
  end loop;
end;
$do$;

-- Comparatif des formules (ADR 0200) : les fonctions récentes.
insert into public.plan_features (categorie, libelle, detail, valeurs, ordre) values
  ('Demandes de chantier', 'Demandes urgentes',
   'Une urgence signalée par le client : les artisans disponibles tout de suite sont présentés d''abord.',
   '{"base": true, "premium": true, "entreprise": true}'::jsonb, 45),
  ('Devis et signature', 'Bibliothèque d''ouvrages MENAO',
   'Des ouvrages prêts, avec leurs fournitures et leur temps de pose, à reprendre dans vos devis.',
   '{"base": true, "premium": true, "entreprise": true}'::jsonb, 132),
  ('Devis et signature', 'Import de votre catalogue',
   'Votre fichier Excel ou PDF repris dans votre bibliothèque, colonnes reconnues automatiquement.',
   '{"base": false, "premium": true, "entreprise": true}'::jsonb, 134),
  ('Devis et signature', 'DPGF créé depuis un plan',
   'Pièces, surfaces et ouvrages relevés sur le plan de l''architecte, à vérifier puis à chiffrer.',
   '{"base": false, "premium": false, "entreprise": true}'::jsonb, 172),
  ('Devis et signature', 'Questions à MENAO sur vos plans',
   'Une question sur un plan, par exemple la surface de carrelage : la réponse avec son calcul.',
   '{"base": false, "premium": false, "entreprise": true}'::jsonb, 174),
  ('Paiements', 'Suivi des paiements à encaisser',
   'Ce qui vous est dû, les relances faites et ce qui est encaissé dans le mois.',
   '{"base": false, "premium": true, "entreprise": true}'::jsonb, 225),
  ('Gestion', 'Prix à jour d''après vos factures',
   'Les prix d''achat relevés sur vos factures, et une hausse appliquée à vos prix en un geste.',
   '{"base": false, "premium": true, "entreprise": true}'::jsonb, 435);
