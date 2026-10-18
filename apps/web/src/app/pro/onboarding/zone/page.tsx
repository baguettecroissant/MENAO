import { RADIUS_OPTIONS_KM } from "@menao/validation";
import { Card } from "@/components/ui";
import { getOnboardingContext } from "@/lib/artisan/context";
import { createClient } from "@/lib/supabase/server";
import { ZoneForm } from "./zone-form";

export default async function ZoneStepPage() {
  const { artisan, zones } = await getOnboardingContext();
  // Coordonnées de l'adresse de départ enregistrée, pour l'aperçu de la carte (ADR 0127).
  const supabase = await createClient();
  const { data: points } = await supabase.rpc("my_artisan_base_point");
  return (
    <Card>
      <ZoneForm
        radiusOptions={RADIUS_OPTIONS_KM}
        initial={{
          mode: artisan.zone_mode ?? "rayon",
          baseLabel: artisan.base_label,
          baseCitycode: artisan.base_code_insee,
          hasBaseLocation: artisan.base_location !== null,
          basePoint: points?.[0] ?? null,
          radiusKm: artisan.radius_km,
          communes: zones.map((z) => ({ code: z.code_insee, nom: z.nom })),
        }}
      />
    </Card>
  );
}
