import { describe, expect, it } from "vitest";
import { clientHomeFigures, type ClientHomeFigureRow } from "../src";

const NOW = new Date("2026-11-08T10:00:00Z");

/** Ligne de `particulier_chantiers` réduite aux champs lus, sans rendez-vous ni paiement. */
const row = (patch: Partial<ClientHomeFigureRow>): ClientHomeFigureRow => ({
  status: "en_cours",
  quote_status: "signe",
  appointment_at: null,
  start_at: null,
  artisan_name: "Plomberie Exemple",
  deposit_cents: null,
  deposit_status: null,
  balance_cents: null,
  balance_status: null,
  ...patch,
});

describe("clientHomeFigures (accueil du particulier, lot 6)", () => {
  it("sans chantier : tout à zéro, pas de prochain rendez-vous", () => {
    expect(clientHomeFigures([], NOW)).toEqual({ active: 0, toSign: 0, next: null, paidCents: 0 });
  });

  it("compte les chantiers non terminés (clôturés, annulés et refusés exclus)", () => {
    const rows = [
      row({ status: "demande_envoyee" }),
      row({ status: "rdv_planifie" }),
      row({ status: "devis_envoye", quote_status: "envoye" }),
      row({ status: "en_cours" }),
      row({ status: "reserves_a_lever" }),
      row({ status: "en_litige" }),
      row({ status: "cloture" }),
      row({ status: "annule" }),
      row({ status: "devis_refuse", quote_status: "refuse" }),
    ];
    expect(clientHomeFigures(rows, NOW).active).toBe(6);
  });

  it("devis à signer : devis envoyé au statut « envoye » seulement", () => {
    const rows = [
      row({ status: "devis_envoye", quote_status: "envoye" }),
      row({ status: "devis_envoye", quote_status: "envoye" }),
      // Révision demandée, ou état incohérent : rien à signer.
      row({ status: "devis_en_revision", quote_status: "envoye" }),
      row({ status: "devis_envoye", quote_status: "signe" }),
      row({ status: "devis_envoye", quote_status: null }),
    ];
    expect(clientHomeFigures(rows, NOW).toSign).toBe(2);
  });

  it("prochain rendez-vous : la visite ou le démarrage à venir le plus proche, avec l'artisan", () => {
    const rows = [
      row({ status: "planifie", start_at: "2026-11-16T07:00:00Z", artisan_name: "Atelier B" }),
      row({
        status: "rdv_planifie",
        appointment_at: "2026-11-10T08:00:00Z",
        artisan_name: "Atelier Durand",
      }),
      // Passés : ignorés.
      row({ status: "devis_envoye", appointment_at: "2026-11-07T08:00:00Z" }),
      row({ status: "en_cours", start_at: "2026-11-02T07:00:00Z" }),
    ];
    expect(clientHomeFigures(rows, NOW).next).toEqual({
      kind: "visite",
      at: "2026-11-10T08:00:00Z",
      artisan: "Atelier Durand",
    });
  });

  it("prochain rendez-vous : un démarrage peut précéder une visite", () => {
    const rows = [
      row({ status: "rdv_planifie", appointment_at: "2026-11-20T08:00:00Z" }),
      row({ status: "planifie", start_at: "2026-11-09T07:00:00Z", artisan_name: "Atelier B" }),
    ];
    expect(clientHomeFigures(rows, NOW).next).toEqual({
      kind: "demarrage",
      at: "2026-11-09T07:00:00Z",
      artisan: "Atelier B",
    });
  });

  it("prochain rendez-vous : ignore les chantiers terminés, annulés ou au devis refusé", () => {
    const rows = [
      row({ status: "annule", appointment_at: "2026-11-09T08:00:00Z" }),
      row({ status: "devis_refuse", appointment_at: "2026-11-09T09:00:00Z" }),
      row({ status: "cloture", start_at: "2026-11-09T10:00:00Z" }),
    ];
    expect(clientHomeFigures(rows, NOW).next).toBeNull();
  });

  it("un rendez-vous à l'instant même compte encore comme à venir", () => {
    const rows = [row({ status: "rdv_planifie", appointment_at: NOW.toISOString() })];
    expect(clientHomeFigures(rows, NOW).next?.at).toBe(NOW.toISOString());
  });

  it("déjà payé : acomptes et soldes au statut « paye », en centimes entiers", () => {
    const rows = [
      // Acompte payé, solde pas encore dû.
      row({
        deposit_cents: 237_600,
        deposit_status: "paye",
        balance_cents: 554_400,
        balance_status: null,
      }),
      // Chantier clôturé : acompte et solde payés (les terminés comptent aussi).
      row({
        status: "cloture",
        deposit_cents: 30_000,
        deposit_status: "paye",
        balance_cents: 70_001,
        balance_status: "paye",
      }),
      // En cours de confirmation, échoué, en attente ou annulé : pas encore payé.
      row({ deposit_cents: 10_000, deposit_status: "en_cours" }),
      row({ deposit_cents: 10_000, deposit_status: "echoue" }),
      row({ deposit_cents: 10_000, deposit_status: "en_attente" }),
      row({ balance_cents: 10_000, balance_status: "annule" }),
      // Statut payé sans montant : rien à ajouter.
      row({ deposit_cents: null, deposit_status: "paye" }),
    ];
    const { paidCents } = clientHomeFigures(rows, NOW);
    expect(paidCents).toBe(237_600 + 30_000 + 70_001);
    expect(Number.isInteger(paidCents)).toBe(true);
  });

  it("l'instant par défaut est maintenant", () => {
    const soon = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      clientHomeFigures([row({ status: "rdv_planifie", appointment_at: soon })]).next?.at,
    ).toBe(soon);
  });
});
