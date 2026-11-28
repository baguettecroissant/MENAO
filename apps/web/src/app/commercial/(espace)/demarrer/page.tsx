import {
  COMMERCIAL_STEP_GROUPS,
  FORMATION_MODULES,
  SIMULATOR_PASS_SCORE,
  urssafStatus,
  type CommercialStep,
  type CommercialStepGroup,
} from "@menao/core";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  GraduationCap,
  IdCard,
  MessageCircle,
  Smartphone,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DocumentUpload } from "@/components/commercial/field/document-upload";
import { ReadyCelebration } from "@/components/commercial/field/ready-celebration";
import { RsacForm } from "@/components/commercial/field/rsac-form";
import { Alert, ButtonLink } from "@/components/ui";
import { COMMERCIAL_FORMATION } from "@/content/commercial/formation";
import { fr } from "@/i18n/fr";
import { demoOnboarding, getOnboarding, type OnboardingView } from "@/lib/commercial/onboarding";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay } from "@/lib/format";

const t = fr.commercialField.start;
/** Formation d'équipe des 4 et 5 janvier 2027 : la carte disparaît ensuite. */
const TRAINING_LAST_DAY = "2027-01-05";
const s = t.steps;

export const metadata: Metadata = {
  title: `${fr.commercialField.nav.start} — MENAO`,
  robots: { index: false },
};

const GROUP_ICONS: Record<CommercialStepGroup, LucideIcon> = {
  statut: IdCard,
  telephone: Smartphone,
  formation: GraduationCap,
  prospect: Target,
};

type Links = { contrat: string | null; urssaf: string | null; rib: string | null };

function Dot({ step, next }: { step: CommercialStep; next: boolean }) {
  if (step.done) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      </span>
    );
  }
  return next ? (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
      <span className="size-2.5 rounded-full bg-white" />
    </span>
  ) : (
    <span className="size-8 shrink-0 rounded-full border-2 border-border-strong" />
  );
}

function ViewLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm font-semibold whitespace-nowrap text-primary-strong hover:underline"
    >
      {label}
    </a>
  );
}

function ActionLink({ href, label, primary }: { href: string; label: string; primary: boolean }) {
  return (
    <ButtonLink href={href as Route} variant={primary ? "primary" : "secondary"} size="sm">
      {label}
    </ButtonLink>
  );
}

/** Une étape : son état, ce qu'il reste à faire et l'action qui la fait avancer. */
function stepContent(
  step: CommercialStep,
  view: OnboardingView,
  links: Links,
  next: boolean,
): { title: string; detail: string; action: ReactNode; below?: ReactNode } {
  const { state, today } = view;
  switch (step.key) {
    case "contrat":
      return {
        title: s.contrat.title,
        detail: state.contrat_signe_le
          ? s.contrat.done(formatDay(state.contrat_signe_le))
          : state.contrat_depose_le
            ? s.contrat.deposited(formatDay(state.contrat_depose_le))
            : s.contrat.todo,
        action: (
          <div className="flex items-center gap-3">
            <ViewLink href={links.contrat} label={s.contrat.view} />
            {!state.contrat_signe_le && !state.contrat_depose_le && (
              <DocumentUpload kind="contrat" label={s.contrat.action} primary={next} />
            )}
          </div>
        ),
      };
    case "rsac":
      return {
        title: s.rsac.title,
        detail: state.rsac_numero ? s.rsac.done(state.rsac_numero, state.rsac_greffe) : s.rsac.todo,
        action: state.rsac_numero ? (
          <RsacForm numero={state.rsac_numero} greffe={state.rsac_greffe} />
        ) : null,
        below: state.rsac_numero ? undefined : <RsacForm numero={null} greffe={null} />,
      };
    case "urssaf": {
      const u = urssafStatus(state.urssaf_deposee_le, today);
      const until = u.expiresOn ? formatDay(u.expiresOn) : "";
      return {
        title: s.urssaf.title,
        detail:
          u.state === "manquante"
            ? s.urssaf.todo
            : u.state === "valide"
              ? s.urssaf.valid(until)
              : u.state === "bientot"
                ? s.urssaf.soon(until)
                : s.urssaf.expired(until),
        action: (
          <div className="flex items-center gap-3">
            <ViewLink href={links.urssaf} label={s.urssaf.view} />
            {u.state !== "valide" && (
              <DocumentUpload
                kind="urssaf"
                label={u.state === "manquante" ? s.urssaf.action : s.urssaf.renew}
                primary={next || u.state !== "manquante"}
              />
            )}
          </div>
        ),
      };
    }
    case "rib":
      return {
        title: s.rib.title,
        detail: state.rib_depose_le ? s.rib.done(formatDay(state.rib_depose_le)) : s.rib.todo,
        action: (
          <div className="flex items-center gap-3">
            <ViewLink href={links.rib} label={s.rib.view} />
            <DocumentUpload
              kind="rib"
              label={state.rib_depose_le ? s.rib.replace : s.rib.action}
              primary={next}
            />
          </div>
        ),
      };
    case "ecran":
      return {
        title: s.ecran.title,
        detail: state.ecran_installe_le
          ? s.ecran.done(formatDay(state.ecran_installe_le))
          : s.ecran.todo,
        action: null,
        below: state.ecran_installe_le ? undefined : (
          <details className="text-sm text-label">
            <summary className="cursor-pointer font-semibold text-primary-strong">
              {s.ecran.action}
            </summary>
            <p className="mt-2">{t.homeScreenHelp}</p>
          </details>
        ),
      };
    case "rappels":
      return {
        title: s.rappels.title,
        detail: step.done ? s.rappels.done : s.rappels.todo,
        action: step.done ? null : (
          <ActionLink href="/commercial/notifications" label={s.rappels.action} primary={next} />
        ),
      };
    case "simulateur": {
      const best = step.score;
      return {
        title: s.simulateur.title,
        detail: step.done
          ? s.simulateur.done(best ?? 0)
          : best !== null
            ? s.simulateur.tried(best, SIMULATOR_PASS_SCORE)
            : s.simulateur.todo(SIMULATOR_PASS_SCORE),
        action: step.done ? null : (
          <ActionLink
            href="/commercial/guide/entrainement"
            label={s.simulateur.action}
            primary={next}
          />
        ),
      };
    }
    case "premier_prospect":
      return {
        title: s.premier_prospect.title,
        detail: step.done ? s.premier_prospect.done : s.premier_prospect.todo,
        action: step.done ? null : (
          <ActionLink
            href="/commercial/prospects"
            label={s.premier_prospect.action}
            primary={next}
          />
        ),
      };
    default: {
      const key = step.key.replace("module_", "");
      const index = FORMATION_MODULES.findIndex((m) => m === key);
      const content = COMMERCIAL_FORMATION[index];
      const href = `/commercial/demarrer/formation/${key}`;
      return {
        title: `${index + 1} · ${content?.title ?? key}`,
        detail: step.done
          ? s.module.done(step.score ?? 0)
          : step.score !== null
            ? s.module.tried(step.score)
            : s.module.todo(content?.minutes ?? 5),
        action: (
          <ActionLink
            href={href}
            label={
              step.done ? s.module.review : step.score !== null ? s.module.retry : s.module.start
            }
            primary={next}
          />
        ),
      };
    }
  }
}

/**
 * « Bien démarrer » des conseillers (F-194, lot 83, ADR 0394) : page d'arrivée tant que le badge
 * « Prêt pour le terrain » n'est pas obtenu, puis le rappel des pièces à tenir à jour. Les 13
 * étapes viennent de @menao/core (commercialOnboardingSteps) ; rien n'y est imposé ni bloqué.
 */
export default async function CommercialStartPage({
  searchParams,
}: PageProps<"/commercial/demarrer">) {
  const arrival = (await searchParams).arrivee === "1";
  const space = await getCommercialSpace("/commercial/demarrer");
  const view = space.demo
    ? demoOnboarding()
    : space.active
      ? await getOnboarding(space.supabase)
      : null;
  // À la connexion (homePathForRole) : un conseiller prêt, badge vu, pièces à jour, va droit à
  // « Aujourd'hui ».
  if (
    arrival &&
    view?.ready &&
    view.state.badge_vu_le &&
    view.progress.done === view.progress.total
  ) {
    redirect("/commercial/journee" as Route);
  }

  let links: Links = { contrat: null, urssaf: null, rib: null };
  if (view && !space.demo) {
    const { data: docs } = await space.supabase
      .from("commercial_onboarding")
      .select("contrat_path, urssaf_path, rib_path")
      .maybeSingle();
    const paths = [docs?.contrat_path, docs?.urssaf_path, docs?.rib_path].filter((p): p is string =>
      Boolean(p),
    );
    if (paths.length) {
      const { data: signed } = await space.supabase.storage
        .from("commercial-documents")
        .createSignedUrls(paths, 600);
      const url = (path: string | null | undefined) =>
        (path && signed?.find((x) => x.path === path)?.signedUrl) || null;
      links = {
        contrat: url(docs?.contrat_path),
        urssaf: url(docs?.urssaf_path),
        rib: url(docs?.rib_path),
      };
    }
  }

  const firstName = space.account.firstName;
  const celebrate = view && view.ready && !view.state.badge_vu_le && !space.demo;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : !view ? (
          <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
        ) : (
          <>
            {celebrate && (
              <ReadyCelebration
                firstName={firstName}
                score={view.raw.bestTraining ?? 0}
                code={space.commercial.code}
              />
            )}
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="flex max-w-3xl flex-col gap-2">
                <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
                  {view.ready ? t.titleReady : t.title(firstName)}
                </h1>
                <p className="text-[0.9375rem] text-label sm:text-base">
                  {view.ready ? t.introReady : t.intro}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-80">
                <p className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {t.progress(view.progress.done, view.progress.total)}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round((view.progress.done / view.progress.total) * 100)} %
                  </span>
                </p>
                <span
                  role="progressbar"
                  aria-label={t.progress(view.progress.done, view.progress.total)}
                  aria-valuemin={0}
                  aria-valuemax={view.progress.total}
                  aria-valuenow={view.progress.done}
                  className="block h-2.5 overflow-hidden rounded-full bg-border"
                >
                  <span
                    className="block h-full rounded-full bg-success"
                    style={{ width: `${(view.progress.done / view.progress.total) * 100}%` }}
                  />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-5">
                {COMMERCIAL_STEP_GROUPS.map((group) => {
                  const steps = view.steps.filter((x) => x.group === group);
                  const Icon = GROUP_ICONS[group];
                  return (
                    <section
                      key={group}
                      aria-labelledby={`groupe-${group}`}
                      className="overflow-hidden rounded-card border border-border bg-surface"
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                        <span className="flex size-8 items-center justify-center rounded-input bg-background">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <h2
                          id={`groupe-${group}`}
                          className="flex-1 text-[1.0625rem] font-semibold"
                        >
                          {t.groups[group]}
                        </h2>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {t.groupCount(steps.filter((x) => x.done).length, steps.length)}
                        </span>
                      </div>
                      <ul>
                        {steps.map((step) => {
                          const next = view.progress.next === step.key;
                          const c = stepContent(step, view, links, next);
                          return (
                            <li
                              key={step.key}
                              id={step.key}
                              className={`flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:px-5 ${next ? "bg-primary-softer" : ""}`}
                            >
                              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                                <Dot step={step} next={next} />
                                <span className="flex min-w-48 flex-1 flex-col">
                                  <span className="text-[0.9375rem] font-semibold">{c.title}</span>
                                  <span className="text-[0.8125rem] text-muted-foreground">
                                    {c.detail}
                                  </span>
                                </span>
                                {c.action}
                              </div>
                              {c.below && <div className="pl-11.5">{c.below}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>

              <aside className="flex flex-col gap-4">
                {view.today <= TRAINING_LAST_DAY && (
                  <section className="flex flex-col gap-2.5 rounded-card bg-foreground p-5 text-surface">
                    <p className="text-xs font-bold tracking-wide uppercase opacity-70">
                      {t.training.title}
                    </p>
                    <p className="text-2xl leading-tight font-semibold">{t.training.dates}</p>
                    <p className="text-sm opacity-85">{t.training.text}</p>
                  </section>
                )}
                <section className="flex flex-col items-start gap-2.5 rounded-card border border-border bg-surface p-5">
                  <span
                    className={`flex size-12 items-center justify-center rounded-input ${view.ready ? "bg-success-soft text-success" : "bg-background text-muted-foreground"}`}
                  >
                    <BadgeCheck aria-hidden="true" className="size-7" />
                  </span>
                  <h2 className="text-lg font-semibold">
                    {view.ready ? t.badge.earned : t.badge.title}
                  </h2>
                  <p className="text-sm text-label">{t.badge.text(SIMULATOR_PASS_SCORE)}</p>
                </section>
                <Link
                  href={"/contact" as Route}
                  className="flex items-center gap-3 rounded-card bg-primary-softer p-4 hover:bg-primary-soft"
                >
                  <MessageCircle aria-hidden="true" className="size-5 text-primary-strong" />
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold">{t.contact.title}</span>
                    <span className="text-[0.8125rem] text-label">{t.contact.text}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </Link>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
