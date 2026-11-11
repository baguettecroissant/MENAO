-- Travaux du maçon complétés (F-129, ADR 0280).
--
-- Le maçon n'avait que « Gros œuvre », « Extension » et « Ouverture de mur porteur » : une dalle,
-- une chape ou une terrasse en béton ne trouvait aucun travail à son nom, et l'analyse se
-- rabattait sur « Terrassement » (terrassier) dès que le texte parlait de préparer le sol.
-- Les travaux décrivent l'activité de l'artisan ; le classement ne filtre que sur le métier.
insert into public.work_types (code, trade_code, label, sort_order) values
  ('dalle-chape', 'macon', 'Dalle béton et chape', 40),
  ('terrasse-beton', 'macon', 'Terrasse en béton', 50),
  ('fondations', 'macon', 'Fondations', 60),
  ('muret', 'macon', 'Murets et murs de clôture', 70)
on conflict (code) do nothing;
