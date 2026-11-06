# ADR 0229 — « Où en est ma demande ? » avec Camille

- Statut : accepté
- Date : 6 novembre 2026
- F-79, demandé le 6 novembre 2026 (« fais "Où en est ma demande ?" pour les particuliers »). Suite des ADR 0227 (demande de travaux par téléphone) et 0228 (une seule Camille). Même principe que l'état du dossier d'un artisan (ADR 0225).

## Décision
- **Rien n'est dit au téléphone.** L'appelant n'est pas identifié : Camille demande l'adresse e-mail du compte, la relit, puis l'outil `envoyer_etat_demandes` envoie l'état des demandes à cette adresse seulement. Sa réponse est la même que l'adresse ait un compte ou non.
- **Le contenu** (`voice_requests_for_email`, rôle service seulement) :
  - les 5 derniers projets envoyés depuis 120 jours, avec la réponse de chaque artisan (en attente, acceptée, pas disponible, sans réponse à temps, annulée, en vérification) ;
  - une phrase pour choisir un autre artisan quand aucun n'a donné suite ;
  - les demandes préparées au téléphone qui attendent encore la vérification du particulier, même sans compte, avec un rappel de l'e-mail « Votre demande de travaux est prête ».
- **Rien pour** une adresse inconnue, un compte artisan ou une session anonyme. Les noms d'artisans sont ceux que le particulier voit déjà dans son espace ; aucune coordonnée d'artisan dans l'e-mail.
- **Limites** : celles des e-mails de Camille, soit 3 par adresse et par jour et 100 par heure en tout.

## Conséquences
- Test pgTAP `119_etat_demandes_camille`.
- La consigne de Camille côté particuliers gagne une section, et l'assistante l'outil `envoyer_etat_demandes` (configuration dans Vapi).
