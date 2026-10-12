import { frenchVatNumber } from "@menao/core";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { documentLogoUrl } from "@/lib/documents/logo";
import { CompanyForm } from "./company-form";
import { LogoCard } from "./logo-card";
import { SiretForm } from "./siret-form";

const t = fr.pro.onboarding.company;
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export default async function CompanyStepPage() {
  const { supabase, userId, artisan } = await getOnboardingContext();
  const verified = artisan.sirene_checked_at !== null;
  const editable = artisan.status === "brouillon";
  const logoUrl = await documentLogoUrl(supabase, artisan.logo_path);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-4 text-lg font-medium">{t.siretLabel}</h2>
        <SiretForm siret={artisan.siret} editable={editable} verified={verified} />
        {verified && artisan.sirene_checked_at && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {t.verifiedOn(dateFormat.format(new Date(artisan.sirene_checked_at)))}
            </p>
            {artisan.sirene_active === false && (
              <div className="sm:col-span-2">
                <Alert tone="error">{t.status.inactive}</Alert>
              </div>
            )}
            {!artisan.sirene_partial && (
              <Info label={t.raisonSociale} value={artisan.raison_sociale} />
            )}
            <Info
              label={t.formeJuridique}
              value={
                artisan.forme_juridique_code
                  ? (fr.formesJuridiques[artisan.forme_juridique_code] ??
                    artisan.forme_juridique_code)
                  : null
              }
            />
            <Info label={t.ape} value={artisan.ape_code} />
            <Info
              label={t.address}
              value={[artisan.adresse_ligne, artisan.adresse_code_postal, artisan.adresse_commune]
                .filter(Boolean)
                .join(" ")}
            />
            {artisan.ape_eligible === false && (
              <p className="text-sm text-warning sm:col-span-2">{t.apeWarning}</p>
            )}
          </dl>
        )}
      </Card>

      {verified && artisan.sirene_active && (
        <Card>
          <CompanyForm
            partial={artisan.sirene_partial}
            raisonSociale={artisan.raison_sociale}
            nomCommercial={artisan.nom_commercial}
            assujettiTva={artisan.assujetti_tva}
            vatNumber={artisan.siren ? frenchVatNumber(artisan.siren) : null}
          />
        </Card>
      )}

      {/* Logo des documents (ADR 0038) : modifiable à tout moment, même après la validation. */}
      <LogoCard userId={userId} logoUrl={logoUrl} hasLogo={artisan.logo_path !== null} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
