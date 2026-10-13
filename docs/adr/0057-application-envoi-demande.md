# ADR 0057 — Application : fiche artisan et envoi de la demande (lot 6b, partie 3)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Depuis la partie 2 (ADR 0056), l'application affiche les artisans proposés, mais on ne peut ni voir leur fiche ni leur écrire.
- Sur le site :
  - le compte est demandé à l'envoi (F-08) ;
  - le projet de la session anonyme passe au compte grâce à un jeton de transfert (`create_project_transfer`, puis `claim_project`) ;
  - la demande part à 3 artisans au plus (F-11).

## Décision
- **Même mécanique que le site**, sans rien ajouter côté serveur :
  - places restantes lues dans `particulier_requests` ;
  - fiche lue par `artisan_public_profile` et `artisan_public_reviews` ;
  - transfert par `create_project_transfer` et `claim_project` ;
  - envoi par `send_project_requests`, après validation par `requestFormSchema`.
- **Sélection** sur l'écran des artisans :
  - jusqu'au nombre de places restantes (3, moins les artisans déjà sollicités) ;
  - bouton fixe « Envoyer ma demande » en bas de l'écran ;
  - la fiche de l'artisan propose aussi l'envoi direct, s'il reste une place.
- **Fiche de l'artisan** : identité, disponibilité, expérience, zone, temps de réponse, expertises, garanties, score MENAO, réalisations et derniers avis. Jamais de téléphone ni d'e-mail.
- **Étape compte**, quand la recherche a été faite sans compte :
  - **connexion** : le jeton est créé avant la connexion, puis le projet est rattaché au compte et le formulaire d'envoi s'affiche ;
  - **inscription** : jeton, puis inscription. Le lien de confirmation ouvre la page d'envoi du site, comme une inscription faite sur le site.
    - La demande reste aussi en attente dans le trousseau du téléphone (`kv`).
    - À la prochaine connexion dans l'application, depuis cette étape ou depuis l'onglet Compte, le projet est rattaché au compte et l'écran d'envoi s'ouvre.
    - Si le lien ouvert sur le site a déjà rattaché le projet, l'application continue.
- **Code partagé** :
  - la lecture de la fiche artisan passe dans `@menao/validation` (`artisan-profile.ts`) ;
  - l'assemblage des prénoms (`joinNames`) passe dans `@menao/core`, sans `Intl.ListFormat`, absent du moteur JavaScript de l'application (Hermes) ;
  - côté application, les formulaires d'inscription et de connexion sont communs aux écrans du compte et à l'étape compte.

## Conséquences
- **L'application ouvre désormais toute la recherche** : saisie, analyse, critères, artisans, fiche et envoi de la demande.
- **Mes chantiers** reste un écran d'attente qui renvoie au site : suivi des demandes et des chantiers à venir.
- **Pas encore dans l'application** :
  - « Envoyer mon dossier à MENAO » (aucun artisan trouvé) ;
  - photos et dictée ;
  - liens profonds vers l'application (le lien de confirmation s'ouvre sur le site).
