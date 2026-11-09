-- Comparatif des formules : catégorie « Assistants IA » (lot 19, ADR 0265), juste après les demandes
-- de chantier. Valeurs reprises des droits `plans.limites.agents` (ADR 0231) et des rappels SMS
-- (20261107120000_rappels_sms.sql) ; contenu éditorial modifiable en base, comme le reste du
-- comparatif (ADR 0200).
insert into public.plan_features (categorie, libelle, detail, valeurs, ordre) values
  ('Assistants IA', 'Assistants écrits', 'Dictée du devis, tickets de dépenses lus, aide dans votre espace.',
   '{"base": true, "premium": true, "entreprise": true}', 60),
  ('Assistants IA', 'Camille, secrétaire au téléphone',
   'Elle répond quand vous êtes sur le chantier, note la demande et fixe le rendez-vous dans votre agenda.',
   '{"base": false, "premium": true, "entreprise": true}', 61),
  ('Assistants IA', 'Minutes de voix incluses par mois', null,
   '{"base": false, "premium": "300", "entreprise": "1 000"}', 62),
  ('Assistants IA', 'Lignes de secrétaire', null,
   '{"base": false, "premium": "1", "entreprise": "3"}', 63),
  ('Assistants IA', 'Devis préparé en conversation avec Camille', null,
   '{"base": false, "premium": true, "entreprise": true}', 64),
  ('Assistants IA', 'Rappels de rendez-vous à vos clients', null,
   '{"base": false, "premium": "SMS · 100 par mois", "entreprise": "Appel et SMS · 300 par mois"}', 65),
  ('Assistants IA', 'Recharges de minutes', null,
   '{"base": false, "premium": true, "entreprise": true}', 66)
on conflict (categorie, libelle) do nothing;
