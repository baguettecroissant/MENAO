import type { Metadata } from "next";
import { Suspense } from "react";
import { PartnerWidget } from "@/components/widget/partner-widget";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";

export const metadata: Metadata = {
  title: fr.widget.metaTitle,
  robots: { index: false, follow: false },
};

// Page statique (métiers en cache) ; le code partenaire est lu dans l'adresse côté navigateur.
export const revalidate = 3600;

/**
 * Widget des partenaires (F-59, lot 2, ADR 0138) : seule page affichable dans une iframe, sur un
 * site en HTTPS (en-têtes dans next.config). Sans en-tête ni pied de page du site.
 */
export default async function WidgetPage() {
  const { trades } = await seoCatalog();
  const options = trades.map(({ code, label }) => ({ code, label }));
  return (
    <main className="bg-transparent">
      {/* Fond transparent : le widget se fond dans la page du partenaire. */}
      <style>{"html,body{background:transparent}"}</style>
      <Suspense fallback={null}>
        <PartnerWidget trades={options} />
      </Suspense>
    </main>
  );
}
