import {
  DOCUMENT_HELP,
  MONITORED_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  daysUntil,
  documentIsValid,
  expiryStatus,
  registryCheckPending,
  type RequiredDocumentType,
} from "@menao/core";
import { Alert, ButtonLink, Card, focusRing } from "@/components/ui";
import { ArrowRight, Check, ChevronRight, Clock, Lock, Mail, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { GuideBar } from "@/components/pro/guide-bar";
import { guideAround, guideFromContext, suiteHref } from "@/lib/artisan/guide";
import { DocumentHelpDisclosure, DocumentHelpSteps } from "@/components/pro/document-help";
import { HelpVideo } from "@/components/pro/help-video";
import { RegistryAutoCheck } from "@/components/pro/registry-auto-check";
import { sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { recheckRegistry, setDecennaleExempt } from "@/lib/artisan/actions";
import { DocumentUpload } from "./document-upload";

const t = fr.pro.onboarding.documents;
const g = fr.pro.onboarding.guide;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDate = (d: string) => dateFormat.format(new Date(d));

const chip = {
  missing: "bg-warning-soft text-warning",
  refuse: "bg-danger-soft text-danger",
  valide: "bg-success-soft text-success",
  en_attente: "bg-primary-soft text-primary",
} as const;

/**
 * Documents du dossier (F-14, F-51). Avec `?type=`, une seule pièce, ouverte depuis « Faire
 * vérifier mon entreprise » (ADR 0111) ; sans, toutes (renouvellements d'un artisan validé).
 */
export default async function DocumentsStepPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: only } = await searchParams;
  const types = REQUIRED_DOCUMENT_TYPES.filter((type) => !only || type === only);
  const focused = types.length === 1;
  const context = await getOnboardingContext();
  const { supabase, userId, artisan, documents, tradeCodes } = context;
  // Métiers déclarés, proposés avec la décennale (ADR 0116).
  const { data: trades } = await supabase
    .from("trades")
    .select("code, label")
    .in("code", tradeCodes.length ? tradeCodes : ["-"])
    .order("sort_order");
  const exempt = artisan.decennale_non_soumis;
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  // Artisan validé ou suspendu : renouvellement des documents surveillés (F-51).
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";
  // Parcours guidé (ADR 0373) : une pièce par écran, la suite dans la barre du bas.
  const guided = focused && onboarding ? types[0] : undefined;
  const around = guided ? guideAround(guideFromContext(context), guided) : null;
  const nextNote = around?.next ? g.next(g.names[around.next]) : g.nextDossier;

  // URL signées de courte durée (5 min) : les documents restent privés (spec F-43).
  const paths = documents.map((d) => d.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(paths, 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Contrôle au registre jamais abouti : MENAO le relance tout seul (ADR 0354).
  const registryPending = registryCheckPending({
    status: artisan.status,
    sireneActive: artisan.sirene_active,
    registryStatus: artisan.registre_statut,
    hasKbis: documents.some((d) => d.type === "kbis"),
  });
  // Kbis vérifié au registre : il ne compte plus parmi les documents à déposer.
  const kbisAuto = documents.some(
    (d) => d.type === "kbis" && d.source === "registre" && d.status === "valide",
  );
  const counted = REQUIRED_DOCUMENT_TYPES.filter((type) => type !== "kbis" || !kbisAuto);

  const stateOf = (type: RequiredDocumentType) => {
    const rows = documents
      .filter((d) => d.type === type)
      .sort((a, b) => (a.status === "valide" ? -1 : b.status === "valide" ? 1 : 0));
    const current = rows.find((d) => d.status === "valide") ?? rows[0];
    const pending = rows.find((d) => d !== current);
    const monitored = (MONITORED_DOCUMENT_TYPES as readonly string[]).includes(type);
    // Kbis remplacé par la fiche de vérification au registre (ADR 0217) : rien à déposer.
    const registry = current?.source === "registre" && current.status === "valide";
    const registryFailed =
      type === "kbis" && onboarding && !current && artisan.registre_statut !== null
        ? (t.registry.reasons[artisan.registre_statut] ?? null)
        : null;
    const canUpload = (onboarding || (renewal && monitored)) && !registry;
    // « Où trouver ce document ? » (ADR 0347) : seulement quand il y a quelque chose à déposer ;
    // le Kbis, seulement si la vérification au registre a échoué.
    const help =
      canUpload &&
      !(type === "decennale" && exempt) &&
      (type !== "kbis" || registryFailed !== null);
    return { current, pending, monitored, registryFailed, canUpload, help };
  };

  // Refonte « Nette » (ADR 0254) : une pièce à gauche, ce que l'équipe vérifie à droite.
  const cards = (
    <div className="flex flex-col gap-6">
      {focused && !guided && onboarding && types[0] && counted.includes(types[0]) && (
        <span className="self-start rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
          {t.position(counted.indexOf(types[0]) + 1, counted.length)}
        </span>
      )}
      <p className="text-label">
        {!focused
          ? t.intro
          : types[0] === "kbis"
            ? t.kbisLead
            : types[0] === "decennale" || types[0] === "rc_pro"
              ? t.photoHint
              : t.photoHintOther}
      </p>
      {/* « Bien photographier un document » (ADR 0349), pendant l'inscription ; dans le parcours
          guidé, sous la pièce, avec le reste de l'aide. */}
      {onboarding && !guided && <HelpVideo id="v05-photo" />}
      {artisan.status === "en_verification" && (
        <Alert tone="success">{fr.pro.onboarding.upload.status.locked}</Alert>
      )}
      {types.map((type) => {
        const { current, pending, monitored, registryFailed, canUpload, help } = stateOf(type);
        return (
          <Card key={type}>
            <section aria-labelledby={`doc-${type}`} className="flex flex-col gap-4">
              <div
                className={
                  guided && !current && !exempt && !registryPending
                    ? "sr-only"
                    : "flex flex-wrap items-start justify-between gap-2"
                }
              >
                <h2 id={`doc-${type}`} className={guided ? "sr-only" : "text-lg"}>
                  {t.types[type]}
                </h2>
                <span
                  className={`rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                    !current &&
                    ((type === "decennale" && exempt) || (type === "kbis" && registryPending))
                      ? chip.en_attente
                      : chip[current?.status ?? "missing"]
                  }`}
                >
                  {current
                    ? t.statuses[current.status]
                    : type === "decennale" && exempt
                      ? fr.pro.onboarding.dossier.states.exempt
                      : type === "kbis" && registryPending
                        ? t.registry.pendingChip
                        : t.missing}
                </span>
              </div>
              {[current, pending]
                .filter((d) => d !== undefined)
                .map((doc) => {
                  const url = urlByPath.get(doc.storage_path);
                  const expiry =
                    doc.status === "valide" && monitored ? expiryStatus(doc.date_fin) : "ok";
                  const days = doc.date_fin ? daysUntil(doc.date_fin) : 0;
                  const valid = documentIsValid(type, {
                    status: doc.status,
                    dateEmission: doc.date_emission,
                    dateFin: doc.date_fin,
                  });
                  return (
                    <div key={doc.id} className="flex flex-col gap-2">
                      {renewal && (
                        <p className="text-sm font-medium">
                          {doc === current ? t.current : t.renewal} · {t.statuses[doc.status]}
                        </p>
                      )}
                      {doc.source === "registre" && doc.date_emission && (
                        <p className="text-sm">
                          {t.registry.verified(formatDate(doc.date_emission))}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {[
                          doc.assureur,
                          doc.numero,
                          doc.source !== "registre" &&
                            doc.date_emission &&
                            t.issuedOn(formatDate(doc.date_emission)),
                          doc.date_fin && t.validUntil(formatDate(doc.date_fin)),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        {url && (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary underline"
                            >
                              {doc.source === "registre" ? t.registry.view : t.view}
                            </a>
                          </>
                        )}
                      </p>
                      {expiry !== "ok" && (
                        <p
                          className={`text-sm font-medium ${expiry === "bientot" ? "text-warning" : "text-danger"}`}
                        >
                          {expiry === "expire" ? t.expiry.expire : t.expiry[expiry](days)}
                        </p>
                      )}
                      {doc.status === "refuse" && doc.refusal_reason && (
                        <Alert tone="error">{t.refusedBecause(doc.refusal_reason)}</Alert>
                      )}
                      {onboarding && doc.status !== "refuse" && !valid && (
                        <Alert tone="error">{t.invalidNow}</Alert>
                      )}
                    </div>
                  );
                })}
              {type === "kbis" && registryPending && <RegistryAutoCheck />}
              {registryFailed && (
                <div className="flex flex-col gap-2">
                  <Alert tone="info">
                    <b>{t.registry.why}</b> {registryFailed}
                  </Alert>
                  <form action={recheckRegistry}>
                    <button
                      type="submit"
                      className="min-h-touch text-sm font-semibold text-primary-strong underline underline-offset-4"
                    >
                      {t.registry.recheck}
                    </button>
                  </form>
                </div>
              )}
              {type === "decennale" && onboarding && (!guided || exempt) && (
                <div className="flex flex-col gap-2 rounded-card bg-primary-softer p-4 text-sm">
                  {exempt ? (
                    <Alert tone="info">{t.exemptDeclared}</Alert>
                  ) : (
                    <>
                      <p className="font-semibold">{t.exemptTitle}</p>
                      <p className="text-muted-foreground">{t.exemptText}</p>
                    </>
                  )}
                  <form action={setDecennaleExempt}>
                    <input type="hidden" name="value" value={exempt ? "non" : "oui"} />
                    <button
                      type="submit"
                      className="min-h-touch font-semibold text-primary-strong underline underline-offset-4"
                    >
                      {exempt ? t.exemptCancel : t.exemptDeclare}
                    </button>
                  </form>
                </div>
              )}
              {help && !guided && (
                // Page d'une pièce sur ordinateur : l'aide est dans la colonne de droite.
                <DocumentHelpDisclosure type={type} className={focused ? "lg:hidden" : ""} />
              )}
              {canUpload && !(type === "decennale" && exempt) ? (
                <DocumentUpload
                  type={type}
                  userId={userId}
                  trades={type === "decennale" ? (trades ?? []) : undefined}
                  label={renewal ? t.renew : current ? t.replace : t.send}
                  guide={
                    guided && around
                      ? {
                          step: type,
                          backHref: around.backHref,
                          skipHref: suiteHref(type),
                          // Pièce déjà déposée : rien à passer, on continue.
                          skipLabel: current ? g.continue : g.skip,
                          skipNote: current ? undefined : g.skipNote,
                          nextNote,
                        }
                      : undefined
                  }
                />
              ) : (
                guided &&
                around && (
                  // Rien à déposer (Kbis vérifié au registre, métier non soumis) : on continue.
                  <GuideBar backHref={around.backHref} note={nextNote}>
                    <ButtonLink href={suiteHref(type)} size="lg" block>
                      {g.continue}
                      <ArrowRight aria-hidden="true" className="size-5" />
                    </ButtonLink>
                  </GuideBar>
                )
              )}
            </section>
          </Card>
        );
      })}
      {guided && (
        // L'aide en lignes à ouvrir (ADR 0373) : la photo, où trouver la pièce, l'assureur, et
        // le cas des métiers non soumis à la décennale.
        <div className="flex flex-col gap-3">
          <HelpVideo id="v05-photo" />
          {stateOf(guided).help && <DocumentHelpDisclosure type={guided} className="lg:hidden" />}
          {stateOf(guided).help && DOCUMENT_HELP[guided].insurerRequest && (
            <Link
              href={`/pro/onboarding/documents/assureur?type=${guided}` as Route}
              className={`flex min-h-touch items-center gap-3 rounded-input border border-border bg-surface px-4 py-3 hover:bg-background ${focusRing}`}
            >
              <Mail aria-hidden="true" className="size-5 shrink-0 text-label" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{g.notAtHand}</span>
                <span className="text-sm text-muted-foreground">{g.notAtHandHint}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          )}
          {guided === "decennale" && !exempt && (
            <form action={setDecennaleExempt}>
              <input type="hidden" name="value" value="oui" />
              <button
                type="submit"
                className={`flex min-h-touch w-full items-center gap-3 rounded-input border border-border bg-surface px-4 py-3 text-left hover:bg-background ${focusRing}`}
              >
                <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-label" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{t.exemptDeclare}</span>
                  <span className="text-sm text-muted-foreground">{t.exemptText}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
  if (!focused) return <div className="max-w-3xl">{cards}</div>;
  const focusedType = types[0];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {cards}
      <aside className="flex flex-col gap-4">
        {focusedType && stateOf(focusedType).help && (
          <div className={`${sheetCard} hidden lg:flex`}>
            <h2 className="text-[1.0625rem]">{fr.pro.onboarding.help.where}</h2>
            <DocumentHelpSteps type={focusedType} />
          </div>
        )}
        {focusedType && !guided && (
          // Pas de « region » ici : la page d'une pièce n'en compte qu'une (la pièce elle-même).
          <div className={sheetCard}>
            <h2 className="text-[1.0625rem]">{t.checksTitle}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-label">
              {t.checks[focusedType].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {fr.pro.onboarding.dossier.privacy}
        </p>
        {guided ? null : onboarding &&
          focusedType &&
          stateOf(focusedType).help &&
          !stateOf(focusedType).current ? (
          // « Déposer plus tard » (maquette du lot 61) : un vrai bouton, MENAO relance par e-mail.
          <div className={sheetCard}>
            <h2 className="text-[1.0625rem]">{fr.pro.onboarding.help.laterTitle}</h2>
            <p className="text-sm text-label">{fr.pro.onboarding.help.later}</p>
            <ButtonLink href="/pro/onboarding" variant="outline" block>
              <Clock aria-hidden="true" className="size-4" />
              {fr.pro.onboarding.help.laterButton}
            </ButtonLink>
          </div>
        ) : (
          <ButtonLink href="/pro/onboarding" variant="outline" block>
            {t.backToDossier}
          </ButtonLink>
        )}
      </aside>
    </div>
  );
}
