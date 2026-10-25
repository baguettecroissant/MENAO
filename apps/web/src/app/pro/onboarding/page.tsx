import {
  CHARTER_RULE_COUNT,
  REQUIRED_DOCUMENT_TYPES,
  documentState,
  dossierItemCount,
  dossierItemsLeft,
  zoneDemandShown,
  type DocumentState,
} from "@menao/core";
import {
  Building2,
  CalendarDays,
  Users,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Lock,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, ButtonLink, Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { SubmitOnboarding } from "./submit-onboarding";

const t = fr.pro.onboarding;
const d = t.dossier;

type Tone = "todo" | "pending" | "done" | "danger";

const chipTone: Record<Tone, string> = {
  todo: "bg-primary-softer text-primary-strong",
  pending: "bg-warning-soft text-warning",
  done: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

const documentTone: Record<DocumentState, Tone> = {
  missing: "todo",
  en_attente: "pending",
  valide: "done",
  refuse: "danger",
  a_refaire: "danger",
};

/**
 * « Faire vérifier mon entreprise » (ADR 0111) : la liste de ce qu'il reste à faire avant l'envoi
 * du dossier (entreprise, charte, chaque document, profil public), chaque élément ouvrant sa
 * page, puis l'envoi. Après l'envoi, la même liste montre l'état du dossier ; pour un artisan
 * validé, c'est « Mon dossier » (renouvellement des documents).
 */
export default async function OnboardingIndexPage() {
  const { supabase, artisan, progress, canSubmit, visibility, snapshot, documents } =
    await getOnboardingContext();
  const editable = artisan.status === "brouillon" || artisan.status === "refuse";
  const validated = artisan.status === "valide" || artisan.status === "suspendu";
  // Demande de la zone (ADR 0182), une fois les métiers et la zone choisis, avant la validation.
  const zoneDemand =
    !validated && progress.metiers && progress.zone ? await loadZoneDemand(supabase) : null;
  const left = dossierItemsLeft(snapshot);
  const total = dossierItemCount(snapshot);
  const done = total - left;
  const profileDone = progress.entreprise && progress.metiers && progress.zone;

  return (
    <div className="flex flex-col gap-6">
      {artisan.status === "refuse" && (
        <Alert tone="error">{t.status.refuse(artisan.refusal_reason)}</Alert>
      )}
      {artisan.status === "en_verification" && (
        <Alert tone="success">{t.status.en_verification}</Alert>
      )}
      {artisan.status === "valide" && <Alert tone="success">{t.status.valide}</Alert>}
      {artisan.status === "suspendu" && artisan.suspension_reason !== "documents_expires" && (
        <Alert tone="error">{t.status.suspendu}</Alert>
      )}
      {artisan.status === "radie" && (
        <Alert tone="error">{t.status.radie(artisan.radiation_reason)}</Alert>
      )}

      {validated && (
        <>
          <Card>
            {visibility.visible ? (
              <p className="font-medium text-success">{t.visibility.visible}</p>
            ) : (
              <>
                <p className="font-medium">{t.visibility.hidden}</p>
                <ul className="mt-2 list-disc pl-6">
                  {visibility.missing.map((m) => (
                    <li key={m}>{t.visibility.missing[m]}</li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <ButtonLink href="/pro/tableau-de-bord" block>
            {fr.pro.space.dashboard}
          </ButtonLink>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium">{t.availability.title}</h2>
              <p className="text-muted-foreground">{t.availability.intro}</p>
            </div>
            <ButtonLink href="/pro/agenda/disponibilites" variant="outline" className="shrink-0">
              <CalendarDays aria-hidden="true" className="size-4" />
              {t.availability.manage}
            </ButtonLink>
          </Card>
        </>
      )}

      {zoneDemand && zoneDemandShown(zoneDemand.recherches) && (
        <Card className="flex gap-3 border-primary/20 bg-primary-softer">
          <RowIcon>
            <Users aria-hidden="true" className="size-5" />
          </RowIcon>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-semibold">{t.zoneDemand.title}</h2>
            <p>{t.zoneDemand.body(zoneDemand.recherches, zoneDemand.jours)}</p>
            {zoneDemand.metiers.length > 1 && (
              <p className="text-sm text-muted-foreground">
                {zoneDemand.metiers
                  .map((m) =>
                    t.zoneDemand.trade(zoneDemand.labels[m.metier] ?? m.metier, m.recherches),
                  )
                  .join(" · ")}
              </p>
            )}
            <p className="text-sm text-primary-strong">{t.zoneDemand.next}</p>
          </div>
        </Card>
      )}

      {/* Pendant la vérification : l'espace rempli d'exemples (ADR 0184). */}
      {artisan.status === "en_verification" && (
        <Card className="flex flex-col gap-4 border-example/25 bg-example-soft sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-surface text-example-strong">
              <Eye aria-hidden="true" className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1 text-example-strong">
              <h2 className="font-semibold">{fr.pro.examples.onboardingCard.title}</h2>
              <p className="text-sm">{fr.pro.examples.onboardingCard.text}</p>
            </div>
          </div>
          <Link
            href="/pro/decouvrir/tableau-de-bord"
            className="inline-flex min-h-touch shrink-0 items-center justify-center self-start rounded-pill bg-example px-5 text-[0.9375rem] font-medium text-primary-foreground hover:bg-example-strong focus-visible:ring-4 focus-visible:ring-example/30 focus-visible:outline-none sm:self-auto"
          >
            {fr.pro.examples.onboardingCard.open}
          </Link>
        </Card>
      )}

      {editable && <p className="leading-relaxed text-muted-foreground">{d.lead}</p>}

      {!validated && artisan.status !== "radie" && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>{d.progressLabel}</span>
            <span>{d.progress(done, total)}</span>
          </div>
          <div
            role="progressbar"
            aria-label={d.progressLabel}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="h-1.5 overflow-hidden rounded-pill bg-primary-soft"
          >
            <div
              className="h-full rounded-pill bg-success transition-[width] duration-300"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <RowIcon>
              <Building2 aria-hidden="true" className="size-5" />
            </RowIcon>
            <span className="min-w-0 flex-1 font-semibold">{d.profileTitle}</span>
            <Chip tone={profileDone ? "done" : "todo"}>
              {profileDone ? d.states.done : d.states.todo}
            </Chip>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pl-[3.25rem] text-sm">
            {(["entreprise", "metiers", "zone"] as const).map((step) => (
              <Link
                key={step}
                href={`/pro/onboarding/${step}` as Route}
                className={`inline-flex min-h-touch items-center gap-1.5 rounded-sm font-medium text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
              >
                {progress[step] && <Check aria-hidden="true" className="size-4 text-success" />}
                {t.steps[step]}
              </Link>
            ))}
          </div>
        </li>

        <Row
          href="/pro/onboarding/charte"
          icon={<PenLine aria-hidden="true" className="size-5" />}
          title={d.charterTitle}
          hint={d.charterHint(CHARTER_RULE_COUNT)}
          tone={progress.charte ? "done" : "todo"}
          status={progress.charte ? d.states.signed : d.states.todo}
        />

        {REQUIRED_DOCUMENT_TYPES.map((type) => {
          // « Non soumis » à la décennale (ADR 0116) : pas exigée, l'équipe le vérifie.
          if (type === "decennale" && snapshot.decennaleExempt) {
            return (
              <Row
                key={type}
                href={`/pro/onboarding/documents?type=${type}`}
                icon={<FileText aria-hidden="true" className="size-5" />}
                title={t.documents.types[type]}
                hint={d.exemptHint}
                tone="pending"
                status={d.states.exempt}
              />
            );
          }
          const state = documentState(type, snapshot.documents[type]);
          const refused = documents.find((doc) => doc.type === type && doc.status === "refuse");
          return (
            <Row
              key={type}
              href={`/pro/onboarding/documents?type=${type}`}
              icon={<FileText aria-hidden="true" className="size-5" />}
              title={t.documents.types[type]}
              hint={
                state === "refuse" && refused?.refusal_reason
                  ? t.documents.refusedBecause(refused.refusal_reason)
                  : d.documentHints[type]
              }
              tone={documentTone[state]}
              status={d.states[state]}
            />
          );
        })}

        <Row
          href="/pro/onboarding/profil"
          icon={<UserRound aria-hidden="true" className="size-5" />}
          title={d.profilTitle}
          hint={d.profilHint}
          tone={progress.profil ? "done" : "todo"}
          status={progress.profil ? d.states.done : d.states.todo}
        />
      </ul>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {d.privacy}
      </p>

      <section aria-labelledby="apres-verification" className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <h2 id="apres-verification" className="text-lg font-semibold">
            {d.afterTitle}
          </h2>
          {!validated && <p className="text-sm text-muted-foreground">{d.afterLead}</p>}
        </div>
        <ul className="flex flex-col gap-2.5">
          <Row
            href="/pro/onboarding/paiements"
            icon={<CreditCard aria-hidden="true" className="size-5" />}
            title={d.paiementsTitle}
            hint={d.paiementsHint}
            tone={progress.paiements ? "done" : "todo"}
            status={progress.paiements ? d.states.done : d.states.todo}
          />
          <Row
            href="/pro/onboarding/formule"
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title={d.formuleTitle}
            hint={d.formuleHint}
            tone={progress.formule ? "done" : "todo"}
            status={progress.formule ? d.states.done : d.states.todo}
          />
        </ul>
      </section>

      {editable && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-surface px-4 pt-3 pb-4 sm:mx-0 sm:rounded-card sm:border sm:shadow-raised">
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {canSubmit ? d.ready : d.left(left)}
          </p>
          <SubmitOnboarding disabled={!canSubmit} />
        </div>
      )}
    </div>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
      {children}
    </span>
  );
}

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${chipTone[tone]}`}
    >
      {children}
    </span>
  );
}

function Row({
  href,
  icon,
  title,
  hint,
  tone,
  status,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
  tone: Tone;
  status: string;
}) {
  return (
    <li>
      <Link
        href={href as Route}
        className={`flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-primary ${focusRing}`}
      >
        <RowIcon>{icon}</RowIcon>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
        </span>
        <Chip tone={tone}>{status}</Chip>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

type ZoneDemand = {
  jours: number;
  recherches: number;
  metiers: { metier: string; recherches: number }[];
};

/** Recherches des métiers de l'artisan dans sa zone (my_zone_demand) ; null en cas d'erreur. */
async function loadZoneDemand(
  supabase: Awaited<ReturnType<typeof getOnboardingContext>>["supabase"],
): Promise<(ZoneDemand & { labels: Record<string, string> }) | null> {
  const [{ data, error }, { data: trades }] = await Promise.all([
    supabase.rpc("my_zone_demand"),
    supabase.from("trades").select("code, label"),
  ]);
  if (error || !data) return null;
  return {
    ...(data as ZoneDemand),
    labels: Object.fromEntries((trades ?? []).map((tr) => [tr.code, tr.label])),
  };
}
