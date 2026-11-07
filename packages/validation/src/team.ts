import { TEAM_ROLES } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

const name = z
  .string({ error: messages.required })
  .trim()
  .min(1, { error: messages.required })
  .max(100, { error: messages.tooLong });

/**
 * Invitation d'un membre de l'équipe par le patron (F-89, ADR 0240) : prénom, nom, adresse
 * e-mail et rôle (chef d'équipe ou ouvrier). Même règle sur le site et dans l'application.
 */
export const teamInviteSchema = z.object({
  firstName: name,
  lastName: name,
  email: z
    .string({ error: messages.required })
    .trim()
    .toLowerCase()
    .max(320, { error: messages.tooLong })
    .pipe(z.email({ error: messages.emailInvalid })),
  role: z.enum(TEAM_ROLES, { error: messages.teamRole }),
});
export type TeamInvite = z.infer<typeof teamInviteSchema>;
