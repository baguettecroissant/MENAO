-- Délai de réponse des artisans : 72 h au lieu de 48 h (décision des associés du 22 octobre 2026,
-- ADR 0153). Les demandes déjà envoyées gardent leur échéance. L'essai de 2 mois est réglé côté
-- Stripe (packages/core TRIAL_DAYS, fonction billing-checkout) : rien à changer en base.
alter table public.requests alter column expires_at set default now() + interval '72 hours';
