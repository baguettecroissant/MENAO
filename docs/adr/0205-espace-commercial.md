# ADR 0205 — Espace commercial, lot 1 : compte, code d'inscription et guide terrain

- Statut : accepté
- Date : 29 octobre 2026
- Complète les ADR 0004 (rôles), 0136 (programme Partenaires), 0139 (espace partenaire) et 0143 (parrainage).

## Contexte
- **Demande de l'utilisateur** (28 octobre 2026) : un outil propre aux commerciaux de terrain (process, kit terrain, suivi), pour ne pas leur donner le plan marketing complet. Proposition en 3 lots acceptée ; le lot 1 est lancé le 29 octobre (« code directement »).
- **Lot 1** : le compte commercial, son code d'inscription (lien et QR code) qui rattache les artisans inscrits, et le guide terrain. Lot 2 : suivi des prospects. Lot 3 : résultats, primes et tableau de suivi dans le back-office.
- **Contraintes** : rôles dans `app_metadata` (règle 7) ; aucun traceur pour l'attribution (ADR 0136) ; montants des primes non décidés (règle 15) ; contrats des commerciaux chez l'avocat (question n°3 du plan marketing).

## Décision
- **Un vrai compte, avec un rôle `commercial`**, plutôt qu'un lien privé comme l'espace partenaire : le lot 2 demandera des écritures (prospects, relances) au nom d'une personne.
  - Valeur ajoutée à l'enum `app_role` dans une migration à part ; jamais obtenue par l'inscription (`before_auth_user_insert` n'accepte que « artisan »), test pgTAP à l'appui.
  - Compte créé par un admin (session aal2) depuis le back-office (« Commerciaux ») : l'Edge Function `commercial-invite` crée le compte avec la clé serveur (`inviteUserByEmail`, puis rôle posé), puis enregistre la fiche au nom de l'admin (`admin_register_commercial` : contrôle du rôle et du code, journal d'audit). En cas d'échec, le compte est retiré.
  - E-mail d'invitation en français (`supabase/templates/invite.html`, lien `token_hash` vers `/auth/confirm?type=invite`), puis choix du mot de passe et arrivée sur `/commercial`. Lien valable une heure ; ensuite, « Mot de passe oublié ».
  - Dans l'application native, un commercial voit un écran qui ouvre son espace sur le site (même espace « équipe » que le back-office).
- **Code et attribution** :
  - table `commercials` (code, nom, statut actif/suspendu) et `commercial_attributions` (un artisan, un commercial, premier code reçu) ;
  - le code partage l'espace des liens `/p/<code>` avec les partenaires et les parrains : unique dans les trois (`app.link_code_taken`, déclencheur sur `partners`, `new_referral_code`) et définitif, car imprimé ;
  - même champ que les partenaires (`signup.partner_code`) : lu dans l'adresse sur le site (`/p/<code>/pro`, aucun traceur), saisi à l'étape « Compte » dans l'application ; `app.apply_artisan_signup` essaie partenaire, puis commercial actif, puis parrain ;
  - un commercial suspendu n'attribue plus rien et ne voit plus ses inscrits.
- **Ce que voit le commercial** : sa fiche (RLS), ses inscrits par `my_commercial_signups` (nom de l'entreprise, étape, date) ; aucune fiche artisan en direct, aucune donnée de particulier, rien du back-office.
- **Espace `/commercial`** (coque de l'application, pensé pour le téléphone) :
  - « Mon code » : code, lien, QR code agrandissable, copie, envoi par WhatsApp, inscrits ;
  - « Guide terrain » : 8 rubriques (`apps/web/src/content/commercial/guide.ts`, blocs des guides du site, registre séparé : jamais dans le plan du site ni indexé) ;
  - « Cartes à imprimer » : planche A4 de cartes (même composant que les cartes des artisans, ADR 0161) avec le code et le QR code.
- **Guide terrain** : repris du plan marketing, sans budget, objectifs internes, montants de primes, noms de concurrents ni décisions non tranchées. Les contradictions du plan sont tranchées dans le sens prudent : appels en semaine de 10 h à 13 h et de 14 h à 20 h ; pas de proposition de l'abonnement à l'année pendant ou à la fin de l'essai ; date du bilan « mi-mai » à confirmer. Les passages qui attendent l'avocat portent un `TODO(legal)`.

## Conséquences
- Pendant la pré-ouverture, `/commercial` et l'inscription des artisans restent derrière le code testeurs du site (ADR 0101), comme tout le site : à lever pour les pros avant les tournées de janvier (décision de lancement).
- Nouveau secret à déployer : aucun. À déployer : migrations, Edge Function `commercial-invite`, modèle d'e-mail `invite` (`scripts/supabase-auth.mjs`).
- Lot 2 : prospects (statuts, relances, carte, import Sirene) avec la liste « ne plus contacter ». Lot 3 : résultats et primes (montants réglés dans le back-office, jamais dans le code), tableau par commercial.
- TODO(legal) : conditions d'utilisation de l'espace et contrat des commerciaux (question n°3 pour l'avocat) ; prospection téléphonique des micro-entrepreneurs (question n°2).
