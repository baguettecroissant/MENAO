# ADR 0236 — Assistant de l'espace artisan

- Statut : accepté
- Date : 6 novembre 2026
- F-86, demandé le 6 novembre 2026 (« go pour l'assistant de l'espace artisan »). Dernier agent écrit promis dans toutes les formules par le rapport « Agents IA de MENAO » (ADR 0231). Les assistants existants ne servaient que les pages publiques : futurs artisans (ADR 0218) et particuliers (ADR 0220).

## Décision
- **Où** : aucune nouvelle entrée de menu (décision du 25 octobre 2026).
  - Sur le site, « Aide et support » de l'espace pro mène à une page `/pro/aide` (assistant, puis contact de l'équipe) au lieu du formulaire public `/contact`, depuis le menu latéral, le menu du compte et « Mon profil ».
  - Dans l'application, l'assistant s'ajoute en haut de « Aide et contact », pour les artisans, avant les questions fréquentes. Aucun lien vers le site (CLAUDE.md règle 10).
- **Ce qu'il sait** :
  - un guide de l'espace artisan (rubriques, boutons, parcours des demandes, devis, paiements, agenda, vitrine, formule), tenu dans l'Edge Function `artisan-assistant` ;
  - les contenus publiés du site (`/assistant-pro.txt`) ;
  - **le résumé de son compte** (`my_assistant_context`, lu avec la session de l'artisan) : dossier, pause, paiements activés, TVA, formule et essai, minutes de voix, demandes en attente, chantiers par étape, devis commencés ou en attente, documents refusés ou à renouveler, prochain rendez-vous. Des états et des nombres seulement : ni client, ni coordonnée, ni montant de chantier.
- **Ce qu'il fait** :
  - il répond en quelques phrases, avec le chemin concret (rubrique, bouton) ;
  - il propose au plus deux écrans à ouvrir (liste fermée `ASSISTANT_SCREENS`, reliée aux adresses de chaque plateforme ; « formule » jamais dans l'application) ;
  - il suggère des questions de relance, et oriente vers l'équipe quand il ne sait pas.
  - Il n'agit jamais à la place de l'artisan.
- **Garde-fous** :
  - inclus dans toutes les formules ;
  - limite invisible en usage normal : 60 questions par heure et par artisan, 12 par conversation, plafond global de 3 000 par heure ;
  - historique gardé dans l'écran, jamais en base ;
  - e-mails et téléphones retirés avant l'envoi au modèle ;
  - seules les métriques sont journalisées (`ai_runs`, nouvelle valeur `artisan-assistant`).
  - Même modèle que l'assistant des pages Pro (`AI_PRO_ASSISTANT_MODEL`).

## Conséquences
- Tests pgTAP `125_assistant_espace_artisan` ; tests unitaires du résumé du compte, du nettoyage des réponses et de l'historique.
- Le guide doit suivre l'interface : un écran déplacé ou renommé se corrige aussi dans `supabase/functions/artisan-assistant/guide.ts`.
- Une évaluation sur cas fictifs (comme `pro-assistant/eval`) pourra suivre, après estimation de son coût.
