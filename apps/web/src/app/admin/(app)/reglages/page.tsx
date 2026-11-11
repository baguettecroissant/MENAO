import type { Metadata } from "next";
import { AdminSectionHeader } from "@/components/admin/admin-tabs";
import { CommercialBonusSettingsForm } from "@/components/admin/commercial-forms";
import { DefaultLeadTargetForm } from "@/components/admin/lead-target-forms";
import { PartnerSettingsForm } from "@/components/admin/partner-forms";
import { ClientRatingsSetting } from "@/components/admin/platform-setting";
import { ReceptionCard } from "@/components/admin/reception-card";
import { SettingsCard, SettingsChangeLine, SettingsNav } from "@/components/admin/settings";
import { LaunchSettingsForm } from "@/components/launch/figures-forms";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getSettingsPage } from "@/lib/admin/settings";

const t = fr.admin.settingsPage;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Réglages (F-133, ADR 0284) : tous les réglages de la plateforme au même endroit, avec un
 * sous-menu, la dernière modification de chacun (journal d'audit) ; onglet voisin : l'équipe.
 * Retours d'un enregistrement qui recharge la page : ?fait=objectif, ?fait=lancement.
 */
export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/reglages">) {
  const { fait } = await searchParams;
  const { supabase } = await requireAdmin();
  const s = await getSettingsPage(supabase);
  const c = s.changes;

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeader set="settings" current="settings" intro={t.intro} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-56 lg:shrink-0 lg:self-stretch">
          <SettingsNav />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <SettingsCard
            id="plateforme"
            title={t.sections.plateforme}
            lead={t.platformLead}
            change={c.plateforme}
          >
            <ClientRatingsSetting visible={s.ratingsVisible} />
          </SettingsCard>

          <SettingsCard
            id="demandes"
            title={t.sections.demandes}
            lead={fr.admin.leads.settings.lead}
            change={c.demandes}
          >
            <DefaultLeadTargetForm target={s.leadsTarget} saved={fait === "objectif"} />
          </SettingsCard>

          {s.reception && (
            <ReceptionCard
              settings={s.reception.settings}
              state={s.reception.state}
              canEdit
              title={t.sections.accueil}
              footer={<SettingsChangeLine change={c.accueil} />}
            />
          )}

          {s.partners && (
            <SettingsCard
              id="partenaires"
              title={t.sections.partenaires}
              lead={fr.admin.partners.settings.lead}
              change={c.partenaires}
            >
              {(s.partners.montant_demande_centimes === null ||
                s.partners.montant_abonne_centimes === null) && (
                <Alert tone="info">{fr.admin.partners.settings.notSet}</Alert>
              )}
              <PartnerSettingsForm settings={s.partners} />
            </SettingsCard>
          )}

          {s.commercials && (
            <SettingsCard
              id="commerciaux"
              title={t.sections.commerciaux}
              lead={fr.admin.commercialResults.settings.lead}
              change={c.commerciaux}
            >
              {(s.commercials.prime_validation_centimes === null ||
                s.commercials.prime_abonnement_centimes === null) && (
                <Alert tone="info">{fr.admin.commercialResults.settings.notSet}</Alert>
              )}
              <CommercialBonusSettingsForm settings={s.commercials} />
            </SettingsCard>
          )}

          <SettingsCard
            id="lancement"
            title={t.sections.lancement}
            lead={fr.admin.launch.figures.settings.lead}
            change={c.lancement}
          >
            {fait === "lancement" && (
              <Alert tone="success">{fr.admin.launch.figures.settings.saved}</Alert>
            )}
            <LaunchSettingsForm settings={s.launch} />
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
