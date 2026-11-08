import {
  CHARTER_RULE_COUNT,
  REQUIRED_DOCUMENT_TYPES,
  documentState,
  dossierItemCount,
  dossierGroups,
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
import { sheetCard } from "@/components/pro/sheet";
import { Alert, ButtonLink, Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { SubmitOnboarding } from "./submit-onboarding";

const t = fr.pro.onboarding;
const d = t.dossier;

type Tone = "todo" | "pending" | "done" | "danger";

const chipTone: Record<Tone, string> = {
  todo: "bg-primary-soft text-primary-strong",
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
  const groups = dossierGroups(snapshot);
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

      {editable && <p className="max-w-3xl leading-relaxed text-label">{d.lead}</p>}

      {/* Refonte « Nette » (ADR 0254) : les éléments par groupe à gauche ; l'envoi et la suite à
          droite (en bas sur téléphone, l'envoi collé au bas de l'écran). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6 lg:[grid-template-areas:'main_send'_'main_side']">
        <div className="flex flex-col gap-4 lg:[grid-area:main]">
          <Group title={d.groups.company} progress={groups.company}>
            <li className="flex flex-col gap-1.5 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <RowIcon done={profileDone}>
                  <Building2 aria-hidden="true" className="size-5" />
                </RowIcon>
                <span className="min-w-0 flex-1 font-semibold">{d.profileTitle}</span>
                <Chip tone={profileDone ? "done" : "todo"}>
                  {profileDone ? d.states.done : d.states.todo}
                </Chip>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-0 pl-[3.25rem] text-sm">
                {(["entreprise", "metiers", "zone"] as const).map((step) => (
                  <Link
                    key={step}
                    href={`/pro/onboarding/${step}` as Route}
                    className={`inline-flex min-h-touch items-center gap-1.5 rounded-sm font-semibold text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
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
          </Group>

          <Group title={d.groups.documents} progress={groups.documents}>
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
              // Kbis vérifié au registre, ou vérification impossible (ADR 0217).
              const registry =
                type === "kbis" &&
                documents.some((doc) => doc.type === "kbis" && doc.source === "registre");
              const registryFailed =
                type === "kbis" &&
                state === "missing" &&
                artisan.registre_statut !== null &&
                artisan.registre_statut !== "verifie";
              return (
                <Row
                  key={type}
                  href={`/pro/onboarding/documents?type=${type}`}
                  icon={<FileText aria-hidden="true" className="size-5" />}
                  title={t.documents.types[type]}
                  hint={
                    state === "refuse" && refused?.refusal_reason
                      ? t.documents.refusedBecause(refused.refusal_reason)
                      : registry && state === "valide"
                        ? d.registryHint
                        : registryFailed
                          ? d.registryFailedHint
                          : d.documentHints[type]
                  }
                  tone={documentTone[state]}
                  status={d.states[state]}
                />
              );
            })}
          </Group>

          <Group title={d.groups.profile} progress={groups.profile}>
            <Row
              href="/pro/onboarding/profil"
              icon={<UserRound aria-hidden="true" className="size-5" />}
              title={d.profilTitle}
              hint={d.profilHint}
              tone={progress.profil ? "done" : "todo"}
              status={progress.profil ? d.states.done : d.states.todo}
            />
          </Group>
        </div>

        <div className="order-last flex flex-col gap-4 lg:order-none lg:[grid-area:side]">
          {zoneDemand && zoneDemandShown(zoneDemand.recherches) && (
            <section className="flex gap-3 rounded-card bg-primary-softer p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-foreground text-white">
                <Users aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="font-semibold">{t.zoneDemand.title}</h2>
                <p className="text-sm text-label">
                  {t.zoneDemand.body(zoneDemand.recherches, zoneDemand.jours)}
                </p>
                {zoneDemand.metiers.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    {zoneDemand.metiers
                      .map((m) =>
                        t.zoneDemand.trade(zoneDemand.labels[m.metier] ?? m.metier, m.recherches),
                      )
                      .join(" · ")}
                  </p>
                )}
                <p className="text-sm font-semibold text-primary-strong">{t.zoneDemand.next}</p>
              </div>
            </section>
          )}

          {/* Pendant la vérification : l'espace rempli d'exemples (ADR 0184). */}
          {artisan.status === "en_verification" && (
            <section className="flex flex-col gap-3 rounded-card border border-example/25 bg-example-soft p-5">
              <div className="flex min-w-0 gap-3">
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
                className="inline-flex min-h-touch items-center justify-center rounded-pill bg-example px-5 text-[0.9375rem] font-semibold text-primary-foreground hover:bg-example-strong focus-visible:ring-4 focus-visible:ring-example/30 focus-visible:outline-none"
              >
                {fr.pro.examples.onboardingCard.open}
              </Link>
            </section>
          )}

          <section aria-labelledby="apres-verification" className={sheetCard}>
            <div className="flex flex-col gap-0.5">
              <h2 id="apres-verification" className="text-lg">
                {d.afterTitle}
              </h2>
              {!validated && <p className="text-sm text-muted-foreground">{d.afterLead}</p>}
            </div>
            <ul className="-mx-5 flex flex-col divide-y divide-border border-t border-border sm:-mx-6">
              <Row
                href="/pro/onboarding/paiements"
                icon={<CreditCard aria-hidden="true" className="size-5" />}
                title={d.paiementsTitle}
                hint={
                  // Ouvert dès l'envoi du dossier (ADR 0215).
                  artisan.status === "en_verification" && !progress.paiements
                    ? d.paiementsHintNow
                    : d.paiementsHint
                }
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

          <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {d.privacy}
          </p>
        </div>

        {!validated && artisan.status !== "radie" && (
          <div
            className={`order-last flex flex-col gap-3 border-border bg-surface lg:order-none lg:rounded-card lg:border lg:p-6 lg:shadow-card lg:[grid-area:send] ${
              editable
                ? "sticky bottom-0 z-10 -mx-4 border-t px-4 pt-3 pb-4 sm:-mx-6 sm:px-6 lg:static lg:mx-0"
                : "rounded-card border p-5"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold lg:text-base">{d.progressLabel}</span>
              <span className="font-display text-lg font-bold lg:text-[1.375rem]">
                {d.progress(done, total)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={d.progressLabel}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="h-2 overflow-hidden rounded-pill bg-primary-soft"
            >
              <div
                className="h-full rounded-pill bg-success transition-[width] duration-300"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            {editable && (
              <>
                <p className="text-sm text-label" aria-live="polite">
                  {canSubmit ? d.ready : d.left(left)}
                </p>
                <SubmitOnboarding disabled={!canSubmit} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Groupe d'éléments du dossier : titre, avancement « N sur M », lignes. */
function Group({
  title,
  progress,
  children,
}: {
  title: string;
  progress: { done: number; total: number };
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2.5 sm:px-5">
        <h2 className="text-[1.0625rem]">{title}</h2>
        <span className="text-sm font-semibold text-muted-foreground">
          {d.progress(progress.done, progress.total)}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border border-t border-border">{children}</ul>
    </section>
  );
}

function RowIcon({ children, done = false }: { children: ReactNode; done?: boolean }) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-input ${
        done ? "bg-success-soft text-success" : "bg-background text-label"
      }`}
    >
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
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-background sm:px-5 ${focusRing}`}
      >
        <RowIcon done={tone === "done"}>{icon}</RowIcon>
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
