# ADR 0183 — Notifications manquantes

- Statut : accepté
- Date : 24 octobre 2026
- Audit du 24 octobre 2026 demandé par l'utilisateur (« qu'on n'ait rien oublié ») : les 53 types de notification existants sont bien envoyés par e-mail, en push et dans le centre de notifications, avec les mêmes textes. Six étapes importantes ne prévenaient personne ; l'utilisateur a validé leur ajout (« oui ajoute les 6 »).

## Décision
Sept types de notification, mêmes canaux et mêmes textes que les autres (`@menao/emails`, push sauf abonnement, centre de notifications) :

1. **`demande_envoyee`** (particulier) : « Votre demande a été envoyée à N artisans », avec le délai de réponse de 72 heures. **Une seule confirmation par envoi**, même pour un chantier à plusieurs métiers (le nombre compte les demandes de tous les lots). Une demande retenue pour vérification (ADR 0157) ne se révèle pas : elle n'est ni comptée ni confirmée.
2. **`dossier_envoye`** (artisan) : « Votre dossier MENAO est bien reçu » (ou « Votre dossier complété… » quand il le renvoie), avec les documents verrouillés pendant la vérification. L'alerte de l'équipe (ADR 0050) ne change pas.
3. **`devis_relance`** (particulier), pour la dernière version envoyée d'un devis encore sans réponse :
   - 3 jours après l'envoi : « Le devis de {artisan} vous attend » ;
   - 3 jours avant la fin de validité : « Votre devis expire le {date} », avec la possibilité de demander une nouvelle version ensuite.
   **`devis_expire`** (artisan) : le lendemain de la fin de validité, l'artisan sait que le client ne peut plus signer (sauf nouvelle version).
4. **`avis_reponse`** (particulier) : « {artisan} a répondu à votre avis », avec la réponse.
5. **`demarrage_rappel`** (particulier et artisan), la veille du démarrage : l'heure, et pour l'artisan le nom du client et l'adresse. Une date modifiée redonne un rappel la veille de la nouvelle date.
6. **`filleul_valide`** (parrain) : « {filleul} a rejoint MENAO ». Rien sur l'abonnement ni sur le mois offert (règle 10 : le texte part aussi en push). Pas de notification pour un parrainage annulé ou entre deux fiches de la même entreprise.

**Préférences** : les relances et rappels (`devis_relance`, `demarrage_rappel`) se coupent avec « Rappels », la réponse à un avis et le filleul validé avec « Activité » ; les confirmations (`demande_envoyee`, `dossier_envoye`) et le devis expiré restent toujours envoyés.

## Technique
- Migrations `types_notifications_manquantes` (valeurs de l'énumération) et `notifications_manquantes` :
  - `app.requests_notify_sent()` : déclencheur de contrainte **différé**, exécuté à la validation de l'envoi, quand toutes les demandes du chantier existent ; une seule notification par chantier et par transaction ;
  - `app.artisans_notify_submission()` complétée ;
  - `app.remind_quotes()` (tâche `menao-relance-devis`, chaque jour à 9 h) et `app.remind_chantier_starts()` (tâche `menao-rappel-demarrage`, chaque jour à 8 h), avec l'instant de référence en paramètre pour les tests ;
  - déclencheurs `reviews_notify_reply` et `artisans_notify_referrer` ;
  - `app.notification_category()` complétée, comme `OPTIONAL_NOTIFICATIONS` (`packages/core`).
- Les tâches ne prévoient qu'une notification de chaque sorte (par devis et moment, par chantier et date de démarrage, par filleul).
- Liens : `/mon-espace`, `/mon-espace/devis/{id}`, `/pro/onboarding`, `/pro/chantiers/{id}`, `/pro/mon-profil#parrainage`, déjà ouverts dans l'application par `appRouteForSitePath`.
- Test pgTAP `100_notifications_manquantes` ; le test 33 écarte les accusés de réception, hors de son sujet.

## Conséquences
- Après la fusion : `db push` sur staging, puis **redéployer `notify`** (elle importe les textes de `@menao/emails`).
- Pas de nouvelle dépendance.
