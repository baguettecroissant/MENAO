import { RADIUS_OPTIONS_KM } from "@menao/validation";
import { Card } from "@/components/ui";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ZoneForm } from "./zone-form";

export default async function ZoneStepPage() {
  const { artisan, zones } = await getOnboardingContext();
  return (
    <Card>
      <ZoneForm
        radiusOptions={RADIUS_OPTIONS_KM}
        initial={{
          mode: artisan.zone_mode ?? "rayon",
          baseLabel: artisan.base_label,
          baseCitycode: artisan.base_code_insee,
          hasBaseLocation: artisan.base_location !== null,
          radiusKm: artisan.radius_km,
          communes: zones.map((z) => ({ code: z.code_insee, nom: z.nom })),
        }}
      />
    </Card>
  );
}
