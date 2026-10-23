"use client";

import {
  isValidSiret,
  normalizeSiret,
  signupBaseFromCompany,
  type ArtisanSignupCompany,
  type ArtisanSignupDraft,
} from "@menao/core";
import { COMPANY_SEARCH_MIN_LENGTH, messages, type CompanySuggestion } from "@menao/validation";
import { ArrowLeftRight, ArrowRight, Building2, CircleCheck, ChevronRight } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { searchCompanies } from "@/lib/artisan/company-search";
import { ChoiceGroup, LinkButton, SearchInput, StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.company;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: CompanySuggestion[] }
  | { status: "error" };

function toDraftCompany(c: CompanySuggestion): ArtisanSignupCompany {
  return {
    siret: c.siret,
    name: c.name,
    legalFormCode: c.legalFormCode,
    apeCode: c.apeCode,
    creationYear: c.creationYear,
    address: c.address,
    postcode: c.postcode,
    city: c.city,
    citycode: c.citycode,
    lon: c.lon,
    lat: c.lat,
    managers: c.managers,
  };
}

const formatSiret = (siret: string) =>
  siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");
const legalForm = (code: string | null) => (code ? (fr.formesJuridiques[code] ?? null) : null);
const managerName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;

/** Étape « entreprise » : recherche dans l'Annuaire des entreprises, ou SIRET saisi à la main. */
export function CompanyStep({
  draft,
  update,
  onNext,
}: {
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
  onNext: () => void;
}) {
  const company = draft.company;
  const ready = company !== null && draft.isDirigeant !== null && draft.assujettiTva !== null;

  return (
    <>
      <StepTitle title={t.title} lead={t.lead} />
      {company ? (
        <CompanyCard
          company={company}
          draft={draft}
          update={update}
          onReset={() => update({ company: null, isDirigeant: null })}
        />
      ) : (
        <CompanyFinder
          onPick={(c) => {
            const picked = toDraftCompany(c);
            update({
              company: picked,
              isDirigeant: null,
              base: signupBaseFromCompany(picked) ?? draft.base,
            });
          }}
          onManual={(siret) =>
            update({
              company: {
                siret,
                name: null,
                legalFormCode: null,
                apeCode: null,
                creationYear: null,
                address: null,
                postcode: null,
                city: null,
                citycode: null,
                lon: null,
                lat: null,
                managers: [],
              },
              isDirigeant: null,
            })
          }
        />
      )}
      <StepFooter>
        <Button size="lg" onClick={onNext} disabled={!ready}>
          {fr.pro.signUp.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}

function CompanyFinder({
  onPick,
  onManual,
}: {
  onPick: (company: CompanySuggestion) => void;
  onManual: (siret: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [manual, setManual] = useState(false);
  const q = query.trim();
  const tooShort = q.length < COMPANY_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading" });
      searchCompanies(q, controller.signal)
        .then((results) => setSearch({ status: "done", results }))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setSearch({ status: "error" });
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, tooShort]);

  if (manual) return <ManualSiret onSubmit={onManual} onCancel={() => setManual(false)} />;

  const results = !tooShort && search.status === "done" ? search.results : [];
  return (
    <div className="flex flex-col gap-3">
      <SearchInput label={t.search} value={query} onChange={setQuery} hint={t.searchHint} />
      <div aria-live="polite" className="flex flex-col gap-2">
        {!tooShort && search.status === "loading" && (
          <p className="text-sm text-muted-foreground">{t.searching}</p>
        )}
        {!tooShort && search.status === "error" && <Alert tone="info">{t.unavailable}</Alert>}
        {!tooShort && search.status === "done" && results.length === 0 && (
          <p className="rounded-input border border-border bg-surface p-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {t.noResult}
          </p>
        )}
      </div>
      {results.length > 0 && (
        <ul aria-label={t.results} className="flex flex-col gap-2">
          {results.map((c) => (
            <li key={c.siret}>
              <button
                type="button"
                onClick={() => onPick(c)}
                disabled={!c.active}
                className="flex w-full items-center gap-3 rounded-input border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
                  <Building2 aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      legalForm(c.legalFormCode),
                      c.city && `${c.city}${c.postcode ? ` (${c.postcode})` : ""}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.siret} {formatSiret(c.siret)}
                  </span>
                </span>
                {c.active ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <span className="shrink-0 rounded-chip bg-danger-soft px-2 py-1 text-xs font-semibold text-danger">
                    {t.closed}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <LinkButton onClick={() => setManual(true)}>{t.notListed}</LinkButton>
    </div>
  );
}

function ManualSiret({
  onSubmit,
  onCancel,
}: {
  onSubmit: (siret: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | undefined>();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const siret = normalizeSiret(String(new FormData(e.currentTarget).get("siret") ?? ""));
    if (!isValidSiret(siret)) return setError(messages.siretInvalid);
    onSubmit(siret);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field
        label={t.manualLabel}
        name="siret"
        inputMode="numeric"
        autoComplete="off"
        hint={t.manualHint}
        errors={error ? [error] : undefined}
      />
      <Button type="submit" variant="outline">
        {t.manualSubmit}
      </Button>
      <LinkButton onClick={onCancel}>{t.backToSearch}</LinkButton>
    </form>
  );
}

function CompanyCard({
  company,
  draft,
  update,
  onReset,
}: {
  company: ArtisanSignupCompany;
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
  onReset: () => void;
}) {
  const managers = company.managers;
  const single = managers.length === 1 ? managers[0] : undefined;
  const form = legalForm(company.legalFormCode);
  const rows: [string, string | null][] = [
    [t.siret, formatSiret(company.siret)],
    [t.seat, company.address],
    [t.activity, company.apeCode],
    [t.manager, managers.length ? managers.map(managerName).join(", ") : null],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-lg font-semibold">{company.name ?? t.manualName}</p>
            {(form || company.creationYear) && (
              <p className="text-sm text-muted-foreground">
                {[form, company.creationYear && t.createdIn(company.creationYear)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {company.name && (
              <span className="mt-1 inline-flex items-center gap-1 self-start rounded-pill bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                <CircleCheck aria-hidden="true" className="size-3.5" />
                {t.active}
              </span>
            )}
          </div>
          {/* Changer d'entreprise, là où se pose le regard : à côté du nom. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            block={false}
            onClick={onReset}
            className="shrink-0"
          >
            <ArrowLeftRight aria-hidden="true" className="size-4" />
            {t.change}
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {rows
            .filter((row): row is [string, string] => row[1] !== null)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <ChoiceGroup<boolean>
        legend={single ? t.isManager(managerName(single)) : t.isManagerGeneric}
        value={draft.isDirigeant}
        options={[
          { value: true, label: single ? t.yesMe : t.yes },
          { value: false, label: t.no },
        ]}
        onChange={(isDirigeant) => update({ isDirigeant })}
      />
      {draft.isDirigeant === false && (
        <Alert tone="info">
          <span className="flex flex-col gap-2">
            <span>{t.notManagerNote}</span>
            {/* « Non » choisi parce que l'entreprise n'est pas la bonne : on se rattrape ici. */}
            <span>
              {t.wrongCompany}{" "}
              <LinkButton onClick={onReset} className="min-h-0 text-sm">
                {t.change}
              </LinkButton>
            </span>
          </span>
        </Alert>
      )}

      <ChoiceGroup<boolean>
        legend={t.vatQuestion}
        hint={t.vatHint}
        value={draft.assujettiTva}
        options={[
          { value: true, label: t.yes },
          { value: false, label: t.no },
        ]}
        onChange={(assujettiTva) => update({ assujettiTva })}
      />
    </div>
  );
}
