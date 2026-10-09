import { timeLeft } from "@menao/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { getRequestDetail, requireArtisan } from "@/lib/artisan/requests";
import { Respond } from "./respond";

const t = fr.pro.onboarding.requests;
const s = fr.search;
const dayUtc = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Opportunité (F-17) : coordonnées et adresse exacte après acceptation seulement. */
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Link href="/pro/demandes" className="font-medium text-primary hover:underline">
        ← {t.backToList}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{[r.trade, r.ville_nom].filter(Boolean).join(" · ")}</h1>
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background px-3 py-0.5 text-sm">
            {t.status[r.status]}
          </span>
          {r.urgence && (
            <span className="rounded-full bg-danger-soft px-3 py-0.5 text-sm font-medium text-danger">
              {t.urgent}
            </span>
          )}
          {left && (
            <span className="text-sm text-muted-foreground">
              {t.timeLeft(left.hours, left.minutes)}
            </span>
          )}
        </p>
      </div>

      <Block title={t.client}>
        <p className="font-medium">{clientName || "—"}</p>
        {accepted ? (
          <div className="flex flex-wrap gap-3">
            {r.client.phone && (
              <a
                href={`tel:${r.client.phone}`}
                className="font-medium text-primary hover:underline"
              >
                {t.call} : {r.client.phone}
              </a>
            )}
            {r.client.email && (
              <a
                href={`mailto:${r.client.email}`}
                className="font-medium text-primary hover:underline"
              >
                {t.writeEmail} : {r.client.email}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.contactAfter}</p>
        )}
        <p className="text-sm">
          {t.callback} :{" "}
          {r.callback_mode === "plage" && r.callback_from && r.callback_to
            ? t.callbackRange(r.callback_from, r.callback_to)
            : t.callbackAsap}
        </p>
      </Block>

      <Block title={t.address}>
        <p>
          {accepted && r.adresse
            ? r.adresse
            : [r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
        </p>
        {accepted && r.lat !== null && r.lon !== null && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t.openMap}
          </a>
        )}
      </Block>

      <Block title={t.description}>
        <p className="whitespace-pre-line">{r.description}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {r.work_types.length > 0 && <Item label={t.works} value={r.work_types.join(", ")} />}
          {r.rooms.length > 0 && <Item label={t.rooms} value={r.rooms.join(", ")} />}
          {r.lieu_type && <Item label={t.lieu} value={s.lieux[r.lieu_type]} />}
          {r.surface && <Item label={t.surface} value={s.surfaces[r.surface]} />}
          <Item
            label={t.date}
            value={
              r.date_mode === "date" && r.date_souhaitee
                ? dayUtc.format(new Date(`${r.date_souhaitee}T00:00:00Z`))
                : s.results.date[
                    r.date_mode === "des_que_possible" ? "des_que_possible" : "inconnue"
                  ]
            }
          />
        </dl>
      </Block>

      {r.message && (
        <Block title={t.message}>
          <p className="whitespace-pre-line">{r.message}</p>
        </Block>
      )}

      {r.photos.length > 0 && (
        <Block title={t.photos}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(signed ?? []).map((p, i) =>
              p.signedUrl ? (
                <li key={p.signedUrl}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                  <img
                    src={p.signedUrl}
                    alt={t.photoAlt(i + 1)}
                    className="aspect-square w-full rounded-button object-cover"
                  />
                </li>
              ) : null,
            )}
          </ul>
        </Block>
      )}

      {r.status === "envoyee" && left && <Respond requestId={r.id} />}
    </main>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
