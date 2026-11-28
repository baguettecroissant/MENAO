"use client";

import { subscriptionPayback } from "@menao/core";
import { Eye, QrCode, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrSvg } from "@/components/pro/share-card";
import { fr } from "@/i18n/fr";

const t = fr.commercialField.show;
const calc = fr.pro.landing.calculator;
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export type ShowTab = "demo" | "calcul" | "formules" | "inscription";
type Plan = { code: string; nom: string; monthlyCents: number; accroche: string | null };

const MARGINS = [10, 15, 20, 25, 30] as const;
const JOBS = [1500, 3000, 4500, 8000, 15000] as const;

/**
 * Écran « Montrer à l'artisan » (ADR 0394) : 4 onglets en plein écran sombre. Le calcul reprend
 * subscriptionPayback (@menao/core), comme le calculateur de /pro/formules, avec la même note :
 * aucune promesse de volume de demandes.
 */
export function ShowArtisan({
  initialTab,
  plans,
  link,
  qr,
}: {
  initialTab: ShowTab;
  plans: Plan[];
  link: string | null;
  qr: { size: number; path: string } | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ShowTab>(initialTab);
  const [job, setJob] = useState(4500);
  const [margin, setMargin] = useState(20);
  const [code, setCode] = useState(plans[0]?.code ?? "");
  const plan = plans.find((p) => p.code === code) ?? plans[0];
  const result = plan ? subscriptionPayback(plan.monthlyCents, job * 100, margin) : null;

  const pill = (on: boolean) =>
    `flex-1 rounded-input py-2.5 text-center text-sm font-bold ${on ? "bg-white text-[#0e1426]" : "bg-white/8 text-white"}`;

  return (
    <main className="min-h-dvh bg-[#0e1426] text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-5 pb-10">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight">menao</span>
          <button
            type="button"
            aria-label={t.close}
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/commercial/tournee")
            }
            className="inline-flex size-11 items-center justify-center rounded-full bg-white/10"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div role="tablist" aria-label={t.label} className="flex gap-1 rounded-card bg-white/8 p-1">
          {(Object.keys(t.tabs) as ShowTab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-input px-1 py-2.5 text-[0.8125rem] font-bold ${tab === key ? "bg-white text-[#0e1426]" : "text-[#aeb6c8]"}`}
            >
              {t.tabs[key]}
            </button>
          ))}
        </div>

        {tab === "demo" && (
          <section className="flex flex-col gap-4" role="tabpanel">
            <h1 className="text-[1.75rem] leading-tight font-bold">{t.demoTitle}</h1>
            <p className="text-[0.9375rem] text-[#c9cfdc]">{t.demoText}</p>
            <Link
              href={"/pro/decouvrir/tableau-de-bord" as Route}
              className="flex min-h-14 items-center justify-center gap-2 rounded-pill bg-white text-base font-bold text-[#0e1426]"
            >
              <Eye aria-hidden="true" className="size-5" />
              {t.demoOpen}
            </Link>
          </section>
        )}

        {tab === "calcul" && plan && (
          <section className="flex flex-col gap-4" role="tabpanel">
            <h1 className="text-[1.75rem] leading-tight font-bold">{t.calcTitle}</h1>
            {plans.length > 1 && (
              <div className="flex gap-1.5">
                {plans.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    aria-pressed={p.code === plan.code}
                    onClick={() => setCode(p.code)}
                    className={pill(p.code === plan.code)}
                  >
                    {p.nom}
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm text-[#aeb6c8]">{t.job}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {JOBS.map((j) => (
                <button
                  key={j}
                  type="button"
                  aria-pressed={job === j}
                  onClick={() => setJob(j)}
                  className={pill(job === j)}
                >
                  {(j / 1000).toLocaleString("fr-FR")} k€
                </button>
              ))}
            </div>
            <p className="text-sm text-[#aeb6c8]">{t.margin}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {MARGINS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={margin === m}
                  onClick={() => setMargin(m)}
                  className={`rounded-input py-2.5 text-sm font-bold ${margin === m ? "bg-[#7ee2b0] text-[#0e1426]" : "bg-white/8"}`}
                >
                  {m} %
                </button>
              ))}
            </div>
            <dl className="flex flex-col">
              <div className="flex items-baseline justify-between border-t border-white/10 py-3.5">
                <dt className="text-[0.9375rem] text-[#c9cfdc]">{t.marginPerJob}</dt>
                <dd className="text-xl font-bold">{result ? euros(result.marginCents) : "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 py-3.5">
                <dt className="text-[0.9375rem] text-[#c9cfdc]">{t.plan(plan.nom)}</dt>
                <dd className="text-xl font-bold">{t.perMonth(euros(plan.monthlyCents))}</dd>
              </div>
              <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
                <dt className="text-[0.9375rem] text-[#c9cfdc]">{t.paidBy(plan.nom)}</dt>
                <dd className="text-[2rem] leading-tight font-bold text-[#7ee2b0]">
                  {result
                    ? result.kind === "every"
                      ? calc.every(result.months)
                      : calc.perMonth(result.jobs)
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-[#8d96aa]">{t.calcNote}</p>
            <button
              type="button"
              onClick={() => setTab("inscription")}
              className="flex min-h-14 items-center justify-center gap-2 rounded-pill bg-white text-base font-bold text-[#0e1426]"
            >
              <QrCode aria-hidden="true" className="size-5" />
              {t.signupCta}
            </button>
          </section>
        )}

        {tab === "formules" && (
          <section className="flex flex-col gap-3" role="tabpanel">
            <h1 className="text-[1.75rem] leading-tight font-bold">{t.plansTitle}</h1>
            {plans.map((p) => (
              <div key={p.code} className="flex flex-col gap-1 rounded-card bg-white/8 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-bold">{p.nom}</span>
                  <span className="text-xl font-bold">{t.perMonth(euros(p.monthlyCents))}</span>
                </div>
                {p.accroche && <p className="text-sm text-[#c9cfdc]">{p.accroche}</p>}
              </div>
            ))}
            <p className="text-sm text-[#aeb6c8]">{t.plansNote}</p>
          </section>
        )}

        {tab === "inscription" && (
          <section className="flex flex-col items-center gap-4 text-center" role="tabpanel">
            <h1 className="text-[1.75rem] leading-tight font-bold">{t.signupTitle}</h1>
            {qr && link ? (
              <>
                <div className="w-full max-w-72 rounded-card bg-white p-4 text-[#0e1426]">
                  <QrSvg qr={qr} label={t.signupTitle} className="aspect-square w-full" />
                </div>
                <p className="text-[0.9375rem] text-[#c9cfdc]">{t.signupText}</p>
                <p className="text-sm break-all text-[#8d96aa]">{link}</p>
              </>
            ) : (
              <p className="text-[0.9375rem] text-[#c9cfdc]">{t.noCode}</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
