import { describe, expect, it } from "vitest";
import { accountExport, type ExportClient } from "../src/account-export.ts";

type Call = {
  table: string;
  filter?: [string, string];
  orders: string[];
  range?: [number, number];
};

/** Client Supabase factice : lignes par table, erreur éventuelle, appels enregistrés. */
function fakeClient(
  tables: Record<string, unknown[]>,
  singles: Record<string, unknown> = {},
  failing?: string,
) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          const call: Call = { table, orders: [] };
          calls.push(call);
          const query = {
            eq(column: string, value: string) {
              call.filter = [column, value];
              return query;
            },
            order(column: string) {
              call.orders.push(column);
              return query;
            },
            range(from: number, to: number) {
              call.range = [from, to];
              return query;
            },
            maybeSingle: () => Promise.resolve({ data: singles[table] ?? null }),
            then<A, B>(
              resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => A,
              reject?: (reason: unknown) => B,
            ) {
              const rows = tables[table] ?? [];
              const [from, to] = call.range ?? [0, rows.length - 1];
              const result =
                table === failing
                  ? { data: null, error: { message: "indisponible" } }
                  : { data: rows.slice(from, to + 1), error: null };
              return Promise.resolve(result).then(resolve, reject);
            },
          };
          return query;
        },
      };
    },
  };
  return { client: client as unknown as ExportClient, calls };
}

const NOW = new Date("2026-10-14T08:00:00Z");
const account = (role: "particulier" | "artisan") => ({
  id: "u1",
  email: "client@example.test",
  createdAt: "2026-01-02T10:00:00Z",
  lastSignInAt: "2026-10-13T18:00:00Z",
  role,
});

describe("export des données personnelles (RGPD, ADR 0039 et 0083)", () => {
  it("particulier : compte, projets, demandes, chantiers, devis, paiements, avis donnés", async () => {
    const { client, calls } = fakeClient(
      { projects: [{ id: "p1" }], reviews: [{ id: "r1" }], tickets: [{ id: "t1" }] },
      { profiles: { first_name: "Camille" } },
    );
    const data = await accountExport(client, account("particulier"), NOW);
    expect(Object.keys(data)).toEqual([
      "format",
      "genere_le",
      "compte",
      "notifications",
      "echanges_avec_menao",
      "projets",
      "demandes",
      "chantiers",
      "devis",
      "paiements",
      "factures",
      "proces_verbaux_de_reception",
      "avis_donnes",
    ]);
    expect(data.genere_le).toBe("2026-10-14T08:00:00.000Z");
    expect(data.compte).toEqual({
      email: "client@example.test",
      cree_le: "2026-01-02T10:00:00Z",
      derniere_connexion: "2026-10-13T18:00:00Z",
      role: "particulier",
      profil: { first_name: "Camille" },
      acceptations_des_documents_legaux: [],
    });
    expect(data.projets).toEqual({ projets: [{ id: "p1" }], photos: [] });
    expect(data.avis_donnes).toEqual([{ id: "r1" }]);
    expect(data.echanges_avec_menao).toEqual({ demandes: [{ id: "t1" }], messages: [] });

    const filterOf = (table: string) => calls.find((c) => c.table === table)?.filter;
    expect(filterOf("profiles")).toEqual(["user_id", "u1"]);
    expect(filterOf("projects")).toEqual(["user_id", "u1"]);
    expect(filterOf("requests")).toEqual(["particulier_id", "u1"]);
    expect(filterOf("chantiers")).toEqual(["particulier_id", "u1"]);
    expect(filterOf("reviews")).toEqual(["particulier_id", "u1"]);
    // Tables limitées par les droits de la base, sans filtre : messages, paiements, factures…
    expect(filterOf("messages")).toBeUndefined();
    expect(calls.some((c) => c.table === "artisans")).toBe(false);
    for (const call of calls.filter((c) => c.table !== "profiles")) {
      expect(call.orders).toEqual(["created_at", "id"]);
    }
  });

  it("lit chaque table par pages de 1 000 lignes", async () => {
    const notifications = Array.from({ length: 1005 }, (_, i) => ({ id: i }));
    const { client, calls } = fakeClient({ notifications });
    const data = await accountExport(client, account("particulier"), NOW);
    expect(data.notifications).toHaveLength(1005);
    expect(calls.filter((c) => c.table === "notifications").map((c) => c.range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("artisan : fiche de l'entreprise, demandes reçues, devis et lignes, avis reçus", async () => {
    const { client, calls } = fakeClient(
      { quote_lines: [{ id: "l1" }], reviews: [{ id: "r2" }] },
      { artisans: { id: "a1", raison_sociale: "Entreprise Test" } },
    );
    const data = await accountExport(client, account("artisan"), NOW);
    expect(data.entreprise).toMatchObject({
      fiche: { id: "a1", raison_sociale: "Entreprise Test" },
      metiers: [],
      abonnement: [],
    });
    expect(data.devis).toEqual({ devis: [], lignes: [{ id: "l1" }] });
    expect(data.avis_recus).toEqual([{ id: "r2" }]);
    const filterOf = (table: string) => calls.find((c) => c.table === table)?.filter;
    expect(filterOf("artisans")).toEqual(["user_id", "u1"]);
    expect(filterOf("requests")).toEqual(["artisan_id", "a1"]);
    expect(filterOf("subscriptions")).toEqual(["artisan_id", "a1"]);
  });

  it("compte professionnel sans fiche d'entreprise : les données du compte seulement", async () => {
    const { client } = fakeClient({});
    const data = await accountExport(client, account("artisan"), NOW);
    expect(Object.keys(data)).toEqual([
      "format",
      "genere_le",
      "compte",
      "notifications",
      "echanges_avec_menao",
    ]);
  });

  it("échoue si une table ne peut pas être lue (pas d'export incomplet)", async () => {
    const { client } = fakeClient({}, {}, "payments");
    await expect(accountExport(client, account("particulier"), NOW)).rejects.toThrow(
      "indisponible",
    );
  });
});
