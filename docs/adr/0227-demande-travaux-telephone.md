# ADR 0227 — Demande de travaux par téléphone avec Camille

- Statut : accepté
- Date : 5 novembre 2026
- F-77, demandé le 5 novembre 2026 (« go pour la demande de travaux par téléphone »), avec la validation par e-mail et le bouton dans la fenêtre de l'assistant des particuliers, choisis le même jour. Suite des ADR 0225 (secrétaire vocale) et 0226 ; reprend le compte au moment de la demande (ADR 0014) et l'analyse du besoin (analyze-need).

## Décision
- **Camille côté particuliers** : un second assistant Vapi, avec sa propre consigne, appelle la même Edge Function `voice-assistant` (même secret). Elle pose les questions une à une (besoin, commune, délai, coordonnées), sans prix ni diagnostic. Pour une urgence (gaz, eau, électricité), elle donne d'abord les consignes de sécurité et les numéros d'urgence.
- **Rien ne part chez les artisans pendant l'appel.** Après le récapitulatif et l'accord oral, l'outil `preparer_demande_travaux` :
  1. ouvre une session anonyme, comme un visiteur du site ;
  2. fait analyser le besoin par `analyze-need`, qui crée le projet de cette session (même texte que sur le site : besoin, commune, délai) ;
  3. valide les critères et compte les artisans disponibles (au plus 3), comme sur le site ;
  4. enregistre un jeton de transfert de 7 jours (`voice_prepare_work_request`, rôle service seulement) ;
  5. envoie au particulier l'e-mail « Votre demande de travaux est prête » avec le lien `/demande-preparee/<jeton>`.
- **Le particulier envoie lui-même.** La page du lien montre la demande et la création de l'espace (ou la connexion, ou Google / Apple), pré-remplie avec le prénom, l'adresse e-mail et le numéro dictés. Une fois connecté, le projet passe à son compte (`claim_project`). La page d'envoi s'ouvre ensuite avec les 3 premiers artisans du classement déjà choisis ; il peut changer ce choix. S'il manque le métier ou la commune, il passe d'abord par les critères. S'il n'y a aucun artisan, il arrive sur la liste, qui permet de demander à l'équipe de chercher.
  - Pourquoi : l'adresse e-mail est vérifiée et l'accord est donné par écrit. Le client garde le choix, comme sur le site, et le parcours existant est réutilisé.
- **Les coordonnées dictées** sont dans `voice_work_requests` : aucune politique RLS, lisible seulement par le porteur du jeton (`voice_work_request_preview`). Elles sont effacées dès que le lien a servi (déclencheur sur `project_transfers`), ou à la préparation suivante quand le lien a expiré.
- **Limites** :
  - 3 demandes par numéro et par jour ;
  - 3 e-mails par adresse et par jour (ceux de Camille) ;
  - une seule demande par appel d'outil, même si Vapi rejoue la requête.
- **Bouton** : « Parler à Camille » dans la fenêtre de l'assistant des particuliers, seulement si `NEXT_PUBLIC_VAPI_CLIENT_ASSISTANT_ID` est renseignée.

## Conséquences
- La session anonyme est créée depuis l'Edge Function : les limites de Supabase par adresse IP (créations de comptes anonymes : 30 par heure ; analyse : 20 par heure) valent pour l'ensemble des appels. Elles suffisent pour les essais ; avant un numéro public, il faudra relever ces limites ou passer par un compte de service.
- Coût : 4 à 6 minutes d'appel, soit environ 0,35 à 0,55 € par demande, plus l'analyse du besoin.
- `TODO(legal)` :
  - la voix et la transcription sont traitées par Vapi (États-Unis) ;
  - il faut informer le particulier (IA, enregistrement éventuel, données) au début de l'appel.
  - À faire valider par l'avocat avant un numéro public.
- Plus tard : l'outil « où en est ma demande ? » (réponse par e-mail) et un numéro en 04.
