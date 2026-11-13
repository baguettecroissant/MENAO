-- Bibliothèque MENAO par défaut (F-147, ADR 0306, maquette lot 41).
--
-- Un catalogue d'ouvrages MENAO, lisible par tous les artisans : ce que voit le client
-- (désignation, description, unité, TVA), un temps de pose par unité et des fournitures avec leurs
-- quantités. Aucun prix commun : le prix de chaque artisan se calcule avec ses propres réglages
-- (prix de vente de l'heure, coefficient sur les fournitures). Les fournitures du catalogue
-- recevront plus tard une fourchette de prix publics (flux d'affiliation), avec la source et la date.
-- Au premier passage, l'artisan copie les ouvrages de ses métiers dans sa bibliothèque (origine
-- « menao »), puis les modifie librement ; les fournitures copiées attendent son prix d'achat.
--
-- Temps de pose et quantités : repères MENAO, à faire relire par un artisan avant l'ouverture.
-- TODO(legal) : afficher des prix indicatifs à des artisans concurrents (droit de la concurrence) et
-- signaler les liens affiliés (C. conso. L111-7) ; à faire valider par l'avocat.

-- ---------------------------------------------------------------------------
-- Catalogue MENAO
-- ---------------------------------------------------------------------------
create table public.menao_supplies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,60}$'),
  trade_code text not null references public.trades (code),
  designation text not null check (char_length(btrim(designation)) between 1 and 200),
  unit public.quote_unit not null,
  -- Fourchette de prix publics HT (flux d'affiliation) : vide tant qu'aucune source n'est branchée.
  price_min_cents integer check (price_min_cents is null or price_min_cents between 0 and 100000000),
  price_max_cents integer check (price_max_cents is null or price_max_cents between 0 and 100000000),
  price_source text check (price_source is null or char_length(price_source) <= 120),
  price_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((price_min_cents is null) = (price_max_cents is null)),
  check (price_min_cents is null or price_min_cents <= price_max_cents),
  check (price_min_cents is null or (price_source is not null and price_on is not null))
);
create trigger menao_supplies_set_updated_at before update on public.menao_supplies
  for each row execute function app.set_updated_at();

create table public.menao_works (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,60}$'),
  trade_code text not null references public.trades (code),
  position smallint not null check (position between 1 and 1000),
  designation text not null check (char_length(btrim(designation)) between 1 and 200),
  description text check (description is null or char_length(description) <= 1000),
  unit public.quote_unit not null,
  -- TVA courante d'une rénovation de logement de plus de deux ans ; à vérifier sur chaque chantier.
  vat_rate_bp smallint not null default 1000 check (vat_rate_bp in (0, 550, 1000, 2000)),
  -- Temps de pose par unité, en millièmes d'heure (repère MENAO).
  hours_milli integer not null check (hours_milli between 1 and 1000000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trade_code, position)
);
create trigger menao_works_set_updated_at before update on public.menao_works
  for each row execute function app.set_updated_at();

create table public.menao_work_components (
  work_id uuid not null references public.menao_works (id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  supply_id uuid not null references public.menao_supplies (id) on delete restrict,
  quantity_milli integer not null check (quantity_milli between 1 and 100000000),
  primary key (work_id, position)
);
create index menao_work_components_supply_idx on public.menao_work_components (supply_id);

-- Lecture par les utilisateurs connectés ; écritures par les migrations (et plus tard l'équipe).
alter table public.menao_supplies enable row level security;
alter table public.menao_works enable row level security;
alter table public.menao_work_components enable row level security;
revoke all on public.menao_supplies, public.menao_works, public.menao_work_components from anon, authenticated;
grant select on public.menao_supplies, public.menao_works, public.menao_work_components to authenticated;
create policy "menao_supplies : lecture par les utilisateurs connectés"
  on public.menao_supplies for select to authenticated using (true);
create policy "menao_works : lecture par les utilisateurs connectés"
  on public.menao_works for select to authenticated using (true);
create policy "menao_work_components : lecture par les utilisateurs connectés"
  on public.menao_work_components for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Bibliothèque de l'artisan : ouvrages et fournitures copiés depuis le catalogue
-- ---------------------------------------------------------------------------
-- Une fourniture copiée attend le prix d'achat de l'artisan : le coût reste inconnu jusque-là.
alter table public.artisan_supplies alter column purchase_price_cents drop not null;
alter table public.artisan_supplies
  add column menao_supply_id uuid references public.menao_supplies (id) on delete set null;
create unique index artisan_supplies_menao_key on public.artisan_supplies (artisan_id, menao_supply_id)
  where menao_supply_id is not null;

alter table public.artisan_works drop constraint artisan_works_source_check;
alter table public.artisan_works
  add constraint artisan_works_source_check check (source in ('devis', 'manuel', 'menao')),
  add column menao_work_id uuid references public.menao_works (id) on delete set null;

-- Premier passage dans la bibliothèque : choix fait (bibliothèque MENAO, import ou devis).
alter table public.artisan_pricing_settings add column library_onboarded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Fonctions
-- ---------------------------------------------------------------------------
-- Premier passage, choix « bibliothèque MENAO » : copie les ouvrages des métiers choisis (et leurs
-- fournitures, sans prix) dans la bibliothèque de l'entreprise. Un ouvrage déjà présent (même
-- ouvrage MENAO, ou même désignation et unité) n'est pas copié deux fois. Renvoie le nombre
-- d'ouvrages ajoutés.
create function public.artisan_adopt_menao_library(p_trade_codes text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
  v_work record;
  v_id uuid;
  v_count integer := 0;
begin
  if p_trade_codes is null or cardinality(p_trade_codes) = 0 then
    raise exception 'Choisissez au moins un métier.' using errcode = '22023';
  end if;
  if cardinality(p_trade_codes) > 20 or exists (
    select 1 from unnest(p_trade_codes) t(code)
    where not exists (select 1 from public.menao_works w where w.trade_code = t.code and w.active)
  ) then
    raise exception 'Métier sans ouvrage MENAO.' using errcode = '22023';
  end if;

  -- Fournitures utilisées par ces ouvrages, une seule fois par entreprise.
  insert into public.artisan_supplies (artisan_id, designation, unit, purchase_price_cents, menao_supply_id)
  select distinct v_artisan, s.designation, s.unit, null::integer, s.id
  from public.menao_works w
  join public.menao_work_components c on c.work_id = w.id
  join public.menao_supplies s on s.id = c.supply_id
  where w.active and w.trade_code = any (p_trade_codes)
    and not exists (
      select 1 from public.artisan_supplies a
      where a.artisan_id = v_artisan and a.menao_supply_id = s.id
    );

  for v_work in
    select w.* from public.menao_works w
    where w.active and w.trade_code = any (p_trade_codes)
      and not exists (
        select 1 from public.artisan_works a
        where a.artisan_id = v_artisan
          and (a.menao_work_id = w.id or (lower(a.designation) = lower(w.designation) and a.unit = w.unit))
      )
    order by w.trade_code, w.position
  loop
    insert into public.artisan_works (artisan_id, designation, description, unit, line_type, vat_rate_bp,
      detailed, manual_price_cents, source, menao_work_id)
    values (v_artisan, v_work.designation, v_work.description, v_work.unit, 'autre', v_work.vat_rate_bp,
      false, null, 'menao', v_work.id)
    returning id into v_id;
    -- Le temps de pose d'abord, puis les fournitures dans l'ordre du catalogue.
    insert into public.artisan_work_components (work_id, position, kind, quantity_milli)
    values (v_id, 1, 'heures', v_work.hours_milli);
    insert into public.artisan_work_components (work_id, position, kind, supply_id, quantity_milli)
    select v_id, c.position + 1, 'fourniture', a.id, c.quantity_milli
    from public.menao_work_components c
    join public.artisan_supplies a on a.artisan_id = v_artisan and a.menao_supply_id = c.supply_id
    where c.work_id = v_work.id
    order by c.position;
    v_count := v_count + 1;
  end loop;

  insert into public.artisan_pricing_settings (artisan_id, library_onboarded_at)
  values (v_artisan, now())
  on conflict (artisan_id) do update
    set library_onboarded_at = coalesce(public.artisan_pricing_settings.library_onboarded_at, now());
  return v_count;
end;
$$;
revoke execute on function public.artisan_adopt_menao_library(text[]) from public, anon;
grant execute on function public.artisan_adopt_menao_library(text[]) to authenticated;

-- Premier passage, autre choix (import ou devis) : ne plus proposer la bibliothèque MENAO d'office.
create function public.artisan_dismiss_menao_library()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.library_artisan();
begin
  insert into public.artisan_pricing_settings (artisan_id, library_onboarded_at)
  values (v_artisan, now())
  on conflict (artisan_id) do update
    set library_onboarded_at = coalesce(public.artisan_pricing_settings.library_onboarded_at, now());
end;
$$;
revoke execute on function public.artisan_dismiss_menao_library() from public, anon;
grant execute on function public.artisan_dismiss_menao_library() to authenticated;

-- ---------------------------------------------------------------------------
-- Premier jeu du catalogue : plâtrerie, peinture, plomberie, électricité, carrelage
-- ---------------------------------------------------------------------------
insert into public.menao_supplies (code, trade_code, designation, unit) values
  ('plaque_ba13', 'plaquiste', 'Plaque de plâtre BA13', 'm2'),
  ('plaque_ba13_h1', 'plaquiste', 'Plaque de plâtre hydrofuge BA13 (H1)', 'm2'),
  ('rail_48', 'plaquiste', 'Rail métallique 48 mm', 'ml'),
  ('montant_48', 'plaquiste', 'Montant métallique 48 mm', 'ml'),
  ('fourrure_f530', 'plaquiste', 'Fourrure métallique F530', 'ml'),
  ('suspente', 'plaquiste', 'Suspente pour fourrure', 'u'),
  ('laine_verre_45', 'plaquiste', 'Laine de verre 45 mm', 'm2'),
  ('doublage_pse', 'plaquiste', 'Complexe de doublage plâtre et polystyrène 10+80', 'm2'),
  ('mortier_doublage', 'plaquiste', 'Mortier adhésif pour doublage', 'kg'),
  ('enduit_joint', 'plaquiste', 'Enduit à joints', 'kg'),
  ('bande_joint', 'plaquiste', 'Bande à joints', 'ml'),
  ('vis_plaque', 'plaquiste', 'Vis à plaque de plâtre', 'u'),
  ('peinture_mat', 'peintre', 'Peinture acrylique mate blanche', 'l'),
  ('sous_couche', 'peintre', 'Sous-couche acrylique', 'l'),
  ('peinture_satin_boiserie', 'peintre', 'Peinture satinée pour boiseries', 'l'),
  ('enduit_rebouchage', 'peintre', 'Enduit de rebouchage', 'kg'),
  ('enduit_lissage', 'peintre', 'Enduit de lissage', 'kg'),
  ('lessive', 'peintre', 'Lessive de préparation', 'l'),
  ('toile_verre', 'peintre', 'Toile de verre', 'm2'),
  ('colle_toile', 'peintre', 'Colle pour toile de verre', 'kg'),
  ('protection', 'peintre', 'Bâche et ruban de masquage', 'm2'),
  ('pack_wc_suspendu', 'plombier', 'Pack WC suspendu (bâti-support, cuvette, abattant, plaque)', 'u'),
  ('mitigeur_lavabo', 'plombier', 'Mitigeur de lavabo', 'u'),
  ('flexibles', 'plombier', 'Flexibles d''alimentation (paire)', 'u'),
  ('chauffe_eau_200', 'plombier', 'Chauffe-eau électrique 200 L', 'u'),
  ('groupe_securite', 'plombier', 'Groupe de sécurité', 'u'),
  ('tube_per_16', 'plombier', 'Tube PER 16 mm', 'ml'),
  ('raccords_per', 'plombier', 'Raccords PER (lot)', 'u'),
  ('tube_pvc_40', 'plombier', 'Tube PVC d''évacuation 40 mm', 'ml'),
  ('raccords_pvc', 'plombier', 'Raccords PVC d''évacuation (lot)', 'u'),
  ('receveur_douche', 'plombier', 'Receveur de douche extra-plat', 'u'),
  ('bonde_douche', 'plombier', 'Bonde de douche', 'u'),
  ('mitigeur_thermo', 'plombier', 'Mitigeur thermostatique de douche', 'u'),
  ('lavabo_vasque', 'plombier', 'Lavabo avec vasque', 'u'),
  ('siphon', 'plombier', 'Siphon', 'u'),
  ('silicone', 'plombier', 'Mastic silicone sanitaire', 'u'),
  ('prise_16a', 'electricien', 'Prise de courant 16 A avec terre', 'u'),
  ('interrupteur', 'electricien', 'Interrupteur va-et-vient', 'u'),
  ('boite_encastrement', 'electricien', 'Boîte d''encastrement', 'u'),
  ('gaine_icta_20', 'electricien', 'Gaine ICTA 20 mm', 'ml'),
  ('fils_2_5', 'electricien', 'Fils H07V-U 2,5 mm² (phase, neutre, terre)', 'ml'),
  ('fils_1_5', 'electricien', 'Fils H07V-U 1,5 mm² (phase, neutre, terre)', 'ml'),
  ('dcl', 'electricien', 'Point de centre DCL', 'u'),
  ('spot_led', 'electricien', 'Spot LED encastrable', 'u'),
  ('tableau_3_rangees', 'electricien', 'Tableau électrique 3 rangées', 'u'),
  ('differentiel_30ma', 'electricien', 'Interrupteur différentiel 30 mA type A', 'u'),
  ('disjoncteur', 'electricien', 'Disjoncteur divisionnaire', 'u'),
  ('detecteur_fumee', 'electricien', 'Détecteur de fumée', 'u'),
  ('carrelage_sol', 'carreleur', 'Carrelage de sol en grès cérame', 'm2'),
  ('faience', 'carreleur', 'Faïence murale', 'm2'),
  ('colle_c2', 'carreleur', 'Mortier-colle C2', 'kg'),
  ('mortier_joint', 'carreleur', 'Mortier de joint', 'kg'),
  ('ragreage', 'carreleur', 'Ragréage autolissant', 'kg'),
  ('primaire', 'carreleur', 'Primaire d''accrochage', 'l'),
  ('spec', 'carreleur', 'Système d''étanchéité sous carrelage (SPEC)', 'm2'),
  ('plinthe', 'carreleur', 'Plinthe carrelée', 'ml'),
  ('profile_finition', 'carreleur', 'Profilé de finition', 'ml'),
  ('croisillons', 'carreleur', 'Croisillons et cales', 'u');

insert into public.menao_works (code, trade_code, position, designation, description, unit, hours_milli) values
  ('cloison_ba13', 'plaquiste', 1, 'Cloison en plaques de plâtre BA13 sur ossature 72/48', 'Ossature métallique 48 mm, une plaque BA13 par face, isolant laine de verre 45 mm, bandes et joints.', 'm2', 550),
  ('cloison_ba13_h1', 'plaquiste', 2, 'Cloison en plaques hydrofuges BA13 sur ossature 72/48', 'Pour pièces humides : ossature 48 mm, plaques hydrofuges (H1), isolant 45 mm, bandes et joints.', 'm2', 600),
  ('doublage_colle', 'plaquiste', 3, 'Doublage collé plâtre et polystyrène 10+80', 'Complexe isolant collé au mortier adhésif, bandes et joints.', 'm2', 350),
  ('faux_plafond_ba13', 'plaquiste', 4, 'Faux plafond en plaques BA13 sur fourrures', 'Fourrures F530 sur suspentes, plaques BA13, bandes et joints.', 'm2', 750),
  ('bandes_joints', 'plaquiste', 5, 'Bandes et joints sur plaques de plâtre', 'Pose des bandes, deux passes d''enduit et ponçage, prêt à peindre.', 'm2', 150),
  ('coffrage_gaine', 'plaquiste', 6, 'Coffrage de gaine ou de tuyaux en plaques BA13', 'Ossature métallique et plaques BA13 sur deux faces, bandes et joints.', 'ml', 800),
  ('peinture_murs', 'peintre', 1, 'Peinture des murs, impression et deux couches', 'Protection des sols, une couche d''impression et deux couches de peinture acrylique mate.', 'm2', 200),
  ('peinture_plafonds', 'peintre', 2, 'Peinture des plafonds, deux couches', 'Protection des sols et deux couches de peinture acrylique mate.', 'm2', 250),
  ('preparation_murs', 'peintre', 3, 'Préparation des murs : lessivage et rebouchage', 'Lessivage, rebouchage des trous et fissures, ponçage.', 'm2', 100),
  ('enduit_lissage', 'peintre', 4, 'Enduit de lissage, deux passes', 'Deux passes d''enduit de lissage et ponçage avant peinture.', 'm2', 300),
  ('toile_verre', 'peintre', 5, 'Pose de toile de verre', 'Toile de verre collée, prête à peindre.', 'm2', 250),
  ('peinture_porte', 'peintre', 6, 'Peinture d''une porte, deux faces', 'Ponçage, une couche d''impression et deux couches de peinture satinée.', 'u', 1500),
  ('peinture_plinthes', 'peintre', 7, 'Peinture des plinthes et boiseries', 'Ponçage et deux couches de peinture satinée.', 'ml', 120),
  ('wc_suspendu', 'plombier', 1, 'Pose d''un WC suspendu', 'Fourniture et pose d''un bâti-support, d''une cuvette suspendue, de son abattant et de la plaque, raccordements compris.', 'u', 4000),
  ('mitigeur_lavabo', 'plombier', 2, 'Remplacement d''un mitigeur de lavabo', 'Dépose de l''ancien robinet, fourniture et pose d''un mitigeur et de ses flexibles.', 'u', 1000),
  ('chauffe_eau', 'plombier', 3, 'Remplacement d''un chauffe-eau électrique 200 L', 'Dépose de l''ancien appareil, fourniture et pose d''un chauffe-eau 200 L et d''un groupe de sécurité.', 'u', 4000),
  ('alimentation_per', 'plombier', 4, 'Alimentation en eau en tube PER', 'Tube PER 16 mm sous gaine, raccords compris.', 'ml', 400),
  ('evacuation_pvc', 'plombier', 5, 'Évacuation en tube PVC 40 mm', 'Tube PVC 40 mm avec pente, raccords et colliers compris.', 'ml', 500),
  ('receveur_douche', 'plombier', 6, 'Pose d''un receveur de douche extra-plat', 'Fourniture et pose d''un receveur extra-plat et de sa bonde, raccordement à l''évacuation.', 'u', 4000),
  ('mitigeur_douche', 'plombier', 7, 'Pose d''un mitigeur thermostatique de douche', 'Fourniture et pose d''un mitigeur thermostatique.', 'u', 1500),
  ('lavabo', 'plombier', 8, 'Pose d''un lavabo avec vasque', 'Fourniture et pose d''un lavabo, de son siphon et de ses flexibles, joints compris.', 'u', 2500),
  ('prise_16a', 'electricien', 1, 'Création d''une prise de courant 16 A', 'Prise avec terre encastrée, boîte, gaine et fils depuis le tableau ou une boîte de dérivation.', 'u', 1000),
  ('point_lumineux', 'electricien', 2, 'Création d''un point lumineux avec interrupteur', 'Point de centre DCL, interrupteur va-et-vient, boîtes, gaine et fils.', 'u', 1200),
  ('remplacement_prise', 'electricien', 3, 'Remplacement d''une prise de courant', 'Dépose de l''ancienne prise, fourniture et pose d''une prise 16 A avec terre.', 'u', 400),
  ('spot_led', 'electricien', 4, 'Pose d''un spot LED encastré', 'Découpe, raccordement et pose d''un spot LED encastrable.', 'u', 500),
  ('tableau', 'electricien', 5, 'Remplacement du tableau électrique', 'Tableau trois rangées, deux interrupteurs différentiels 30 mA et huit disjoncteurs, repérage des circuits.', 'u', 8000),
  ('disjoncteur', 'electricien', 6, 'Ajout d''un disjoncteur divisionnaire', 'Fourniture et pose d''un disjoncteur dans le tableau existant.', 'u', 500),
  ('detecteur_fumee', 'electricien', 7, 'Pose d''un détecteur de fumée', 'Fourniture et pose d''un détecteur autonome avertisseur de fumée.', 'u', 300),
  ('carrelage_sol', 'carreleur', 1, 'Pose de carrelage au sol', 'Fourniture et pose collée de carrelage en grès cérame, croisillons et joints compris.', 'm2', 800),
  ('faience', 'carreleur', 2, 'Pose de faïence murale', 'Fourniture et pose collée de faïence murale, croisillons et joints compris.', 'm2', 1000),
  ('ragreage', 'carreleur', 3, 'Ragréage autolissant du sol', 'Primaire d''accrochage et ragréage autolissant d''environ 3 mm.', 'm2', 150),
  ('plinthes', 'carreleur', 4, 'Pose de plinthes carrelées', 'Fourniture et pose collée de plinthes, joints compris.', 'ml', 250),
  ('spec', 'carreleur', 5, 'Étanchéité sous carrelage (SPEC)', 'Système de protection à l''eau sous carrelage pour douche et pièces humides.', 'm2', 300),
  ('depose_carrelage', 'carreleur', 6, 'Dépose d''un ancien carrelage', 'Dépose du carrelage existant et de sa colle, évacuation des gravats non comprise.', 'm2', 600),
  ('profile', 'carreleur', 7, 'Pose d''un profilé de finition', 'Fourniture et pose d''un profilé de finition pour angles et arrêts.', 'ml', 150);

insert into public.menao_work_components (work_id, position, supply_id, quantity_milli)
select w.id, v.position, s.id, v.quantity_milli
from (values
  ('cloison_ba13', 1, 'plaque_ba13', 2100),
  ('cloison_ba13', 2, 'rail_48', 900),
  ('cloison_ba13', 3, 'montant_48', 2200),
  ('cloison_ba13', 4, 'laine_verre_45', 1050),
  ('cloison_ba13', 5, 'enduit_joint', 700),
  ('cloison_ba13', 6, 'bande_joint', 2800),
  ('cloison_ba13', 7, 'vis_plaque', 30000),
  ('cloison_ba13_h1', 1, 'plaque_ba13_h1', 2100),
  ('cloison_ba13_h1', 2, 'rail_48', 900),
  ('cloison_ba13_h1', 3, 'montant_48', 2200),
  ('cloison_ba13_h1', 4, 'laine_verre_45', 1050),
  ('cloison_ba13_h1', 5, 'enduit_joint', 700),
  ('cloison_ba13_h1', 6, 'bande_joint', 2800),
  ('cloison_ba13_h1', 7, 'vis_plaque', 30000),
  ('doublage_colle', 1, 'doublage_pse', 1050),
  ('doublage_colle', 2, 'mortier_doublage', 3000),
  ('doublage_colle', 3, 'enduit_joint', 350),
  ('doublage_colle', 4, 'bande_joint', 1400),
  ('faux_plafond_ba13', 1, 'plaque_ba13', 1050),
  ('faux_plafond_ba13', 2, 'fourrure_f530', 3000),
  ('faux_plafond_ba13', 3, 'suspente', 1500),
  ('faux_plafond_ba13', 4, 'enduit_joint', 350),
  ('faux_plafond_ba13', 5, 'bande_joint', 1400),
  ('faux_plafond_ba13', 6, 'vis_plaque', 18000),
  ('bandes_joints', 1, 'enduit_joint', 350),
  ('bandes_joints', 2, 'bande_joint', 1400),
  ('coffrage_gaine', 1, 'plaque_ba13', 800),
  ('coffrage_gaine', 2, 'rail_48', 1000),
  ('coffrage_gaine', 3, 'montant_48', 1500),
  ('coffrage_gaine', 4, 'enduit_joint', 300),
  ('coffrage_gaine', 5, 'bande_joint', 2000),
  ('coffrage_gaine', 6, 'vis_plaque', 15000),
  ('peinture_murs', 1, 'protection', 1000),
  ('peinture_murs', 2, 'sous_couche', 100),
  ('peinture_murs', 3, 'peinture_mat', 220),
  ('peinture_plafonds', 1, 'protection', 1000),
  ('peinture_plafonds', 2, 'peinture_mat', 220),
  ('preparation_murs', 1, 'lessive', 20),
  ('preparation_murs', 2, 'enduit_rebouchage', 100),
  ('enduit_lissage', 1, 'enduit_lissage', 1000),
  ('toile_verre', 1, 'toile_verre', 1100),
  ('toile_verre', 2, 'colle_toile', 250),
  ('peinture_porte', 1, 'sous_couche', 250),
  ('peinture_porte', 2, 'peinture_satin_boiserie', 500),
  ('peinture_plinthes', 1, 'peinture_satin_boiserie', 50),
  ('wc_suspendu', 1, 'pack_wc_suspendu', 1000),
  ('wc_suspendu', 2, 'raccords_pvc', 1000),
  ('wc_suspendu', 3, 'raccords_per', 1000),
  ('mitigeur_lavabo', 1, 'mitigeur_lavabo', 1000),
  ('mitigeur_lavabo', 2, 'flexibles', 1000),
  ('chauffe_eau', 1, 'chauffe_eau_200', 1000),
  ('chauffe_eau', 2, 'groupe_securite', 1000),
  ('chauffe_eau', 3, 'raccords_per', 1000),
  ('alimentation_per', 1, 'tube_per_16', 1100),
  ('alimentation_per', 2, 'raccords_per', 200),
  ('evacuation_pvc', 1, 'tube_pvc_40', 1100),
  ('evacuation_pvc', 2, 'raccords_pvc', 300),
  ('receveur_douche', 1, 'receveur_douche', 1000),
  ('receveur_douche', 2, 'bonde_douche', 1000),
  ('receveur_douche', 3, 'silicone', 1000),
  ('mitigeur_douche', 1, 'mitigeur_thermo', 1000),
  ('lavabo', 1, 'lavabo_vasque', 1000),
  ('lavabo', 2, 'siphon', 1000),
  ('lavabo', 3, 'flexibles', 1000),
  ('lavabo', 4, 'silicone', 500),
  ('prise_16a', 1, 'prise_16a', 1000),
  ('prise_16a', 2, 'boite_encastrement', 1000),
  ('prise_16a', 3, 'gaine_icta_20', 6000),
  ('prise_16a', 4, 'fils_2_5', 6000),
  ('point_lumineux', 1, 'dcl', 1000),
  ('point_lumineux', 2, 'interrupteur', 1000),
  ('point_lumineux', 3, 'boite_encastrement', 2000),
  ('point_lumineux', 4, 'gaine_icta_20', 8000),
  ('point_lumineux', 5, 'fils_1_5', 8000),
  ('remplacement_prise', 1, 'prise_16a', 1000),
  ('spot_led', 1, 'spot_led', 1000),
  ('spot_led', 2, 'fils_1_5', 2000),
  ('tableau', 1, 'tableau_3_rangees', 1000),
  ('tableau', 2, 'differentiel_30ma', 2000),
  ('tableau', 3, 'disjoncteur', 8000),
  ('disjoncteur', 1, 'disjoncteur', 1000),
  ('detecteur_fumee', 1, 'detecteur_fumee', 1000),
  ('carrelage_sol', 1, 'carrelage_sol', 1100),
  ('carrelage_sol', 2, 'colle_c2', 5000),
  ('carrelage_sol', 3, 'mortier_joint', 500),
  ('carrelage_sol', 4, 'croisillons', 8000),
  ('faience', 1, 'faience', 1100),
  ('faience', 2, 'colle_c2', 4000),
  ('faience', 3, 'mortier_joint', 400),
  ('faience', 4, 'croisillons', 10000),
  ('ragreage', 1, 'primaire', 150),
  ('ragreage', 2, 'ragreage', 5000),
  ('plinthes', 1, 'plinthe', 1050),
  ('plinthes', 2, 'colle_c2', 500),
  ('plinthes', 3, 'mortier_joint', 50),
  ('spec', 1, 'spec', 1050),
  ('profile', 1, 'profile_finition', 1050)
) as v(work_code, position, supply_code, quantity_milli)
join public.menao_works w on w.code = v.work_code
join public.menao_supplies s on s.code = v.supply_code;
