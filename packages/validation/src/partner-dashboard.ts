import { z } from "zod";

const count = z.number().int().nonnegative();
const cents = z.number().int().nonnegative();

/**
 * Espace partenaire (F-59, ADR 0139), réponse de `partner_dashboard` : chiffres et montants du
 * partenaire, sans donnée personnelle. Null : lien inconnu ou renouvelé.
 */
const partnerDashboardSchema = z.object({
  nom: z.string().min(1),
  code: z.string().regex(/^[a-z0-9-]{3,32}$/),
  status: z.enum(["actif", "suspendu"]),
  projects: count,
  qualified: count,
  artisans: count,
  paying: count,
  pending_cents: cents,
  validated_cents: cents,
  paid_cents: cents,
  montant_demande_centimes: cents.nullable(),
  montant_abonne_centimes: cents.nullable(),
  delai_validation_jours: count,
  /** Page de recommandation co-marquée en ligne (ADR 0142). */
  page_publique: z.boolean().default(false),
});
export type PartnerDashboard = z.infer<typeof partnerDashboardSchema>;

export function parsePartnerDashboard(data: unknown): PartnerDashboard | null {
  const parsed = partnerDashboardSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Page co-marquée d'un partenaire (ADR 0142), réponse de `partner_page`. Null : pas de page. */
const partnerPageSchema = z.object({
  nom: z.string().min(1),
  code: z.string().regex(/^[a-z0-9-]{3,32}$/),
  message: z.string().max(400).nullable(),
});
export type PartnerPage = z.infer<typeof partnerPageSchema>;

export function parsePartnerPage(data: unknown): PartnerPage | null {
  const parsed = partnerPageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
