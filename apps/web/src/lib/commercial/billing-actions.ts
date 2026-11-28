"use server";

import { isValidIban, isValidSiret } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getCommercialSpace } from "./space";

const t = fr.commercialGains;
const GAINS = "/commercial/resultats";

/** Conseiller actif (la démo et un conseiller suspendu n'écrivent rien). */
async function activeSpace() {
  const space = await getCommercialSpace();
  return space.active && !space.demo ? space : null;
}

/** Informations de facturation des factures préparées (F-197, ADR 0397). */
export async function saveCommercialBilling(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const e = t.billing.errors;
  const name = (text(formData, "name") ?? "").replace(/\s+/g, " ").trim();
  const siret = (text(formData, "siret") ?? "").replace(/\s+/g, "");
  const address = (text(formData, "address") ?? "").replace(/\s+/g, " ").trim();
  const vatMode = text(formData, "vatMode") === "assujetti" ? "assujetti" : "franchise";
  const vatNumber = (text(formData, "vatNumber") ?? "").replace(/\s+/g, "").toUpperCase();
  const iban = (text(formData, "iban") ?? "").replace(/[\s-]+/g, "").toUpperCase();
  const prefix = (text(formData, "prefix") ?? "").trim().toUpperCase();
  const numberRaw = text(formData, "number") ?? "1";
  const number = /^\d{1,6}$/.test(numberRaw) ? Number(numberRaw) : NaN;
  const values = {
    name,
    siret,
    address,
    vatMode,
    vatNumber,
    iban: text(formData, "iban") ?? "",
    prefix,
    number: numberRaw,
  };
  const fieldErrors: Record<string, string[]> = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = [e.name];
  if (!isValidSiret(siret)) fieldErrors.siret = [e.siret];
  if (address.length < 5 || address.length > 250) fieldErrors.address = [e.address];
  if (vatMode === "assujetti" && !/^[A-Z]{2}[0-9A-Z]{8,12}$/.test(vatNumber)) {
    fieldErrors.vatNumber = [e.vatNumber];
  }
  if (!isValidIban(iban)) fieldErrors.iban = [e.iban];
  if (!/^[A-Z0-9-]{1,20}$/.test(prefix)) fieldErrors.prefix = [e.prefix];
  if (!(number >= 1 && number <= 999_999)) fieldErrors.number = [e.number];
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const space = await activeSpace();
  if (!space) return { error: fr.commercialProspects.errors.suspended, values };
  const { error } = await space.supabase.rpc("commercial_save_billing", {
    p_legal_name: name,
    p_siret: siret,
    p_address: address,
    p_vat_mode: vatMode,
    p_vat_number: vatMode === "assujetti" ? vatNumber : "",
    p_iban: iban,
    p_invoice_prefix: prefix,
    p_next_number: number,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  revalidatePath("/commercial/demarrer");
  revalidatePath("/commercial/facturation");
  return { success: t.billing.saved };
}

type Result = { status: "ok"; message?: string } | { status: "error"; message: string };

/** Émettre la facture préparée d'un relevé, après la case « J'ai vérifié ». */
export async function issueCommercialInvoice(
  statementId: string,
  confirmed: boolean,
): Promise<Result> {
  const e = t.statement.errors;
  if (!confirmed) return { status: "error", message: e.confirm ?? fr.errors.generic };
  if (!z.uuid().safeParse(statementId).success) {
    return { status: "error", message: e.not_found ?? fr.errors.generic };
  }
  const space = await activeSpace();
  if (!space) return { status: "error", message: fr.commercialProspects.errors.suspended };
  const { data, error } = await space.supabase.rpc("commercial_issue_invoice", {
    p_statement: statementId,
  });
  if (error || !data) {
    return {
      status: "error",
      message: error?.code === "22023" ? error.message : fr.errors.generic,
    };
  }
  revalidatePath(GAINS);
  revalidatePath(`${GAINS}/releve/${statementId}`);
  return { status: "ok" };
}

/** Facture déposée par le conseiller (PDF), vérifiée et rangée par process-upload. */
export async function storeCommercialInvoice(
  statementId: string,
  path: string,
  invoiceNumber: string,
): Promise<Result> {
  const e = t.statement.errors;
  if (
    !z.uuid().safeParse(statementId).success ||
    typeof path !== "string" ||
    path.length > 200 ||
    typeof invoiceNumber !== "string" ||
    invoiceNumber.length > 40
  ) {
    return { status: "error", message: e.unavailable ?? fr.errors.generic };
  }
  const space = await activeSpace();
  if (!space) return { status: "error", message: fr.commercialProspects.errors.suspended };
  const { data, error } = await space.supabase.functions.invoke<{ status: string }>(
    "process-upload",
    {
      method: "POST",
      body: { purpose: "commercial_invoice", path, statementId, invoiceNumber },
    },
  );
  let status = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = payload?.status ?? "unavailable";
  } else if (error) {
    status = "unavailable";
  }
  if (status !== "ok") {
    return { status: "error", message: e[status] ?? e.unavailable ?? fr.errors.generic };
  }
  revalidatePath(GAINS);
  revalidatePath(`${GAINS}/releve/${statementId}`);
  return { status: "ok" };
}
