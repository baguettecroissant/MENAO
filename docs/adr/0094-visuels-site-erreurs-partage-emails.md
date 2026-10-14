# ADR 0094 — Visuels du site : pages d'erreur, images de partage, logo des e-mails

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Revue des visuels manquants**, demandée par l'utilisateur le 14 octobre 2026. Trois manques concernent l'image de marque :
  - la page 404 et la page d'erreur étaient celles de Next.js, en anglais et sans habillage ;
  - un lien MENAO partagé (WhatsApp, SMS, réseaux sociaux) s'affichait sans image ;
  - les e-mails commençaient par le mot « menao » en texte, alors que la maquette « Nouveau devis disponible » montre un bandeau bleu clair avec le logo.
- **Contraintes** :
  - pas d'optimisation d'images Vercel et pas de service propriétaire (règle 13) ;
  - pas de nouvelle dépendance sans nécessité ;
  - aucune promesse ni donnée inventée (F-01).

## Décision
- **Pages d'erreur** :
  - illustrations maison en SVG (`components/site/illustrations.tsx`), au trait bleu des tokens, sans image externe ;
  - 404 dans la mise en page du site (`(site)/not-found.tsx`) et 404 générale avec le logo (`app/not-found.tsx`) ;
  - actions : « Retour à l'accueil », « Trouver un artisan », lien vers le contact ;
  - page d'erreur (`app/error.tsx`) : « Un imprévu sur le chantier », bouton « Réessayer », erreur transmise à Sentry ;
  - textes dans `fr.notFound` et `fr.errorPage`.
- **Images de partage** (Open Graph, 1 200 × 630, JPEG) :
  - fichiers statiques dans `public/images/og` : une image MENAO par défaut et une par métier (photo du métier, logo, titre « {Métier} dans les Alpes-Maritimes ») ;
  - générées une fois à partir des photos des métiers déjà présentes ; 1,4 Mo au total ;
  - `shareImage(code?)` dans `lib/site/images.ts` ;
  - l'image par défaut est déclarée dans la mise en page racine ; les pages métier et ville déclarent celle de leur métier (leur `openGraph` remplace celui du parent) ;
  - carte Twitter/X `summary_large_image`.
- **Logo des e-mails** :
  - PNG transparent servi par le site (`public/images/email/logo.png`, 342 × 96, affiché à 150 px de large) ;
  - `renderNotification` transmet l'adresse du site au modèle ; sans adresse, le mot « menao » reste affiché ;
  - balise `<img>` simple, sans composant React Email supplémentaire (aucune dépendance ajoutée, ni côté Node ni côté Deno) ;
  - mise en page de la maquette : bandeau bleu clair avec le logo centré, carte blanche, bouton centré, bande bleu clair de fermeture ;
  - espace insécable avant « ! ? : ; » dans le titre et les paragraphes.

## Conséquences
- **Mise en service** : la fonction `notify` est à redéployer sur staging après la fusion (modèle d'e-mail modifié).
- **Images** : le logo des e-mails est chargé depuis le site configuré dans `SITE_URLS` ; la première adresse doit servir les fichiers de `public/`. Les messageries qui bloquent les images affichent le texte de remplacement « MENAO ».
- **Mise à jour** : si les photos des métiers changent, il faut régénérer les images de partage.
