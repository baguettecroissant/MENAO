import {
  chantierStepIndex,
  clientChantierAction,
  isChantierFinished,
  type ChantierStatus,
} from "@menao/core";
import type { Database } from "@menao/db";
import { MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { chantierTag, nextIntervention } from "@/lib/chantier/view";
import { rehirePath } from "@/lib/project/paths";
import { ChantierActionBlock } from "./chantier-action";
import { ChantierCover, PersonCard } from "./chantier-parts";
import { ChantierStatusTag } from "./chantier-status-tag";
import { ChantierStepper } from "./chantier-stepper";
import { NextIntervention } from "./next-intervention";

const t = fr.chantier;
export type ClientChantier =
  Database["public"]["Functions"]["particulier_chantiers"]["Returns"][number];

const tagOf = (c: ClientChantier) =>
  chantierTag({
    status: c.status as ChantierStatus,
    startAt: c.start_at,
    finishedAt: c.finished_at,
    closedAt: c.closed_at,
    receivedAt: c.received_at,
  });
const hrefOf = (c: ClientChantier) => `/mon-espace/chantiers/${c.chantier_id}` as Route;
/** Adresse du chantier, ou à défaut son code postal et sa ville. */
export const addressOf = (c: ClientChantier) =>
  c.adresse || [c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null;

/**
 * Carte d'un chantier en cours (maquette « Mes chantiers ») : photo, état, titre, adresse,
 * description, stepper, artisan, puis l'action attendue ou la prochaine intervention.
 */
export function ChantierCard({
  c,
  photoUrl,
  avatarUrl,
}: {
  c: ClientChantier;
  photoUrl: string | null;
  avatarUrl: string | null;
}) {
  const status = c.status as ChantierStatus;
  const step = chantierStepIndex(status);
  const action = clientChantierAction({
    status,
    quoteId: c.quote_id,
    quoteStatus: c.quote_status,
    depositCents: c.deposit_cents,
    depositStatus: c.deposit_status,
    balanceCents: c.balance_cents,
    balanceStatus: c.balance_status,
  });
  const next = nextIntervention({ status, appointmentAt: c.appointment_at, startAt: c.start_at });
  return (
    <article className="grid overflow-hidden rounded-card border border-border bg-surface shadow-card lg:grid-cols-[14rem_minmax(0,1fr)_20rem]">
      <Link href={hrefOf(c)} tabIndex={-1} aria-hidden="true" className="block">
        <ChantierCover url={photoUrl} trade={c.trade_label} className="h-44 w-full lg:h-full" />
      </Link>
      <div className="flex flex-col gap-3 p-5">
        <div>
          <ChantierStatusTag tag={tagOf(c)} />
        </div>
        <h3 className="text-lg leading-snug font-medium">
          <Link
            href={hrefOf(c)}
            className="rounded-sm hover:text-primary-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            {c.title}
          </Link>
        </h3>
        {addressOf(c) && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            {addressOf(c)}
          </p>
        )}
        {c.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
        )}
        {step !== null && (
          <div className="mt-auto pt-2">
            <ChantierStepper current={step} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-border bg-background/60 p-5 lg:border-t-0 lg:border-l">
        <PersonCard
          label={t.yourArtisan}
          name={c.artisan_name}
          detail={c.trade_label}
          verified
          photoUrl={avatarUrl}
        />
        {action ? (
          <ChantierActionBlock
            action={action}
            totalTtcCents={c.quote_total_ttc_cents}
            chantierId={c.chantier_id}
          />
        ) : next ? (
          <NextIntervention
            chantierId={c.chantier_id}
            next={next}
            title={c.title}
            location={addressOf(c)}
            artisanName={c.artisan_name}
            clientName={null}
            centered
          />
        ) : null}
      </div>
    </article>
  );
}

/** Carte d'un chantier terminé, annulé ou au devis refusé (maquette « Mes chantiers terminés »). */
export function FinishedChantierCard({
  c,
  photoUrl,
}: {
  c: ClientChantier;
  photoUrl: string | null;
}) {
  const status = c.status as ChantierStatus;
  return (
    <article className="flex overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <ChantierCover
        url={photoUrl}
        trade={c.trade_label}
        compact
        className="w-24 shrink-0 sm:w-28"
      />
      <div className="flex min-w-0 flex-col gap-1.5 p-3">
        <h3 className="text-sm font-medium">
          <Link
            href={hrefOf(c)}
            className="rounded-sm hover:text-primary-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            {c.title}
          </Link>
        </h3>
        {addressOf(c) && (
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            {addressOf(c)}
          </p>
        )}
        <div>
          <ChantierStatusTag tag={tagOf(c)} />
        </div>
        {isChantierFinished(status) && status !== "cloture" && (
          <TextLink href={`/recherche/${c.project_id}/artisans` as Route} className="text-xs">
            {t.chooseAnother}
          </TextLink>
        )}
        {status === "cloture" && (
          <TextLink
            href={rehirePath(c.artisan_id, c.chantier_id, c.artisan_name) as Route}
            className="text-xs"
          >
            {fr.myChantiers.rehire(c.artisan_name)}
          </TextLink>
        )}
      </div>
    </article>
  );
}
