import {
  CHARTER_RULE_COUNT,
  REQUIRED_DOCUMENT_TYPES,
  documentState,
  dossierItemCount,
  dossierGroups,
  dossierItemsLeft,
  planChoiceOpen,
  registryCheckPending,
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
  Image as ImageIcon,
  Lock,
  PenLine,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RegistryAutoCheck } from "@/components/pro/registry-auto-check";
import { sheetCard } from "@/components/pro/sheet";
import { Alert, ButtonLink, Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { HelpVideo } from "@/components/pro/help-video";
import { InscriptionPath } from "./inscription-path";
import { standOutProps } from "@/lib/artisan/stand-out";
import { SubmitOnboarding } from "./submit-onboarding";
import { paymentsOpen } from "@/lib/launch";

const t = fr.pro.onboarding;
const d = t.dossier;
const x = d.extras;

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
  const context = await getOnboardingContext();
  // Pas encore validé : « Mon inscription », un seul parcours jusqu'à la mise en ligne (ADR 0376).
  if (
    context.artisan.status === "brouillon" ||
    context.artisan.status === "refuse" ||
    context.artisan.status === "en_verification"
  ) {
    return <InscriptionPath context={context} standOut={await standOutProps(context)} />;
  }
  const {
    supabase,
    artisan,
    progress,
    canSubmit,
    visibility,
    snapshot,
    documents,
    workTypeCodes,
    certifications,
  } = context;
  // Contrôle au registre jamais abouti : MENAO le relance tout seul (ADR 0354).
  const registryPending = registryCheckPending({
    status: artisan.status,
    sireneActive: artisan.sirene_active,
    registryStatus: artisan.registre_statut,
    hasKbis: documents.some((doc) => doc.type === "kbis"),
  });
  const editable = artisan.status === "brouillon" || artisan.status === "refuse";
  const validated = artisan.status === "valide" || artisan.status === "suspendu";
  // Paiements et formule ouverts sans attendre l'envoi du dossier (ADR 0353).
  const parallel = planChoiceOpen(artisan.status);
  const chosenPlan =
    parallel && artisan.plan_choisi
      ? ((
          await supabase
            .from("plans")
            .select("nom")
            .eq("code", artisan.plan_choisi)
            .eq("ouverte", true)
            .maybeSingle()
        ).data?.nom ?? null)
      : null;
  // Demande de la zone (ADR 0182), une fois les métiers et la zone choisis, avant la validation.
  const zoneDemand =
    !validated && progress.metiers && progress.zone ? await loadZoneDemand(supabase) : null;
  const left = dossierItemsLeft(snapshot);
  const groups = dossierGroups(snapshot);
  const total = dossierItemCount();
  const done = total - left;
  const profileDone = progress.entreprise && progress.metiers && progress.zone;
  // Prochaine chose à faire, dans l'ordre du dossier (lot 61) : un seul bouton « Continuer ».
  const missingDocument = REQUIRED_DOCUMENT_TYPES.find(
    (type) =>
      !(type === "decennale" && snapshot.decennaleExempt) &&
      ["missing", "refuse", "a_refaire"].includes(documentState(type, snapshot.documents[type])),
  );
  const next = !progress.entreprise
    ? { href: "/pro/onboarding/entreprise", label: t.steps.entreprise }
    : !progress.metiers
      ? { href: "/pro/onboarding/metiers", label: t.steps.metiers }
      : !progress.zone
        ? { href: "/pro/onboarding/zone", label: t.steps.zone }
        : !progress.charte
          ? { href: "/pro/onboarding/charte", label: d.charterTitle }
          : missingDocument
            ? {
                href: `/pro/onboarding/documents?type=${missingDocument}`,
                label: t.documents.types[missingDocument],
              }
            : !progress.profil
              ? { href: "/pro/onboarding/profil", label: d.profilTitle }
              : null;

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
      {/* « Avant de commencer » (ADR 0347) : tant que l'artisan n'a déposé aucune pièce (le Kbis
          vérifié au registre, créé à l'inscription, ne compte pas). */}
      {/* Tant qu'aucun document n'est déposé : la vidéo de présentation (ADR 0349). La liste « Avant
          de commencer » faisait doublon avec les étapes du dossier, juste en dessous. */}
      {editable && documents.every((doc) => doc.source === "registre") && (
        <HelpVideo id="v01-inscription" />
      )}
      {editable && next && (
        <section
          aria-label={d.nextLabel}
          className="flex flex-col gap-3 rounded-card bg-foreground px-5 py-4 text-surface sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-bold tracking-wider uppercase opacity-70">
              {d.nextLabel}
            </span>
            <span className="text-lg font-semibold">{next.label}</span>
            <span className="text-sm opacity-80">{d.nextHint}</span>
          </span>
          <ButtonLink href={next.href as Route} className="shrink-0">
            {d.nextButton}
            <ChevronRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </section>
      )}

      {/* Refonte « Nette » (ADR 0254) : les éléments par groupe à gauche ; l'envoi et la suite à
          droite (en bas sur téléphone, l'envoi collé au bas de l'écran). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6 lg:[grid-template-areas:'main_send'_'main_side']">
        <div className="flex flex-col gap-4 lg:[grid-area:main]">
          <Group title={d.groups.company} progress={groups.company}>
            <li className="flex flex-col gap-1.5 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3">
                <RowIcon done={profileDone} step={1}>
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
              step={2}
              minutes={1}
              href="/pro/onboarding/charte"
              icon={<PenLine aria-hidden="true" className="size-5" />}
              title={d.charterTitle}
              hint={d.charterHint(CHARTER_RULE_COUNT)}
              tone={progress.charte ? "done" : "todo"}
              status={progress.charte ? d.states.signed : d.states.todo}
            />
          </Group>

          {registryPending && <RegistryAutoCheck silent />}
          <Group title={d.groups.documents} progress={groups.documents}>
            {REQUIRED_DOCUMENT_TYPES.map((type) => {
              // « Non soumis » à la décennale (ADR 0116) : pas exigée, l'équipe le vérifie.
              if (type === "decennale" && snapshot.decennaleExempt) {
                return (
                  <Row
                    key={type}
                    step={3 + REQUIRED_DOCUMENT_TYPES.indexOf(type)}
                    minutes={2}
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
                  step={3 + REQUIRED_DOCUMENT_TYPES.indexOf(type)}
                  minutes={2}
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
                          : type === "kbis" && registryPending
                            ? d.registryPendingHint
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
              step={3 + REQUIRED_DOCUMENT_TYPES.length}
              minutes={3}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="apres-verification" className="text-lg">
                  {parallel ? d.parallelTitle : d.afterTitle}
                </h2>
                {parallel && (
                  <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
                    {d.openNow}
                  </span>
                )}
              </div>
              {parallel && <p className="text-sm text-muted-foreground">{d.parallelLead}</p>}
            </div>
            <ul className="-mx-5 flex flex-col divide-y divide-border border-t border-border sm:-mx-6">
              <Row
                href="/pro/onboarding/paiements"
                icon={<CreditCard aria-hidden="true" className="size-5" />}
                title={d.paiementsTitle}
                hint={
                  // Ouvert dès le début du dossier (ADR 0353).
                  parallel && !progress.paiements ? d.paiementsHintNow : d.paiementsHint
                }
                tone={progress.paiements ? "done" : paymentsOpen ? "todo" : "pending"}
                status={
                  progress.paiements ? d.states.done : paymentsOpen ? d.states.todo : fr.launch.soon
                }
              />
              <Row
                href="/pro/onboarding/formule"
                icon={<Sparkles aria-hidden="true" className="size-5" />}
                title={d.formuleTitle}
                hint={
                  !parallel || progress.formule
                    ? d.formuleHint
                    : chosenPlan
                      ? d.formuleHintChosen(chosenPlan)
                      : d.formuleHintChoice
                }
                tone={
                  progress.formule
                    ? "done"
                    : !paymentsOpen || (parallel && chosenPlan)
                      ? "pending"
                      : "todo"
                }
                status={
                  progress.formule
                    ? d.states.done
                    : !paymentsOpen
                      ? fr.launch.soon
                      : parallel && chosenPlan
                        ? d.states.chosen
                        : d.states.todo
                }
              />
            </ul>
          </section>

          {/* Ce qui est facultatif, rendu visible (ADR 0354) : logo, spécialités, certifications. */}
          {!validated && artisan.status !== "radie" && (
            <section aria-labelledby="pour-vous-demarquer" className={sheetCard}>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="pour-vous-demarquer" className="text-lg">
                    {x.title}
                  </h2>
                  <span className="rounded-pill bg-background px-2.5 py-1 text-xs font-semibold text-label">
                    {x.optional}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{x.lead}</p>
              </div>
              <ul className="-mx-5 flex flex-col divide-y divide-border border-t border-border sm:-mx-6">
                {(
                  [
                    {
                      href: "/pro/onboarding/profil#image",
                      icon: <ImageIcon aria-hidden="true" className="size-5" />,
                      title: x.logoTitle,
                      hint: x.logoHint,
                      done: snapshot.hasAvatar || artisan.logo_path !== null,
                    },
                    {
                      href: "/pro/onboarding/metiers",
                      icon: <PenLine aria-hidden="true" className="size-5" />,
                      title: x.skillsTitle,
                      hint: x.skillsHint,
                      done: workTypeCodes.length > 0 && artisan.experience_years !== null,
                    },
                    {
                      href: "/pro/onboarding/metiers#certif-titre",
                      icon: <ShieldCheck aria-hidden="true" className="size-5" />,
                      title: x.certsTitle,
                      hint: certifications.length
                        ? x.certsCount(certifications.length)
                        : x.certsHint,
                      done: certifications.length > 0,
                    },
                    {
                      href: "/pro/onboarding/metiers",
                      icon: <Wallet aria-hidden="true" className="size-5" />,
                      title: x.budgetTitle,
                      hint: artisan.budget_minimum ? x.budgetSet : x.budgetHint,
                      done: artisan.budget_minimum !== null,
                    },
                  ] as const
                ).map((item) => (
                  <Row
                    key={item.title}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    hint={item.hint}
                    tone={item.done ? "done" : "pending"}
                    status={item.done ? x.added : x.optional}
                    // « Facultatif » est déjà dit en tête du bloc : la ligne invite à ajouter.
                    action={item.done ? undefined : x.add}
                  />
                ))}
              </ul>
            </section>
          )}

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

/** Pastille d'une étape : son numéro tant qu'elle reste à faire, une coche une fois faite. */
function RowIcon({
  children,
  done = false,
  step,
}: {
  children: ReactNode;
  done?: boolean;
  step?: number;
}) {
  return (
    <span
      aria-hidden={step ? true : undefined}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold ${
        done ? "bg-success text-white" : "bg-background text-label"
      }`}
    >
      {step ? done ? <Check className="size-5" strokeWidth={3} /> : step : children}
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
  step,
  minutes,
  action,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
  tone: Tone;
  status: string;
  /** Numéro de l'étape et durée indicative (maquette du lot 61). */
  step?: number;
  minutes?: number;
  /** Ligne facultative pas encore remplie : « Ajouter » à la place de la pastille d'état. */
  action?: string;
}) {
  return (
    <li>
      <Link
        href={href as Route}
        className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-background sm:px-5 ${focusRing}`}
      >
        <RowIcon done={tone === "done"} step={step}>
          {icon}
        </RowIcon>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
        </span>
        {minutes && tone === "todo" && (
          <span
            aria-hidden="true"
            className="hidden shrink-0 text-xs text-muted-foreground sm:block"
          >
            {d.minutes(minutes)}
          </span>
        )}
        {action ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-pill border-[1.5px] border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-primary-strong">
            <Plus aria-hidden="true" className="size-4" />
            {action}
          </span>
        ) : (
          <>
            <Chip tone={tone}>{status}</Chip>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </>
        )}
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
