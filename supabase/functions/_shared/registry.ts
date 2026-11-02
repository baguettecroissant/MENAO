// Entreprise vérifiée au registre, à la place du Kbis déposé (ADR 0217) : lecture de l'annuaire
// public des entreprises (API Recherche d'entreprises de l'État : registre national des entreprises
// et Sirene), puis, si l'inscrit figure parmi les dirigeants d'une entreprise active, fiche de
// vérification datée rangée comme Kbis validé (record_registry_check). Jamais bloquant : si
// l'annuaire ne répond pas, le Kbis reste simplement à déposer.
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  matchingManager,
  parseRegistrySearch,
  registryOutcome,
  registrySearchUrl,
} from "../../../packages/core/src/registry.ts";
import { registryCheckFilename } from "../../../packages/documents/src/registry-model.ts";
import { renderRegistryCheckPdf } from "../../../packages/documents/src/registry-pdf.ts";

const BASE_URL =
  Deno.env.get("RECHERCHE_ENTREPRISES_BASE_URL") || "https://recherche-entreprises.api.gouv.fr";
const BUCKET = "artisan-documents";

type RecordResult = { resultat: "document" | "conserve" | "enregistre"; retires: string[] };

export async function checkRegistry(
  admin: SupabaseClient,
  artisan: { id: string; siret: string; userId: string },
): Promise<void> {
  const siren = artisan.siret.slice(0, 9);
  const [fiche, profile, deposited] = await Promise.all([
    admin.from("artisans").select("status, is_dirigeant").eq("id", artisan.id).maybeSingle(),
    admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", artisan.userId)
      .maybeSingle(),
    admin
      .from("artisan_documents")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisan.id)
      .eq("type", "kbis")
      .eq("source", "depot")
      .in("status", ["en_attente", "valide"]),
  ]);
  const person = {
    firstName: profile.data?.first_name ?? null,
    lastName: profile.data?.last_name ?? null,
    isDirigeant: fiche.data?.is_dirigeant ?? null,
  };

  let res: Response;
  try {
    res = await fetch(registrySearchUrl(BASE_URL, siren), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("registre : annuaire injoignable", error instanceof Error ? error.name : "");
    return;
  }
  if (!res.ok) {
    console.error(`registre : réponse de l'annuaire ${res.status}`);
    return;
  }
  const entry = parseRegistrySearch(await res.json(), siren);
  const outcome = registryOutcome(entry, person);

  // Fiche seulement pendant l'inscription, et pas à côté d'un Kbis déposé par l'artisan.
  let document: { storage_path: string; size_bytes: number } | null = null;
  const manager =
    entry && person.firstName && person.lastName
      ? matchingManager(entry.managers, { firstName: person.firstName, lastName: person.lastName })
      : null;
  const editable =
    (fiche.data?.status === "brouillon" || fiche.data?.status === "refuse") && !deposited.count;
  if (outcome === "verifie" && entry && manager && editable) {
    const checkedAt = new Date().toISOString();
    const bytes = await renderRegistryCheckPdf({
      siren,
      siret: artisan.siret,
      companyName: entry.name,
      legalFormCode: entry.legalFormCode,
      creationDate: entry.creationDate,
      manager,
      member: { firstName: person.firstName ?? "", lastName: person.lastName ?? "" },
      checkedAt,
    });
    const path = `${artisan.id}/${registryCheckFilename(checkedAt)}`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (error) console.error("registre : fiche non enregistrée dans le stockage");
    else document = { storage_path: path, size_bytes: bytes.length };
  }

  const { data, error } = await admin.rpc("record_registry_check", {
    p_artisan_id: artisan.id,
    p_outcome: outcome,
    p_document: document,
  });
  const result = data as RecordResult | null;
  const remove = [
    ...(document && (error || result?.resultat !== "document") ? [document.storage_path] : []),
    ...(result?.retires ?? []),
  ];
  if (remove.length) await admin.storage.from(BUCKET).remove(remove);
  if (error) console.error(`registre : enregistrement impossible (${error.code})`);
}
