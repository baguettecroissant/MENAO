import { frenchVatNumber } from "@menao/core";
import { CircleCheck, Lock } from "lucide-react";
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

  const rows: [string, string | null][] = [
    ...(artisan.sirene_partial
      ? []
      : ([[t.raisonSociale, artisan.raison_sociale]] as [string, string | null][])),
    [
      t.formeJuridique,
      artisan.forme_juridique_code
        ? (fr.formesJuridiques[artisan.forme_juridique_code] ?? artisan.forme_juridique_code)
        : null,
    ],
    [t.ape, artisan.ape_code],
    [
      t.address,
      [artisan.adresse_ligne, artisan.adresse_code_postal, artisan.adresse_commune]
        .filter(Boolean)
        .join(" "),
    ],
  ];

  // Refonte « Nette » (lot 47, ADR 0316) : SIRET et entreprise à gauche ; logo et rappel à droite.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] font-bold tracking-tight">{t.verifyTitle}</h2>
          <SiretForm siret={artisan.siret} editable={editable} verified={verified} />
          {verified && artisan.sirene_checked_at && (
            <>
              {artisan.sirene_active === false ? (
                <Alert tone="error">{t.status.inactive}</Alert>
              ) : (
                <p className="flex items-center gap-2.5 rounded-input bg-success-soft px-3.5 py-3 text-sm">
                  <CircleCheck
                    aria-hidden="true"
                    className="size-[1.125rem] shrink-0 text-success"
                  />
                  <span>
                    <b>{t.status.ok}</b>{" "}
                    {t.verifiedOn(dateFormat.format(new Date(artisan.sirene_checked_at)))}
                  </span>
                </p>
              )}
              <dl className="flex flex-col text-[0.90625rem]">
                {rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 border-t border-border py-2.5"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-semibold">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {artisan.ape_eligible === false && (
                <p className="text-sm text-warning">{t.apeWarning}</p>
              )}
            </>
          )}
        </Card>

        {verified && artisan.sirene_active && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-[1.0625rem] font-bold tracking-tight">{t.detailsTitle}</h2>
            <CompanyForm
              partial={artisan.sirene_partial}
              raisonSociale={artisan.raison_sociale}
              nomCommercial={artisan.nom_commercial}
              assujettiTva={artisan.assujetti_tva}
              vatNumber={artisan.siren ? frenchVatNumber(artisan.siren) : null}
            />
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Logo des documents (ADR 0038) : modifiable à tout moment, même après la validation. */}
        <LogoCard userId={userId} logoUrl={logoUrl} hasLogo={artisan.logo_path !== null} />
        <Card className="flex flex-col gap-2">
          <span className="flex size-10 items-center justify-center rounded-input bg-background text-label">
            <Lock aria-hidden="true" className="size-5" />
          </span>
          <h2 className="text-base font-bold tracking-tight">{t.lockTitle}</h2>
          <p className="text-[0.84375rem] leading-[1.45] text-label">{t.siretLocked}</p>
        </Card>
      </div>
    </div>
  );
}
