import { describe, expect, it } from "vitest";
import {
  accountantPeriodRange,
  accountantRangeLabel,
  accountantSendDue,
  nextAccountantSend,
  nextAccountantSendLabel,
} from "../src/accountant";

describe("période envoyée au comptable", () => {
  it("mensuel : le mois précédent, jusqu'à son dernier jour", () => {
    expect(accountantPeriodRange("mensuel", "2026-10-25")).toEqual({
      start: "2026-09-01",
      end: "2026-09-30",
      label: "septembre 2026",
      key: "2026-09",
    });
    expect(accountantPeriodRange("mensuel", "2028-03-01")).toMatchObject({
      start: "2028-02-01",
      end: "2028-02-29",
      label: "février 2028",
    });
  });

  it("mensuel en janvier : décembre de l'année précédente", () => {
    expect(accountantPeriodRange("mensuel", "2027-01-03")).toEqual({
      start: "2026-12-01",
      end: "2026-12-31",
      label: "décembre 2026",
      key: "2026-12",
    });
  });

  it("trimestriel : le trimestre précédent, 1er trimestre de l'année d'avant en janvier", () => {
    expect(accountantPeriodRange("trimestriel", "2026-10-02")).toEqual({
      start: "2026-07-01",
      end: "2026-09-30",
      label: "3e trimestre 2026",
      key: "2026-T3",
    });
    expect(accountantPeriodRange("trimestriel", "2026-05-20")).toMatchObject({
      start: "2026-01-01",
      end: "2026-03-31",
      label: "1er trimestre 2026",
    });
    expect(accountantPeriodRange("trimestriel", "2027-01-05")).toMatchObject({
      start: "2026-10-01",
      end: "2026-12-31",
      label: "4e trimestre 2026",
      key: "2026-T4",
    });
  });
});

describe("envoi automatique", () => {
  it("les 7 premiers jours du mois, ou du trimestre", () => {
    expect(accountantSendDue("mensuel", "2026-11-01")).toBe(true);
    expect(accountantSendDue("mensuel", "2026-11-07")).toBe(true);
    expect(accountantSendDue("mensuel", "2026-11-08")).toBe(false);
    expect(accountantSendDue("trimestriel", "2026-10-03")).toBe(true);
    expect(accountantSendDue("trimestriel", "2026-11-03")).toBe(false);
    expect(accountantSendDue("trimestriel", "2027-01-01")).toBe(true);
  });

  it("prochain envoi : le 1er du mois ou du trimestre suivant", () => {
    expect(nextAccountantSend("mensuel", "2026-10-25")).toBe("2026-11-01");
    expect(nextAccountantSend("mensuel", "2026-12-25")).toBe("2027-01-01");
    expect(nextAccountantSend("trimestriel", "2026-10-25")).toBe("2027-01-01");
    expect(nextAccountantSend("trimestriel", "2026-05-02")).toBe("2026-07-01");
    expect(nextAccountantSend("trimestriel", "2026-01-01")).toBe("2026-04-01");
    expect(nextAccountantSendLabel("mensuel", "2026-10-25")).toBe("1er novembre 2026");
  });
});

describe("libellé d'une période de l'historique", () => {
  it("mois, trimestre, sinon les dates", () => {
    expect(accountantRangeLabel("2026-09-01", "2026-09-30")).toBe("septembre 2026");
    expect(accountantRangeLabel("2026-07-01", "2026-09-30")).toBe("3e trimestre 2026");
    expect(accountantRangeLabel("2026-01-01", "2026-03-31")).toBe("1er trimestre 2026");
    expect(accountantRangeLabel("2026-08-01", "2026-10-31")).toBe("2026-08-01 – 2026-10-31");
  });
});
