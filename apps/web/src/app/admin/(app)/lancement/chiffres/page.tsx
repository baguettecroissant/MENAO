import type { Metadata } from "next";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { LaunchFiguresScreen } from "@/components/launch/figures-screen";
import { LaunchHeader } from "@/components/launch/launch-tabs";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getLaunchCoverage, getLaunchFigures } from "@/lib/admin/launch-figures";

const tl = fr.admin.launch;
const t = tl.figures;
/**
 * Tables dont un changement relance les chiffres (inscriptions, validations, demandes : un projet
 * naît toujours avec ses demandes) ; changements regroupés sur 15 s, le calcul étant complet.
 */
const LIVE_TABLES = ["artisans", "requests"] as const;
const LIVE_DEBOUNCE_MS = 15_000;

export const metadata: Metadata = { title: `${t.title} · ${tl.title} — ${fr.admin.title}` };

/**
 * Onglet « Chiffres » du lancement (F-66, lot 2, ADR 0209) : chiffres en direct calculés en base
 * sur les vraies données de MENAO (admin_launch_figures, admin_launch_coverage), face aux cibles
 * importées avec le plan ; actualisés à chaque inscription, validation ou demande (sinon chaque
 * minute). Retour d'un enregistrement des réglages : ?fait=reglages. Réservé aux admins.
 */
export default async function AdminLaunchFiguresPage({
  searchParams,
}: PageProps<"/admin/lancement/chiffres">) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [figures, coverage] = await Promise.all([
    getLaunchFigures(supabase),
    getLaunchCoverage(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <LaunchHeader
        current="chiffres"
        intro={t.intro}
        aside={
          <LiveRefresh
            renderedAt={new Date().toISOString()}
            channel="admin:lancement"
            tables={LIVE_TABLES}
            debounceMs={LIVE_DEBOUNCE_MS}
          />
        }
      />
      {figures ? (
        <LaunchFiguresScreen
          figures={figures}
          coverage={coverage}
          saved={query.fait === "reglages"}
        />
      ) : (
        <Alert tone="error">{t.error}</Alert>
      )}
    </div>
  );
}
