import { timeLeft } from "@menao/core";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getRequestDetail, requireArtisan } from "@/lib/artisan/requests";
import { Respond } from "./respond";

const t = fr.pro.onboarding.requests;
const s = fr.search;
const dayUtc = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Opportunité (F-17), maquette « Vue d'une opportunité » : coordonnées et adresse exacte après acceptation. */
export default async function ArtisanRequestPage({ params }: PageProps<"/pro/demandes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireArtisan();
  const r = await getRequestDetail(supabase, id);
  if (!r) notFound();

  const { data: signed } = r.photos.length
    ? await supabase.storage.from("project-photos").createSignedUrls(r.photos, 3600)
    : { data: [] };
  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  const accepted = r.status === "acceptee";
  const clientName = [r.client.first_name, r.client.last_name].filter(Boolean).join(" ");
  const title = [r.trade, r.summary].filter(Boolean).join(" — ") || r.trade || "";

  return (
    <main className="bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/pro/demandes"
            className="inline-flex items-center gap-1.5 self-start text-sm text-white/85 hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.backToList}
          </Link>
          <h1 className="text-[1.5rem] leading-tight font-medium tracking-tight sm:text-[1.75rem]">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-pill bg-white/15 px-3 py-1">{t.status[r.status]}</span>
            {r.urgence && (
              <span className="rounded-pill bg-white px-3 py-1 font-medium text-danger">
                {t.urgent}
              </span>
            )}
            {left && (
              <span className="inline-flex items-center gap-1.5 text-white/85">
                <Clock aria-hidden="true" className="size-4" />
                {t.timeLeft(left.hours, left.minutes)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <Block icon={<User />} title={t.client}>
          <p className="font-medium">{clientName || "—"}</p>
          {accepted ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {r.client.phone && (
                <a
                  href={`tel:${r.client.phone}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-primary px-4 text-sm font-medium text-primary-strong hover:bg-primary-softer"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {t.call} : {r.client.phone}
                </a>
              )}
              {r.client.email && (
                <a
                  href={`mailto:${r.client.email}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-primary px-4 text-sm font-medium text-primary-strong hover:bg-primary-softer"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {t.writeEmail} : {r.client.email}
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.contactAfter}</p>
          )}
          <p className="rounded-input bg-primary-softer px-3 py-2 text-xs text-primary-strong">
            {t.callback} :{" "}
            {r.callback_mode === "plage" && r.callback_from && r.callback_to
              ? t.callbackRange(r.callback_from, r.callback_to)
              : t.callbackAsap}
          </p>
        </Block>

        <Block icon={<MapPin />} title={t.address}>
          <p className="text-sm">
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
        </Block>

        <Block icon={<Wrench />} title={t.description}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{r.description}</p>
          {(signed ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {(signed ?? []).map((p, i) =>
                p.signedUrl ? (
                  <li key={p.signedUrl}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                    <img
                      src={p.signedUrl}
                      alt={t.photoAlt(i + 1)}
                      className="size-20 rounded-lg object-cover"
                    />
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <ul className="flex flex-wrap gap-1.5">
            {r.lieu_type && (
              <li>
                <Tag>{s.lieux[r.lieu_type]}</Tag>
              </li>
            )}
            {r.work_types.map((w) => (
              <li key={w}>
                <Tag>{w}</Tag>
              </li>
            ))}
            {r.rooms.map((room) => (
              <li key={room}>
                <Tag>{room}</Tag>
              </li>
            ))}
            {r.surface && (
              <li>
                <Tag>{s.surfacesShort[r.surface]}</Tag>
              </li>
            )}
          </ul>
        </Block>

        <Block icon={<Calendar />} title={t.date}>
          <p className="text-sm">
            {r.date_mode === "date" && r.date_souhaitee
              ? dayUtc.format(new Date(`${r.date_souhaitee}T00:00:00Z`))
              : s.results.date[
                  r.date_mode === "des_que_possible" ? "des_que_possible" : "inconnue"
                ]}
          </p>
        </Block>

        {r.message && (
          <Block icon={<MessageSquare />} title={t.message}>
            <p className="text-sm leading-relaxed whitespace-pre-line">{r.message}</p>
          </Block>
        )}

        {r.status === "envoyee" && left && (
          <div className="pt-2">
            <Respond requestId={r.id} />
          </div>
        )}
        {r.status !== "envoyee" && (
          <div>
            <StatusBadge tone={accepted ? "success" : "neutral"}>{t.status[r.status]}</StatusBadge>
          </div>
        )}
      </div>
    </main>
  );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2 className="flex items-center gap-2 text-[1.0625rem] font-medium">
        <span aria-hidden="true" className="text-primary [&>svg]:size-[1.125rem]">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
