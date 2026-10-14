# ADR 0090 — Relance « Paiement en attente », fenêtre « depuis votre poche » et textes des notifications

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
L'audit des maquettes du 14 octobre 2026 relève trois éléments absents.

- **Relance « Paiement en attente »** : notification au client dont le devis est signé mais l'acompte non réglé.
- **Fenêtre « Suivez tous vos chantiers, depuis votre poche »** sur « Mes chantiers » : QR code et liens App Store / Google Play.
- **Rappel d'avis** : la maquette « Rappel de laisser un avis » titre « Menao a besoin de vous ! ».

Ces deux premiers éléments ne sont pas dans la spécification. L'utilisateur a demandé de les ajouter le 14 octobre 2026.

## Décision
- **Relance « Paiement en attente »** (`acompte_relance`) :
  - tâche quotidienne `app.remind_deposits` (pg_cron, 9 h), réservée à la base ;
  - chantiers au statut `devis_signe` avec un acompte prévu à la signature, sans paiement payé ni en cours de confirmation (virement, prélèvement), signés depuis 2 à 30 jours ;
  - une seule relance par chantier (une notification `acompte_relance` existe déjà) ;
  - préférence « rappels » (désactivable), comme les autres relances ;
  - textes : « Paiement en attente », rappel que le paiement va directement sur le compte de l'artisan (règle 12), bouton « Payer l'acompte » vers le chantier ;
  - même contenu pour l'e-mail, la notification push et le centre de notifications (`@menao/emails`) ;
  - test pgTAP : délais, relance unique, acompte payé ou en cours, catégorie, droits, tâche planifiée.
- **Fenêtre « depuis votre poche »** sur « Mes chantiers » (site) :
  - affichée seulement si `NEXT_PUBLIC_APP_STORE_URL` ou `NEXT_PUBLIC_PLAY_STORE_URL` est renseignée, donc masquée tant que l'application n'est pas publiée ;
  - sur ordinateur seulement (le QR code se scanne avec le téléphone), une fois par navigateur (stockage local) ;
  - le QR code renvoie à `/application`, qui redirige vers le store du téléphone (App Store sur iPhone et iPad, Google Play sur Android), sinon vers l'accueil ;
  - QR code tracé en SVG côté serveur avec `toqr`. C'est un encodeur sans dépendance de 13 Ko, sous licence MIT, déjà présent dans le dépôt (Expo CLI) ; il est ajouté aux dépendances du site sans nouveau téléchargement ;
  - pas de logos officiels des stores : boutons texte.
- **Rappel d'avis** (`avis_relance`) : objet et titre « MENAO a besoin de vous ! », aperçu de la maquette.
- La pastille « Travaux terminés le … » est gardée, au lieu de « Chantier achevé le … » (maquette) : le chantier n'est clôturé qu'après la réception et le solde.

## Conséquences
- **Mise en service**, après la fusion : pousser les deux migrations sur staging, puis redéployer la fonction `notify`, qui embarque les textes de `@menao/emails`.
- **Après la publication de l'application** : renseigner les deux variables dans Vercel pour afficher la fenêtre.
