# 0390 — Retours terrain sur l'inscription : indésirables, MSA, validation

- Statut : acceptée
- Date : 2026-11-25
- Fonctionnalité : F-190

## Contexte

Premier essai d'inscription d'un artisan réel (paysagiste) le 24/11/2026, accompagné par un associé :

1. le code d'inscription est arrivé dans les courriers indésirables. L'envoi (Resend, expéditeur
   `notifications@menao.fr`, DKIM signé, modèles en français) est correct : la cause probable est la
   jeunesse du domaine ;
2. l'artisan cotise à la MSA (régime agricole), pas à l'URSSAF, alors que tous les textes ne parlent
   que d'« attestation URSSAF ». La MSA délivre l'attestation de vigilance aux artisans du régime
   agricole ; la lecture automatique (`read-document`) l'acceptait déjà ;
3. rien ne disait assez clairement, en bas du suivi du dossier, que la fiche n'est visible qu'après
   la validation de l'équipe.

## Décision

- Sous chaque écran qui attend un e-mail (code de l'inscription artisan, vérification de l'adresse,
  lien de connexion, confirmation avant l'envoi d'une demande), site et application : « Pas reçu ?
  Regardez dans vos courriers indésirables : l'e-mail vient de notifications@menao.fr. »
- Le document `urssaf` reste un seul type en base : ses libellés deviennent « Attestation de
  vigilance URSSAF ou MSA » (dépôt, aide, rappels, e-mails, contrôle dans le back-office, assistant).
  L'aide « Où trouver votre attestation ? » gagne une troisième option « MSA » avec le lien msa.fr.
  Les libellés des options sont raccourcis (« Micro », « Autre statut », « MSA ») pour tenir sur un
  téléphone.
- En bas du suivi du dossier (site) et à la fin de l'écran du dossier (application) : « Votre fiche
  n'est visible des clients qu'après la validation de votre dossier par l'équipe MENAO. Vous recevez
  un e-mail dès qu'il est validé. » (l'e-mail « Votre dossier MENAO est validé » existe déjà).

## Conséquences

- Aucune migration : le type de document, sa durée (6 mois) et le code de sécurité sont les mêmes.
- Le code de sécurité d'une attestation MSA se vérifie sur le site de la MSA ; la liste de contrôle
  du back-office le dit.
- Textes non modifiés : CGV artisans et guides commerciaux (« attestation URSSAF » y reste générique) ;
  à reprendre avec la version validée par l'avocat.
