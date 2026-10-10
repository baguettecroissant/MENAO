import { canReview } from "@menao/core";
import { ArrowLeft, Check, CircleCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PersonCard } from "@/components/chantier/chantier-parts";
import { ReviewForm } from "@/components/review/review-form";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { avatarUrl } from "@/lib/chantier/storage";
import { createClient } from "@/lib/supabase/server";

const t = fr.review;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Confettis décoratifs de l'écran de remerciement (maquette « Merci pour votre évaluation »).
const CONFETTI = [
  "top-3 left-[12%] bg-primary rotate-12",
  "top-8 left-[30%] bg-warning -rotate-6",
  "top-2 left-[55%] bg-success rotate-45",
  "top-10 left-[72%] bg-primary -rotate-12",
  "top-4 left-[88%] bg-warning rotate-6",
  "top-16 left-[20%] bg-success -rotate-45",
  "top-14 left-[82%] bg-primary rotate-12",
];

export const metadata: Metadata = { title: `${t.pageTitle} — MENAO` };

/**
 * Avis du client (F-28, maquettes « Comment s'est passée votre expérience ? » et « Merci pour
 * votre évaluation ») : possible dès le PV de réception signé, un avis par chantier. Ordre de fin
 * de chantier (F-27) : PV, solde, puis avis ; l'avis ne conditionne aucun paiement.
 */
export default async function ReviewPage({ params }: PageProps<"/mon-espace/chantiers/[id]/avis">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/chantiers/${id}/avis` as Route);
  }
  const chantierHref = `/mon-espace/chantiers/${id}` as Route;
  const [{ data: rows }, { data: reception }, { data: review }] = await Promise.all([
    supabase.rpc("particulier_chantiers", { p_chantier_id: id }),
    supabase.from("receptions").select("status").eq("chantier_id", id).maybeSingle(),
    supabase.from("reviews").select("id").eq("chantier_id", id).maybeSingle(),
  ]);
  const c = rows?.[0];
  if (!c) notFound();
  const receptionSigned = reception?.status === "signe";
  if (!review && !canReview({ receptionSigned, hasReview: false })) redirect(chantierHref);
  const closed = c.status === "cloture";

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={chantierHref}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <nav aria-label={fr.reception.stepsLabel} className="flex border-b border-border">
          {[
            { label: fr.reception.steps.pv, done: true },
            { label: fr.reception.steps.solde, done: closed },
          ].map((step) => (
            <span
              key={step.label}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 pb-3 text-center text-sm ${
                step.done ? "text-success" : "text-subtle-foreground"
              }`}
            >
              {step.done && <Check aria-hidden="true" className="size-4 shrink-0" />}
              {step.label}
            </span>
          ))}
          <span
            aria-current="step"
            className="flex-1 border-b-2 border-primary pb-3 text-center text-sm font-medium text-primary-strong"
          >
            {fr.reception.steps.avis}
          </span>
        </nav>

        {review ? (
          <section className="relative flex flex-col items-center gap-4 overflow-hidden rounded-card border border-border bg-surface px-6 pt-14 pb-8 text-center shadow-card">
            {CONFETTI.map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={`absolute h-2.5 w-1.5 rounded-[2px] ${position}`}
              />
            ))}
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check aria-hidden="true" className="size-6" strokeWidth={2.5} />
            </span>
            <h1 className="text-xl font-medium tracking-tight">{t.thanksTitle}</h1>
            <p className="max-w-md text-sm text-muted-foreground">{t.thanksText}</p>
            <ButtonLink href={chantierHref} size="lg" className="mt-2 w-full sm:w-auto">
              {t.back}
            </ButtonLink>
            <TextLink
              href={`/recherche/${c.project_id}/artisans/${c.artisan_id}` as Route}
              className="text-sm"
            >
              {t.seeProfile(c.artisan_name)}
            </TextLink>
          </section>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CircleCheck aria-hidden="true" className="size-6" />
              </span>
              <h1 className="max-w-md text-xl font-medium tracking-tight sm:text-2xl">
                {t.title(c.artisan_name)}
              </h1>
              <p className="max-w-md text-sm text-muted-foreground">{t.intro}</p>
            </div>
            <ReviewForm
              chantierId={id}
              artisanName={c.artisan_name}
              artisanCard={
                <PersonCard
                  label={t.yourArtisan}
                  name={c.artisan_name}
                  detail={c.trade_label}
                  verified
                  photoUrl={avatarUrl(supabase, c.artisan_avatar_path)}
                />
              }
            />
          </>
        )}
      </div>
    </main>
  );
}
