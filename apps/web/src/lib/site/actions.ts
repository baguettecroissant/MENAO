"use server";

import { messages } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: messages.emailInvalid })),
  subject: z.string().trim().max(150, { error: messages.tooLong }),
  message: z
    .string()
    .trim()
    .min(1, { error: messages.required })
    .max(2000, { error: messages.tooLong }),
});

/** Page Contact (F-03) : crée un ticket pour l'équipe (limité à 3 messages par jour et par e-mail). */
export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    email: text(formData, "email") ?? "",
    subject: text(formData, "subject") ?? "",
    message: text(formData, "message") ?? "",
  };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contact_message", {
    p_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  return { success: fr.pages.contact.sent };
}
