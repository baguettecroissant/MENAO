import type { Metadata } from "next";
import { LaunchHeader } from "@/components/launch/launch-tabs";
import { PaceScreen } from "@/components/launch/pace-screen";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getLaunchFigures } from "@/lib/admin/launch-figures";
import { getAdminPace } from "@/lib/admin/pace";

const t = fr.admin.launch.pace;

export const metadata: Metadata = {
  title: `${t.title} · ${fr.admin.launch.title} — ${fr.admin.title}`,
};

/**
 * Onglet « Rythme » du lancement (F-184, lot 78, ADR 0381) : retard ou avance sur l'objectif
 * commun, projection au rythme récent, courbe, canaux des validés et conseillers de la semaine avec
 * leur état. Réservé aux admins (double authentification).
 */
export default async function AdminLaunchPacePage({
  searchParams,
}: PageProps<"/admin/lancement/rythme">) {
  const { supabase } = await requireAdmin();
  const { fait } = await searchParams;
  const [pace, figures] = await Promise.all([getAdminPace(supabase), getLaunchFigures(supabase)]);
  return (
    <div className="flex flex-col gap-6">
      <LaunchHeader current="rythme" intro={t.intro} />
      {fait === "reglages" && <Alert tone="success">{t.settings.saved}</Alert>}
      {pace ? (
        <PaceScreen pace={pace} figures={figures} />
      ) : (
        <Alert tone="error">{t.errors.unavailable}</Alert>
      )}
    </div>
  );
}
