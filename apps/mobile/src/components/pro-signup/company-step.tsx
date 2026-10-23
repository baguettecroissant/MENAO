import {
  FORMES_JURIDIQUES,
  isValidSiret,
  normalizeSiret,
  signupBaseFromCompany,
  type ArtisanSignupCompany,
  type ArtisanSignupDraft,
} from "@menao/core";
import { messages } from "@menao/validation";
import { Building2, ChevronRight, CircleCheck } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { searchCompanies, type CompanySuggestion } from "@/lib/artisan-signup";
import { Button, Card, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";
import { ChoiceGroup, Muted, SearchField, StepTitle } from "./signup-parts";

const t = fr.proSignup.company;
const { colors, font, radius, spacing } = theme;

type Search =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; results: CompanySuggestion[] }
  | { status: "error"; query: string };

const formatSiret = (siret: string) =>
  siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");
const legalForm = (code: string | null) => (code ? (FORMES_JURIDIQUES[code] ?? null) : null);
const managerName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;

function toDraftCompany(c: CompanySuggestion): ArtisanSignupCompany {
  const { siren: _siren, active: _active, ...company } = c;
  return company;
}

const manualCompany = (siret: string): ArtisanSignupCompany => ({
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
});

/** Étape « entreprise » : Annuaire des entreprises, ou SIRET saisi à la main (ADR 0110). */
export function CompanyStep({
  draft,
  update,
  taken = false,
}: {
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
  /** Entreprise déjà inscrite (ADR 0175) : l'écran bloque la suite. */
  taken?: boolean;
}) {
  const company = draft.company;
  return (
    <>
      <StepTitle title={t.title} lead={t.lead} />
      {taken ? (
        <View style={styles.taken}>
          <Notice tone="error">{`${t.taken.title}. ${t.taken.text}`}</Notice>
          <LinkText label={t.taken.signIn} onPress={() => router.push("/connexion")} />
          <LinkText label={t.taken.contact} onPress={() => router.push("/aide")} />
        </View>
      ) : null}
      {company ? (
        <CompanyCard company={company} draft={draft} update={update} />
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
          onManual={(siret) => update({ company: manualCompany(siret), isDirigeant: null })}
        />
      )}
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
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [manual, setManual] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading", query: q });
      searchCompanies(q, controller.signal)
        .then((results) => setSearch({ status: "done", query: q, results }))
        .catch(() => {
          if (!controller.signal.aborted) setSearch({ status: "error", query: q });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  if (manual) return <ManualSiret onSubmit={onManual} onCancel={() => setManual(false)} />;

  // Résultats de la saisie en cours seulement.
  const current = search.status !== "idle" && search.query === q ? search : null;
  return (
    <View style={styles.finder}>
      <SearchField label={t.search} value={query} onChangeText={setQuery} hint={t.searchHint} />
      {current?.status === "loading" ? <Muted>{t.searching}</Muted> : null}
      {current?.status === "error" ? <Notice tone="info">{t.unavailable}</Notice> : null}
      {current?.status === "done" && current.results.length === 0 ? (
        <Muted>{t.noResult}</Muted>
      ) : null}
      {current?.status === "done"
        ? current.results.map((c) => (
            <Pressable
              key={c.siret}
              role="button"
              aria-label={c.name}
              aria-disabled={!c.active}
              disabled={!c.active}
              onPress={() => onPick(c)}
              style={({ pressed }) => [
                styles.result,
                !c.active && styles.resultClosed,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.resultIcon}>
                <Building2 size={20} color={colors["primary-strong"]} />
              </View>
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{c.name}</Text>
                <Text style={styles.resultMeta}>
                  {[
                    legalForm(c.legalFormCode),
                    c.city && `${c.city}${c.postcode ? ` (${c.postcode})` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={styles.resultSiret}>
                  {t.siret} {formatSiret(c.siret)}
                </Text>
              </View>
              {c.active ? (
                <ChevronRight size={20} color={colors["muted-foreground"]} />
              ) : (
                <Text style={styles.closed}>{t.closed}</Text>
              )}
            </Pressable>
          ))
        : null}
      <LinkText label={t.notListed} onPress={() => setManual(true)} />
    </View>
  );
}

function ManualSiret({
  onSubmit,
  onCancel,
}: {
  onSubmit: (siret: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <View style={styles.finder}>
      <TextField
        label={t.manualLabel}
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        hint={t.manualHint}
        error={error}
      />
      <Button
        label={t.manualSubmit}
        variant="secondary"
        onPress={() => {
          const siret = normalizeSiret(value);
          if (!isValidSiret(siret)) return setError(messages.siretInvalid);
          onSubmit(siret);
        }}
      />
      <LinkText label={t.backToSearch} onPress={onCancel} />
    </View>
  );
}

function CompanyCard({
  company,
  draft,
  update,
}: {
  company: ArtisanSignupCompany;
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
}) {
  const single = company.managers.length === 1 ? company.managers[0] : undefined;
  const form = legalForm(company.legalFormCode);
  const rows: [string, string | null][] = [
    [t.siret, formatSiret(company.siret)],
    [t.seat, company.address],
    [t.activity, company.apeCode],
    [t.manager, company.managers.length ? company.managers.map(managerName).join(", ") : null],
  ];
  return (
    <>
      <Card>
        <View style={styles.cardHead}>
          <View style={styles.cardTitle}>
            <Text style={styles.cardName}>{company.name ?? t.manualName}</Text>
            {form || company.creationYear ? (
              <Text style={styles.resultMeta}>
                {[form, company.creationYear && t.createdIn(company.creationYear)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
          {company.name ? (
            <View style={styles.active}>
              <CircleCheck size={14} color={colors.success} />
              <Text style={styles.activeText}>{t.active}</Text>
            </View>
          ) : null}
        </View>
        {rows
          .filter((row): row is [string, string] => row[1] !== null)
          .map(([label, value]) => (
            <View key={label} style={styles.detail}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        <LinkText label={t.notMine} onPress={() => update({ company: null, isDirigeant: null })} />
      </Card>
      <ChoiceGroup<boolean>
        legend={single ? t.isManager(managerName(single)) : t.isManagerGeneric}
        value={draft.isDirigeant}
        options={[
          { value: true, label: single ? t.yesMe : t.yes },
          { value: false, label: t.no },
        ]}
        onChange={(isDirigeant) => update({ isDirigeant })}
      />
      {draft.isDirigeant === false ? <Notice tone="info">{t.notManagerNote}</Notice> : null}
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
    </>
  );
}

const styles = StyleSheet.create({
  finder: { gap: spacing(3) },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultClosed: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: { flex: 1, gap: 2 },
  resultName: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  resultMeta: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  resultSiret: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  closed: {
    fontFamily: font.bold,
    fontSize: 12,
    color: colors.danger,
    backgroundColor: colors["danger-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.chip,
    overflow: "hidden",
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  taken: { gap: spacing(2) },
  cardTitle: { flex: 1, gap: 2 },
  cardName: { fontFamily: font.bold, fontSize: 18, color: colors.foreground },
  active: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    alignSelf: "flex-start",
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["success-soft"],
  },
  activeText: { fontFamily: font.bold, fontSize: 12, color: colors.success },
  detail: { flexDirection: "row", gap: spacing(3) },
  detailLabel: {
    width: 76,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  detailValue: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
});
