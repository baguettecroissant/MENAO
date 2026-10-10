# ADR 0020 — PDF du devis : données rassemblées en base, rendu partagé, aperçu avant l'envoi

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- F-19 : « Générer le devis » mène à un aperçu PDF.
- F-20 : mentions obligatoires du devis.
- Spec §4.4 et §14.1 : la logique serveur lourde va dans les Edge Functions (`generate-pdf`).
- Maquette « Aperçu du devis » : « Votre devis est prêt ! », miniature du document, « Voir le PDF ».
- L'envoi (F-21 : numéro, échéancier, dates des travaux) fait l'objet de l'étape suivante (3f).

## Décisions
- **Rendu avec `pdf-lib`** (1.17.1) :
  - JavaScript pur, sans dépendance native, identique sous Node (tests) et Deno (Edge Function) ;
  - polices standard du PDF (Helvetica), donc aucun fichier de police à embarquer. Les caractères hors du jeu WinAnsi (émojis, alphabets non latins) deviennent « ? » ; les espaces fines deviennent insécables ;
  - préféré à `@react-pdf/renderer` (cité par la spec « ou équivalent ») : plus léger et plus rapide à démarrer dans une Edge Function ;
  - la bibliothèque évolue peu. Elle est isolée dans un seul module, remplaçable (par exemple par la reprise maintenue `@cantoo/pdf-lib`).
- **Paquet `@menao/documents`**, en trois modules :
  - `quote-model.ts` : le contenu du devis (textes et montants mis en forme), commun au PDF et à l'aperçu web, testé à part du dessin ;
  - `quote-data.ts` : passage de la réponse SQL aux données du devis ;
  - `quote-pdf.ts` : le dessin A4. Il comprend le tableau paginé avec en-tête répété, les totaux, l'échéancier, les mentions, « Bon pour accord », le pied de page et le filigrane « APERÇU ». C'est le seul module qui dépend de pdf-lib (export `@menao/documents/pdf`).
  - Les imports portent l'extension `.ts`, car Deno charge le paquet tel quel (comme `packages/emails`). Le web l'accepte grâce à `allowImportingTsExtensions`.
- **Données : la fonction SQL `quote_document(p_quote_id)`** rassemble :
  - le devis, ses lignes et ses totaux ;
  - l'artisan : Sirene, TVA, contact ;
  - l'attestation décennale : assureur, numéro, couverture, échéance ;
  - le client et le chantier.
  
  Elle décide seule de l'accès : à cette étape, le brouillon est lisible par son artisan uniquement. L'Edge Function et l'aperçu web l'appellent tous deux avec le jeton de l'utilisateur. Le contrôle d'accès est donc unique et testé en pgTAP.
- **Edge Function `generate-pdf`** (jeton obligatoire) : elle appelle `quote_document` au nom de l'utilisateur et renvoie le PDF (`inline`, `no-store`). Rien n'est stocké à l'aperçu.
- **Route web `/devis/[id]/pdf`** : elle relaie le PDF avec la session de l'utilisateur. « Voir le PDF » est ainsi un lien simple, ouvert dans un nouvel onglet, qui fonctionne aussi sur mobile.
  - Les en-têtes de sécurité interdisent l'affichage en cadre (`X-Frame-Options: DENY`).
  - La miniature est donc rendue en HTML, à partir du même modèle que le PDF.
- **Aperçu du brouillon** :
  - numéro « attribué à l'envoi » ;
  - validité « 30 jours à compter de l'envoi » (valeur proposée, `QUOTE_VALIDITY_DAYS`, d'après la maquette « Devis valable 1 mois ») ;
  - début, durée des travaux et échéancier « précisés à l'envoi » ;
  - filigrane « APERÇU ».
  
  Le numéro n'est attribué qu'à l'envoi (F-21), pour garder une séquence sans trou. Cette décision remplace celle de l'ADR 0018, qui l'attribuait à la génération.
- **Bouton « Générer le devis »** : il remplace « Enregistrer le devis » en bas de l'éditeur. Il enregistre les modifications, puis ouvre l'aperçu. « Enregistrer » reste en haut de l'écran, comme dans les maquettes.
- **Assurance décennale** : le devis reprend l'attestation déposée, si elle n'est ni refusée ni échue à la date du devis. Sinon, il affiche « informations à compléter ». L'envoi (3f) exigera des informations complètes.

## Points à valider (TODO(legal))
- Les mentions minimales de F-20 sont à faire valider par l'expert-comptable : numérotation, validité, TVA à taux réduit et attestation du client, franchise en base, « Devis reçu avant l'exécution des travaux », « Bon pour accord ».
- Plusieurs informations ne sont pas encore collectées :
  - le RCS ou RM et le capital social des sociétés ;
  - le médiateur de la consommation ;
  - l'information sur le droit de rétractation (contrat conclu à distance ou hors établissement).
- Le particulier n'a pas d'adresse postale propre : celle du chantier sert d'adresse du client.
- Seules les catégories juridiques INSEE les plus fréquentes ont un libellé. La liste est partagée avec l'inscription (`packages/core/src/legal-forms.ts`).

## Conséquences
- Étape 3f (F-21), à l'envoi :
  - numéro propre à chaque artisan ;
  - données de l'artisan et du client figées ;
  - échéancier, validité et dates des travaux.
  
  `quote_document` lira alors aussi le devis envoyé, y compris pour le particulier et l'équipe. Le PDF envoyé sera conservé dans un bucket privé, lu par URL signées.
- Les factures et les PV réutiliseront `@menao/documents` et `generate-pdf`.
