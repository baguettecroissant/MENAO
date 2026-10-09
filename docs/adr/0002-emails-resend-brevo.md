# ADR 0002 — E-mails et SMS : Resend + Brevo

- Statut : accepté
- Date : 9 octobre 2026

## Décision
- **Resend** pour les e-mails transactionnels (modèles React Email dans `packages/emails`) et le SMTP des e-mails d'authentification Supabase.
- **Brevo** pour les SMS de notification et le marketing (prospection artisans, newsletters).
- Les deux derrière une interface `NotificationProvider` : changer de fournisseur ne touche pas le code métier.

## Raisons
- Resend : intégration la plus simple avec React Email et Supabase, tarif bas aux volumes prévus.
- Brevo : SMS (absents chez Resend), CRM et campagnes marketing, entreprise française.

## Points à vérifier
- Localisation des données dans les DPA de Resend et Brevo (RGPD).
- Le code OTP de signature est en principe envoyé par le prestataire de signature, ce qui réduit le volume de SMS.
