"use server";

import { timingSafeEqual } from "node:crypto";
import { safeRedirectPath } from "@menao/validation";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import {
  PRELAUNCH_COOKIE,
  PRELAUNCH_MAX_AGE,
  PRELAUNCH_PAGE,
  prelaunchToken,
} from "@/lib/site/prelaunch";

/** Code d'accès du mode pré-lancement : pose le cookie puis rouvre la page demandée. */
export async function enterPrelaunch(_: FormState, formData: FormData): Promise<FormState> {
  const expected = process.env.PRELAUNCH_ACCESS_CODE;
  const asked = safeRedirectPath(text(formData, "suite"), "/");
  const next = asked === PRELAUNCH_PAGE || asked.startsWith(`${PRELAUNCH_PAGE}?`) ? "/" : asked;
  if (!expected) redirect(next as Route);

  const code = text(formData, "code")?.trim() ?? "";
  const token = prelaunchToken(expected);
  if (!code || !timingSafeEqual(Buffer.from(prelaunchToken(code)), Buffer.from(token))) {
    // Ralentit les essais successifs.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { error: fr.prelaunch.access.wrong };
  }
  (await cookies()).set(PRELAUNCH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PRELAUNCH_MAX_AGE,
    path: "/",
  });
  redirect(next as Route);
}
