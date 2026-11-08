import {
  Calendar,
  Clock,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  PhoneCall,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { Tag, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { RequestDetail } from "@/lib/artisan/requests";
import { formatClock, formatDay } from "@/lib/format";
import { DetailBlock, PhotoStrip } from "./detail";
import { ExpandableBlock } from "./expandable-text";
import { SheetChip, SheetSection, sheetCard } from "./sheet";

const t = fr.pro.onboarding.requests;
const s = fr.search;

/**
 * Cartes communes à l'opportunité (F-17) et au rendez-vous (F-18), d'après les maquettes.
 * Coordonnées et adresse exacte : seulement une fois le rendez-vous fixé (décision C, ADR 0014).
 */
export function RequestBlocks({
  detail: r,
  photoUrls,
  variant,
}: {
  detail: RequestDetail;
  photoUrls: string[];
  variant: "opportunite" | "rendez-vous";
}) {
  const accepted = r.status === "acceptee";
  const clientName = [r.client.first_name, r.client.last_name].filter(Boolean).join(" ");
  const tags = [
    ...(r.lieu_type ? [s.lieux[r.lieu_type]] : []),
    ...r.work_types,
    ...r.rooms,
    ...(r.surface ? [s.surfacesShort[r.surface]] : []),
    ...(r.budget ? [t.budget(s.budgets[r.budget])] : []),
  ];
  const wished =
    r.date_mode === "date" && r.date_souhaitee
      ? formatDay(`${r.date_souhaitee}T12:00:00Z`)
      : s.results.date[r.date_mode === "des_que_possible" ? "des_que_possible" : "inconnue"];

  return (
    <>
      <DetailBlock icon={<User />} title={t.client}>
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="font-medium">{clientName || "—"}</p>
          {accepted && r.client.email && (
            <a
              href={`mailto:${r.client.email}`}
              className="inline-flex items-center gap-1.5 self-start text-muted-foreground hover:text-primary-strong"
            >
              <Mail aria-hidden="true" className="size-3.5" />
              {r.client.email}
            </a>
          )}
          {accepted && r.client.phone && (
            <a
              href={`tel:${r.client.phone}`}
              className="self-start text-muted-foreground hover:text-primary-strong"
            >
              {r.client.phone}
            </a>
          )}
        </div>
        {accepted && r.client.phone && (
          <a
            href={`tel:${r.client.phone}`}
            className={`${buttonClasses({ variant: "outline", size: "sm" })} min-h-10`}
          >
            {t.call(r.client.first_name)}
            <PhoneCall aria-hidden="true" className="size-4" />
          </a>
        )}
        {!accepted && <p className="text-sm text-muted-foreground">{t.contactAfter}</p>}
        {variant === "opportunite" && (
          <p className="rounded-pill bg-primary-softer px-3 py-1.5 text-center text-xs text-primary-strong">
            {r.callback_mode === "plage" && r.callback_from && r.callback_to
              ? t.callbackRange(formatClock(r.callback_from), formatClock(r.callback_to))
              : t.callbackAsap}
          </p>
        )}
      </DetailBlock>

      <DetailBlock
        icon={<MapPin />}
        title={variant === "rendez-vous" ? fr.pro.appointment.place : t.address}
      >
        <p className="text-sm whitespace-pre-line">
          {accepted && r.adresse
            ? r.adresse
            : [r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
        </p>
        {r.hors_zone && (
          <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
            {t.outsideZone}
          </p>
        )}
        {accepted && r.lat !== null && r.lon !== null && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`}
            target="_blank"
            rel="noreferrer"
            className="self-start text-sm font-medium text-primary-strong hover:underline"
          >
            {t.openMap}
          </a>
        )}
      </DetailBlock>

      {r.artisan_brief && (
        <DetailBlock icon={<Sparkles />} title={t.brief}>
          <p className="text-sm leading-relaxed">{r.artisan_brief}</p>
          <p className="text-xs text-muted-foreground">{t.briefNote}</p>
        </DetailBlock>
      )}

      {r.autres_metiers.length > 0 && (
        <p className="rounded-input bg-primary-softer px-4 py-3 text-sm text-primary-strong">
          {t.otherTrades(r.autres_metiers.join(", "))}
        </p>
      )}

      <ExpandableBlock
        icon={<Wrench />}
        title={variant === "rendez-vous" ? fr.pro.appointment.reminder : t.description}
        before={r.summary ? <p className="text-sm font-medium">{r.summary}</p> : undefined}
        text={r.description}
        after={
          <>
            <PhotoStrip urls={photoUrls} altFor={t.photoAlt} />
            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      />

      <DetailBlock icon={<Calendar />} title={t.date}>
        <p className="text-sm">{wished}</p>
      </DetailBlock>

      {r.message && <ExpandableBlock icon={<MessageSquare />} title={t.message} text={r.message} />}
    </>
  );
}

/* ------------------------------------------------------------------------------------------
 * Refonte « Nette » (ADR 0246) : blocs des fiches demande et chantier, en cartes à grand titre.
 * ---------------------------------------------------------------------------------------- */

const st = fr.pro.sheet;

/** « La demande en bref » : résumé de l'IA en grand, avec sa pastille et sa mise en garde. */
export function RequestBrief({ detail: r }: { detail: RequestDetail }) {
  if (!r.artisan_brief) return null;
  return (
    <SheetSection
      id="demande-en-bref"
      title={t.brief}
      badge={<SheetChip tone="primary">{st.briefBadge}</SheetChip>}
    >
      <p className="text-[1.0625rem] leading-relaxed">{r.artisan_brief}</p>
      <p className="flex items-start gap-1.5 text-[0.8125rem] text-muted-foreground">
        <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t.briefNote}
      </p>
    </SheetSection>
  );
}

/** « Ce que dit le client » : sa description en citation, son message et ses photos. */
export function RequestClientWords({
  detail: r,
  photoUrls,
  title = st.clientSays,
}: {
  detail: RequestDetail;
  photoUrls: string[];
  title?: string;
}) {
  return (
    <SheetSection id="ce-que-dit-le-client" title={title}>
      <blockquote className="rounded-input bg-background px-4 py-3.5 text-[0.9375rem] leading-relaxed whitespace-pre-line">
        {r.description}
      </blockquote>
      {r.message && (
        <div className="flex flex-col gap-1">
          <span className="text-[0.8125rem] text-muted-foreground">{st.messageForYou}</span>
          <p className="font-medium whitespace-pre-line">{r.message}</p>
        </div>
      )}
      {photoUrls.length > 0 && (
        <ul className="flex flex-wrap gap-2.5">
          {photoUrls.map((url, i) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                <img
                  src={url}
                  alt={t.photoAlt(i + 1)}
                  className="size-24 rounded-xl object-cover sm:size-28"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </SheetSection>
  );
}

/** « Détails du chantier » en grille : logement, pièces, travaux, budget, début, autres métiers. */
export function RequestDetails({ detail: r }: { detail: RequestDetail }) {
  const wished =
    r.date_mode === "date" && r.date_souhaitee
      ? formatDay(`${r.date_souhaitee}T12:00:00Z`)
      : s.results.date[r.date_mode === "des_que_possible" ? "des_que_possible" : "inconnue"];
  const rooms = [r.rooms.join(", "), r.surface ? s.surfacesShort[r.surface] : null]
    .filter(Boolean)
    .join(" · ");
  const items: [string, string][] = [
    ...(r.lieu_type ? [[st.detail.lieu, s.lieux[r.lieu_type]] as [string, string]] : []),
    ...(rooms ? [[st.detail.rooms, rooms] as [string, string]] : []),
    ...(r.work_types.length
      ? [[st.detail.works, r.work_types.join(", ")] as [string, string]]
      : []),
    ...(r.budget ? [[st.detail.budget, s.budgets[r.budget]] as [string, string]] : []),
    [st.detail.start, wished],
  ];
  return (
    <SheetSection id="details-chantier" title={st.details}>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {r.autres_metiers.length > 0 && (
        // Chantier à plusieurs métiers (ADR 0167) : phrase complète, bien visible.
        <p className="rounded-input bg-primary-softer px-4 py-3 text-sm text-primary-strong">
          {t.otherTrades(r.autres_metiers.join(", "))}
        </p>
      )}
    </SheetSection>
  );
}

/**
 * Carte du client : prénom, créneau de rappel préféré, lieu (adresse exacte et coordonnées une
 * fois le rendez-vous fixé, décision C de l'ADR 0014).
 */
export function RequestClientCard({ detail: r }: { detail: RequestDetail }) {
  const accepted = r.status === "acceptee" || r.chantier_id !== null;
  const name = [r.client.first_name, accepted ? r.client.last_name : null]
    .filter(Boolean)
    .join(" ");
  const place =
    accepted && r.adresse ? r.adresse : [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
  return (
    <section aria-label={st.clientCard} className={sheetCard}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-strong">
          {(r.client.first_name ?? "?").charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{name || "—"}</span>
          <span className="text-sm text-muted-foreground">{st.particulier}</span>
        </span>
      </div>
      <p className="flex items-start gap-2.5 text-sm">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        {r.callback_mode === "plage" && r.callback_from && r.callback_to
          ? t.callbackRange(formatClock(r.callback_from), formatClock(r.callback_to))
          : t.callbackAsap}
      </p>
      <p className="flex items-start gap-2.5 text-sm whitespace-pre-line">
        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        {place || "—"}
      </p>
      {r.hors_zone && (
        <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
          {t.outsideZone}
        </p>
      )}
      {accepted ? (
        <div className="flex flex-col gap-2">
          {r.client.phone && (
            <a
              href={`tel:${r.client.phone}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-strong hover:underline"
            >
              <PhoneCall aria-hidden="true" className="size-4" />
              {t.call(r.client.first_name)}
              <span className="font-normal text-muted-foreground">{r.client.phone}</span>
            </a>
          )}
          {r.client.email && (
            <a
              href={`mailto:${r.client.email}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-strong hover:underline"
            >
              <Mail aria-hidden="true" className="size-4" />
              {r.client.email}
            </a>
          )}
          {r.lat !== null && r.lon !== null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-strong hover:underline"
            >
              <Navigation aria-hidden="true" className="size-4" />
              {t.openMap}
            </a>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t.contactAfter}
        </p>
      )}
    </section>
  );
}
