import type { Metadata } from "next";
import { fr } from "@/i18n/fr";

const t = fr.ranking;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

// TODO(legal) : texte à faire valider par l'avocat (information sur le classement des offres,
// art. L111-7 du Code de la consommation ; contrôle des avis, art. L111-7-2).
export default function RankingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-medium tracking-tight">{t.title}</h1>
      <p>{t.intro}</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium">{t.selectionTitle}</h2>
        <ul className="list-disc pl-6">
          {t.selection.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium">{t.orderTitle}</h2>
        <ol className="list-decimal pl-6">
          {t.order.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p>{t.limit}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium">{t.paidTitle}</h2>
        <p>{t.paid}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium">{t.reviewsTitle}</h2>
        <p>{t.reviews}</p>
      </section>
      <p className="text-sm text-muted-foreground">{t.updated}</p>
    </main>
  );
}
