import { RADIUS_OPTIONS_KM } from "@menao/validation";
import { Map as MapIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { createClient } from "@/lib/supabase/server";
import { ZoneForm } from "./zone-form";

const t = fr.pro.onboarding.zone;

export default async function ZoneStepPage() {
  const { artisan, zones, territoryCodes } = await getOnboardingContext();
  // Coordonnées de l'adresse de départ enregistrée, pour l'aperçu de la carte (ADR 0127).
  const supabase = await createClient();
  const { data: points } = await supabase.rpc("my_artisan_base_point");
  // Refonte « Nette » (lot 47, ADR 0316) : le formulaire à gauche, l'aide à droite.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
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
            territories: territoryCodes,
          }}
        />
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
            <MapIcon aria-hidden="true" className="size-5" />
          </span>
          <h2 className="text-base font-bold tracking-tight">{t.howTitle}</h2>
          <p className="text-sm leading-normal text-label">{t.howText}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="text-base font-bold tracking-tight">{t.tipTitle}</h2>
          <p className="text-sm leading-normal text-label">{t.wideNote}</p>
          <p className="text-[0.8125rem] text-muted-foreground">{t.tipMore}</p>
        </Card>
      </div>
    </div>
  );
}
