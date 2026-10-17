# ADR 0114 — Statut « Radié »

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0047 (suspension par l'équipe) et 0104 (charte qualité).

## Contexte
- **Cahier des charges du CEO** (« Inscription et vérification des artisans ») : un statut « Radié » pour une exclusion définitive (fraude, manquement grave à la charte), sans visibilité.
- **Charte qualité** : elle prévoit déjà « 4. Radiation : retrait définitif du réseau Menao ».
- **Décision de l'utilisateur** (17 octobre 2026) : le mettre en place.

## Décision
- **Nouveau statut** `radie` (`artisan_status`), avec la date et le motif (`radiated_at`, `radiation_reason`).
- **Radiation** (`admin_radiate_artisan`) :
  - réservée à un admin avec double authentification ;
  - motif obligatoire, quel que soit le statut du dossier (y compris avant la validation, en cas de fraude) ;
  - tracée dans le journal (`artisan.radie`) ;
  - l'artisan reçoit l'e-mail « Votre compte MENAO a été radié » avec le motif.
- **Définitive** :
  - aucune fonction de réactivation, et un déclencheur refuse tout changement de statut d'un artisan radié ;
  - une levée exceptionnelle reste possible en base, avec `menao.levee_radiation`, tracée par l'équipe ;
  - la tâche quotidienne et les relances de documents ne concernent que les artisans validés ou suspendus.
- **Visibilité** : jamais, puisque `artisan_is_visible` exige un dossier validé.
- **Accès** : comme un artisan suspendu, il garde son espace pro (chantiers en cours, factures, documents) ; un message permanent rappelle la radiation, sur le site et dans l'application.
- **Back-office** : section « Radiation » sur la fiche de l'artisan (motif et case de confirmation « la radiation est définitive »), filtre « Radiés » dans la liste.

## Conséquences
- **Chantiers en cours et demandes déjà reçues** : comme pour une suspension, rien n'est annulé automatiquement. L'équipe les traite au cas par cas.
- **`TODO(legal)`** : règlement P2B (UE 2019/1150, art. 4) : préavis de 30 jours, sauf manquements graves ou répétés. La motivation, la réclamation et la mention dans les CGV artisans sont à faire valider.
