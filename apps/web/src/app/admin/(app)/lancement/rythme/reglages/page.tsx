import type { Metadata } from "next";
import type { Route } from "next";
import { CommercialPaceForm, PaceSettingsForm } from "@/components/launch/pace-forms";
import { LaunchHeader } from "@/components/launch/launch-tabs";
import { Alert, Card, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminPace } from "@/lib/admin/pace";

const t = fr.admin.launch.pace;
const s = t.settings;

export const metadata: Metadata = {
  title: `${s.title} · ${fr.admin.launch.title} — ${fr.admin.title}`,
};

/**
 * Réglages du rythme (F-184, lot 78, ADR 0381) : objectif commun et ses dates, rythme par
 * conseiller, repère et suivi ; objectifs propres de certains conseillers (temps partiel…).
 */
export default async function AdminLaunchPaceSettingsPage({
  searchParams,
}: PageProps<"/admin/lancement/rythme/reglages">) {
  const { supabase } = await requireAdmin();
  const { fait } = await searchParams;
  const pace = await getAdminPace(supabase);
  const own = pace?.conseillers.filter((c) => c.rythme_semaine !== null) ?? [];
  return (
    <div className="flex flex-col gap-6">
      <LaunchHeader current="rythme" intro={s.intro} />
      <div className="flex flex-col gap-1">
        <TextLink href={"/admin/lancement/rythme" as Route} className="self-start text-sm">
          ← {s.back}
        </TextLink>
        <h2 className="font-display text-2xl font-bold tracking-tight">{s.title}</h2>
      </div>
      {!pace ? (
        <Alert tone="error">{t.errors.unavailable}</Alert>
      ) : (
        <>
          <PaceSettingsForm
            settings={{
              objectif_valides: pace.settings.objectif_valides,
              debut: pace.settings.debut,
              fin: pace.settings.fin,
              rythme_semaine: pace.settings.rythme_semaine,
              rythme_demarrage: pace.settings.rythme_demarrage,
              semaines_demarrage: pace.settings.semaines_demarrage,
              repere_visites_jour: pace.settings.repere_visites_jour,
              email_lundi: pace.settings.email_lundi,
              classement_visible: pace.settings.classement_visible,
              alerte_retard: pace.settings.alerte_retard,
            }}
          />
          <Card id="objectifs-propres" className="flex scroll-mt-24 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-bold tracking-tight">{s.own.title}</h2>
              <p className="text-[0.9375rem] text-label">{s.own.lead}</p>
            </div>
            {fait === "objectif" && <Alert tone="success">{s.own.saved}</Alert>}
            {own.length === 0 ? (
              <p className="text-sm text-muted-foreground">{s.own.none}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-input border border-border">
                {own.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between"
                  >
                    <span className="font-semibold">{c.nom}</span>
                    <span className="text-sm text-label">
                      {s.own.current(c.rythme_semaine!, c.rythme_raison)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <CommercialPaceForm
              commercials={pace.conseillers.map((c) => ({ id: c.id, nom: c.nom }))}
            />
          </Card>
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{s.legal}</p>
        </>
      )}
    </div>
  );
}
