"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const codeSchema = z.string().regex(/^\d{6}$/);

/** Vérifie un code TOTP : la session passe au niveau aal2 (cookies mis à jour). */
export async function verifyTotp(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = codeSchema.safeParse(text(formData, "code")?.replace(/\s/g, ""));
  const factorId = z.uuid().safeParse(text(formData, "factorId"));
  if (!code.success || !factorId.success)
    return { fieldErrors: { code: [fr.admin.mfa.invalidCode] } };

  const { supabase } = await requireAdmin({ requireMfa: false });
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factorId.data,
    code: code.data,
  });
  if (error) return { fieldErrors: { code: [fr.admin.mfa.invalidCode] } };

  redirect("/admin");
}
