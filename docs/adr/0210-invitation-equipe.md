# ADR 0210 — Invitation d'un admin ou d'un membre du support depuis le back-office

- Statut : accepté
- Date : 30 octobre 2026
- Reprend le déroulé de l'invitation des commerciaux (ADR 0205) ; la double authentification des admins reste celle de l'ADR 0008.

## Contexte
- **Demande de l'utilisateur** (30 octobre 2026) : « ajoute le bouton inviter un admin », pour ouvrir le back-office à l'associé, puis à la personne chargée de la validation des dossiers.
- **Avant** : un admin se créait par une requête SQL dans le tableau de bord Supabase, après une inscription normale (README). Les commerciaux, eux, avaient déjà leur invitation (ADR 0205).

## Décision
- **Back-office** : page « Personnes », filtre « Équipe MENAO » : formulaire prénom, nom, e-mail et accès (admin ou support). Un lien « Inviter un membre de l'équipe » y mène depuis les autres filtres. Pas de nouvelle entrée de menu.
- **Edge Function `staff-invite`** (même déroulé que `commercial-invite`) :
  - appelant admin en session aal2, sinon refus ;
  - 10 invitations par heure et par admin ;
  - jamais l'adresse d'un compte existant, même non confirmé (`auth_email_exists`) : une invitation ne donne jamais l'accès admin à un compte déjà utilisé ;
  - invitation Supabase (e-mail pour choisir le mot de passe), puis rôle posé dans `app_metadata` par la clé serveur (règle 7) ;
  - enregistrement par `admin_record_staff_invite` au nom de l'admin : contrôle de son rôle et du compte invité, journal `equipe.invitation` (rôle seulement, aucune adresse) ;
  - en cas d'échec, le compte invité est supprimé : jamais de compte à moitié créé.
- **E-mail** : le modèle `invite` a deux versions, commercial ou équipe, choisies par `user_metadata.equipe` posé à l'invitation. Ce n'est qu'un libellé, jamais un droit. L'objet devient « Votre accès à MENAO ».
- **Première connexion** : `/auth/confirm` → `/nouveau-mot-de-passe` → `/admin`, qui impose la double authentification (ADR 0008).

## Conséquences
- Plus de requête SQL pour nommer un admin ; la procédure SQL du README reste le recours (premier admin d'un nouveau projet).
- Retirer l'accès d'un admin se fait encore à la main (rôle remis à « particulier »), comme avant.
- Mise en service : migration, déploiement de `staff-invite`, et modèle `invite` à reposer dans la configuration Auth (`scripts/supabase-auth.mjs`, ou PATCH limité à l'objet et au contenu de l'invitation).
