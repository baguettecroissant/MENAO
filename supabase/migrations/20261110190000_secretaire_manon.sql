-- La secrétaire vocale s'appelle Manon (F-122, ADR 0274), et non plus Camille : la cliente fictive
-- des écrans et des photos de démonstration porte déjà ce prénom.
-- Seuls les textes lus par quelqu'un changent : deux libellés du comparatif des formules et l'objet
-- des demandes de rappel. Les noms internes (table camille_recaps, type de notification
-- equipe_recap_camille) ne bougent pas.

-- Comparatif des formules (contenu éditorial en base, ADR 0200).
update public.plan_features set libelle = 'Manon, secrétaire au téléphone'
  where categorie = 'Assistants IA' and libelle = 'Camille, secrétaire au téléphone';
update public.plan_features set libelle = 'Devis préparé en conversation avec Manon'
  where categorie = 'Assistants IA' and libelle = 'Devis préparé en conversation avec Camille';

-- Objet des demandes de rappel : il est écrit par une fonction et relu par le récapitulatif du
-- matin. Les deux sont redéfinies depuis leur définition en vigueur (pg_get_functiondef), avec ce
-- seul texte remplacé ; rien d'autre ne change, droits d'exécution compris.
do $$
declare
  v_fn record;
  v_count int := 0;
begin
  for v_fn in
    select p.oid, pg_catalog.pg_get_functiondef(p.oid) as def
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app') and p.prokind = 'f'
      and pg_catalog.strpos(p.prosrc, 'Demande de rappel (secrétaire vocale Camille)') > 0
  loop
    execute pg_catalog.replace(v_fn.def, 'Demande de rappel (secrétaire vocale Camille)',
      'Demande de rappel (secrétaire vocale Manon)');
    v_count := v_count + 1;
  end loop;
  if v_count <> 2 then
    raise exception 'Fonctions attendues : 2 (écriture et récapitulatif), trouvées : %', v_count;
  end if;
end;
$$;

-- Demandes déjà enregistrées : même objet, pour que le récapitulatif les compte toujours.
update public.tickets set subject = 'Demande de rappel (secrétaire vocale Manon)'
  where subject = 'Demande de rappel (secrétaire vocale Camille)';
