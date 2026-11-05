import { roleFromAppMetadata, signupPending } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountStep } from "@/app/recherche/[id]/envoyer/account-step";
import { Alert, ButtonLink, Card, CardTitle, PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { oauthProviders } from "@/lib/auth/oauth";
import { matchArtisans } from "@/lib/project/artisans";
import { preparedRequestPath, sendPagePath } from "@/lib/project/paths";
import {
  continueWithProviderForPreparedRequest,
  signInForPreparedRequest,
  signUpForPreparedRequest,
} from "@/lib/project/request-actions";
import { createClient } from "@/lib/supabase/server";

const t = fr.search.prepared;
const TOKEN = /^[0-9a-f]{64}$/;

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  robots: { index: false },
  // Le jeton du lien ne part jamais vers un autre site.
  referrer: "no-referrer",
};

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Projet rattaché au compte : la page d'envoi avec les 3 premiers artisans du classement, déjà
 * choisis (modifiables) ; les critères d'abord si la commune ou le métier manque ; la liste des
 * artisans (et la demande à l'équipe) s'il n'y en a aucun.
 */
async function nextStep(supabase: Client, projectId: string): Promise<string> {
  const { error } = await supabase.rpc("validate_project_criteria", { p_project_id: projectId });
  if (error) return `/recherche/${projectId}`;
  const matches = await matchArtisans(supabase, projectId, 3);
  if (!matches?.length) return `/recherche/${projectId}/artisans`;
  return sendPagePath(
    projectId,
    matches.map((m) => m.artisan_id),
  );
}

function Expired() {
  return (
    <PageShell title={t.expiredTitle}>
      <div className="flex flex-col gap-5">
        <p className="text-muted-foreground">{t.expired}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/">{t.newRequest}</ButtonLink>
          <ButtonLink href="/connexion" variant="outline">
            {t.signIn}
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Demande de travaux préparée au téléphone par Camille (F-77, ADR 0227), ouverte depuis l'e-mail.
 * Compte particulier connecté : le projet lui est rattaché (jeton de transfert), puis la page
 * d'envoi. Sinon : la demande et la création du compte (ou la connexion), pré-remplies avec les
 * coordonnées dictées ; le lien de confirmation ramène ici.
 */
export default async function PreparedRequestPage({
  params,
}: PageProps<"/demande-preparee/[jeton]">) {
  const { jeton } = await params;
  if (!TOKEN.test(jeton)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (auth && !auth.claims.is_anonymous) {
    if (roleFromAppMetadata(auth.claims.app_metadata) !== "particulier") {
      return (
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Alert tone="error">{fr.search.request.notParticulier}</Alert>
        </main>
      );
    }
    // Compte Google ou Apple à finaliser (ADR 0108) : CGU d'abord, puis retour ici.
    if (signupPending(auth.claims.app_metadata)) {
      redirect(`/finaliser-compte?next=${encodeURIComponent(preparedRequestPath(jeton))}` as Route);
    }
    const { data: projectId, error } = await supabase.rpc("claim_project", { p_token: jeton });
    if (error || !projectId) return <Expired />;
    redirect((await nextStep(supabase, projectId)) as Route);
  }

  const { data } = await supabase.rpc("voice_work_request_preview", { p_token: jeton });
  const preview = data?.[0];
  if (!preview) return <Expired />;
  const place = [preview.trade_label, preview.ville_nom].filter(Boolean).join(" · ");

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {t.title(preview.first_name)}
          </h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        {(preview.summary || place) && (
          <Card className="flex flex-col gap-2">
            <CardTitle title={t.project} description={place || undefined} />
            {preview.summary && <p className="text-sm">{preview.summary}</p>}
          </Card>
        )}
        <AccountStep
          actions={{
            signUp: signUpForPreparedRequest.bind(null, jeton),
            signIn: signInForPreparedRequest.bind(null, jeton),
            provider: continueWithProviderForPreparedRequest.bind(null, jeton),
          }}
          providers={oauthProviders}
          defaults={{
            firstName: preview.first_name,
            email: preview.email,
            phone: preview.phone.replace(/^\+33/, ""),
          }}
        />
      </div>
    </main>
  );
}
