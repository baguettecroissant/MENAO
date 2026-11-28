import { PREPARED_SIGNUP_KEY_PATTERN, preparedDraftFromStored } from "@menao/core";
import type { Metadata, Route } from "next";
import { z } from "zod";
import { PreparedLanding } from "@/components/pro/signup/prepared-landing";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.commercialField.preparedLanding;

export const metadata: Metadata = { title: `${t.metaTitle} — MENAO`, robots: { index: false } };

const openedSchema = z.object({
  advisor: z.string().nullable(),
  code: z.string().nullable(),
  company_name: z.string().nullable(),
  siret: z.string(),
  draft: z.unknown(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

/**
 * Lien personnel de l'artisan (F-195, lot 84, ADR 0395), ouvert sans compte : ce que son conseiller
 * a préparé avec lui, puis il finit lui-même son inscription par le parcours habituel. Rien n'est
 * affiché si le lien a expiré, a déjà servi ou a été effacé.
 */
export default async function PreparedSignupPage({
  params,
}: PageProps<"/pro/inscription/preparee/[cle]">) {
  const { cle } = await params;
  const supabase = await createClient();
  const { data } = PREPARED_SIGNUP_KEY_PATTERN.test(cle)
    ? await supabase.rpc("prepared_signup_open", { p_key: cle })
    : { data: null };
  const parsed = openedSchema.safeParse(data);

  if (!parsed.success) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
          {t.invalidTitle}
        </h1>
        <p className="text-[0.9375rem] text-muted-foreground">{t.invalidText}</p>
        <ButtonLink href={"/pro/inscription" as Route} className="self-start">
          {t.signup}
        </ButtonLink>
      </main>
    );
  }

  const v = parsed.data;
  const draft = preparedDraftFromStored(v.draft);
  const { data: trades } = draft.tradeCodes.length
    ? await createPublicClient().from("trades").select("code, label").in("code", draft.tradeCodes)
    : { data: [] };
  const labels = draft.tradeCodes.map((c) => trades?.find((x) => x.code === c)?.label ?? c);

  return (
    <PreparedLanding
      keyValue={cle}
      advisor={v.advisor}
      code={v.code}
      companyName={v.company_name}
      siret={v.siret}
      tradeLabels={labels}
      zone={
        draft.base
          ? fr.commercialField.prepare.zoneValue(draft.radiusKm, draft.company?.city ?? null)
          : null
      }
      draft={draft}
      prefill={{ firstName: v.first_name, lastName: v.last_name, email: v.email, phone: v.phone }}
    />
  );
}
