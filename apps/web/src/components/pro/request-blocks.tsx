import { Calendar, Mail, MapPin, MessageSquare, PhoneCall, User, Wrench } from "lucide-react";
import { Tag, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { RequestDetail } from "@/lib/artisan/requests";
import { formatClock, formatDay } from "@/lib/format";
import { DetailBlock, PhotoStrip } from "./detail";
import { ExpandableBlock } from "./expandable-text";

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
