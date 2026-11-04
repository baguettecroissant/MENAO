"use server";

import { messages, proCallbackSchema, siretSchema } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
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
  // Compte connecté : la réponse de l'équipe arrive dans « Mes échanges avec MENAO » (ADR 0041).
  const { data: auth } = await supabase.auth.getClaims();
  const follow = Boolean(auth && !auth.claims.is_anonymous);
  return { success: fr.pages.contact.sent, ...(follow ? { values: { suivi: "1" } } : {}) };
}

/**
 * « Être rappelé » depuis l'assistant des pages Pro (ADR 0218) : ticket rappel_pro pour l'équipe
 * (2 demandes par téléphone ou par e-mail et par 24 h).
 */
export async function requestProCallback(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    first_name: text(formData, "first_name") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
    trade: text(formData, "trade") ?? "",
    city: text(formData, "city") ?? "",
  };
  const parsed = proCallbackSchema.safeParse({ ...values, consent: checkbox(formData, "consent") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_pro_callback", {
    p_first_name: parsed.data.first_name,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email,
    ...(parsed.data.trade ? { p_trade: parsed.data.trade } : {}),
    ...(parsed.data.city ? { p_city: parsed.data.city } : {}),
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  return { success: fr.pro.assistant.callbackForm.sent };
}

const partnerApplicationSchema = z.object({
  company: z.string().trim().min(2, { error: fr.pages.partners.errors.company }).max(120),
  siret: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(siretSchema),
  email: contactSchema.shape.email,
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), {
      error: fr.pages.partners.errors.website,
    }),
  message: z
    .string()
    .trim()
    .min(10, { error: fr.pages.partners.errors.message })
    .max(1700, { error: fr.pages.partners.errors.message }),
});

/**
 * Candidature au programme Partenaires (F-59, ADR 0139) : professionnels seulement (SIRET
 * vérifié), envoyée à l'équipe comme un message de contact (ticket), avec les mêmes limites.
 */
export async function applyAsPartner(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["company", "siret", "email", "website", "message"].map((k) => [k, text(formData, k) ?? ""]),
  );
  const parsed = partnerApplicationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const p = fr.pages.partners;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contact_message", {
    p_email: parsed.data.email,
    p_subject: p.subject(parsed.data.company).slice(0, 150),
    p_message: p.body(parsed.data),
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  return { success: p.sent };
}
