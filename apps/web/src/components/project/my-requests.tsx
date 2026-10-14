import { timeLeft } from "@menao/core";
import type { Database } from "@menao/db";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ChantierCover } from "@/components/chantier/chantier-parts";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { CancelRequestButton } from "@/components/project/cancel-buttons";
import { StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.myRequests;
export type RequestRow = Database["public"]["Functions"]["particulier_requests"]["Returns"][number];

const tone = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
} as const;

/**
 * Demandes en attente (F-11) : projets dont une demande n'a pas (encore) donné de chantier. Les
 * demandes acceptées mènent à leur chantier, avec les coordonnées de l'artisan (F-17).
 */
export function PendingRequests({
  rows,
  photoUrls,
  avatarUrls,
  now,
  cancelledByClient = new Set(),
}: {
  rows: RequestRow[];
  /** Première photo de chaque projet, par identifiant de projet. */
  photoUrls: ReadonlyMap<string, string>;
  avatarUrls: ReadonlyMap<string, string>;
  now: Date;
  /** Demandes annulées par le client lui-même (motif renseigné). */
  cancelledByClient?: ReadonlySet<string>;
}) {
  const projectIds = [...new Set(rows.filter((r) => !r.chantier_id).map((r) => r.project_id))];
  return (
    <ul className="flex flex-col gap-5">
      {projectIds.map((projectId) => {
        const items = rows.filter((r) => r.project_id === projectId);
        const head = items[0];
        if (!head) return null;
        const lead = items.find((r) => r.status === "acceptee") ?? head;
        const canChoose = items.some(
          (r) => r.status === "refusee" || r.status === "expiree" || r.status === "annulee",
        );
        return (
          <li
            key={projectId}
            className="grid overflow-hidden rounded-card border border-border bg-surface shadow-card md:grid-cols-[14rem_1fr_17rem]"
          >
            <ChantierCover
              url={photoUrls.get(projectId) ?? null}
              trade={head.trade_label}
              className="h-36 w-full md:h-full"
            />
            <div className="flex flex-col gap-3 p-5">
              <div>
                <StatusBadge tone={tone[lead.status]}>{t.status[lead.status]}</StatusBadge>
              </div>
              <h3 className="text-lg font-medium">{head.trade_label}</h3>
              {head.ville_nom && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {head.ville_nom}
                </p>
              )}
              {head.summary && <p className="text-sm text-muted-foreground">{head.summary}</p>}
              {canChoose && (
                <TextLink
                  href={`/recherche/${projectId}/artisans` as Route}
                  className="mt-auto text-sm"
                >
                  {t.chooseAnother}
                </TextLink>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-border bg-background/60 p-5 md:border-t-0 md:border-l">
              <p className="text-xs text-muted-foreground">{t.yourArtisans}</p>
              <ul className="flex flex-col gap-3">
                {items.map((r) => {
                  const left =
                    r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
                  return (
                    <li
                      key={r.request_id}
                      className="flex flex-col gap-2 rounded-input border border-border bg-surface p-3"
                    >
                      <div className="flex items-center gap-3">
                        <ArtisanPhoto
                          url={avatarUrls.get(r.artisan_id) ?? null}
                          name={r.artisan_name}
                          className="size-10 shrink-0 rounded-full"
                          initialsClassName="text-sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.artisan_name}</p>
                          <p
                            className={`text-xs ${r.status === "acceptee" ? "text-success" : r.status === "refusee" ? "text-danger" : "text-muted-foreground"}`}
                          >
                            {t.status[r.status]}
                          </p>
                        </div>
                      </div>
                      {left && (
                        <p className="text-xs text-muted-foreground">
                          {t.timeLeft(left.hours, left.minutes)}
                        </p>
                      )}
                      {r.status === "envoyee" && (
                        <CancelRequestButton
                          requestId={r.request_id}
                          artisanName={r.artisan_name}
                        />
                      )}
                      {r.status === "annulee" && cancelledByClient.has(r.request_id) ? (
                        <p className="text-xs text-muted-foreground">{t.cancelledByYou}</p>
                      ) : (
                        r.status === "annulee" &&
                        r.chantier_status === "annule" && (
                          <p className="text-xs text-muted-foreground">{t.cancelledByArtisan}</p>
                        )
                      )}
                      {r.status === "acceptee" && (r.artisan_phone || r.artisan_email) && (
                        <div className="flex flex-col gap-1 text-xs">
                          {r.artisan_phone && (
                            <a
                              href={`tel:${r.artisan_phone}`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline"
                            >
                              <Phone aria-hidden="true" className="size-3.5" />
                              {r.artisan_phone}
                            </a>
                          )}
                          {r.artisan_email && (
                            <a
                              href={`mailto:${r.artisan_email}`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline"
                            >
                              <Mail aria-hidden="true" className="size-3.5" />
                              {r.artisan_email}
                            </a>
                          )}
                        </div>
                      )}
                      {r.chantier_id && r.chantier_status !== "annule" && (
                        <Link
                          href={`/mon-espace/chantiers/${r.chantier_id}` as Route}
                          className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary-strong hover:underline"
                        >
                          {t.seeChantier}
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/recherche/${projectId}/artisans` as Route}
                className="text-xs font-medium text-primary-strong hover:underline"
              >
                {t.seeArtisans}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
