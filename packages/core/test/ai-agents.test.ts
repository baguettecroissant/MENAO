import { describe, expect, it } from "vitest";
import { VOICE_ALERT_RATIO, parseAiAgents, voiceGauge } from "../src/ai-agents";

describe("agents IA des formules (ADR 0231)", () => {
  const premium = {
    formule: "premium",
    agents: {
      voix_minutes: 300,
      secretaire: true,
      devis_conversation: true,
      comptable_avance: true,
      rappels: "sms",
      lignes: 1,
      recharges: true,
    },
    mois: "2026-11-01",
    secondes_incluses: 18000,
    secondes_utilisees: 3600,
    secondes_recharge: 600,
    secondes_restantes: 15000,
    appels: [{ agent: "secretaire", secondes: 125, le: "2026-11-06T10:00:00+00:00" }],
  };

  it("lecture des droits : agents, minutes et derniers appels", () => {
    const state = parseAiAgents(premium);
    expect(state.plan).toBe("premium");
    expect(state.agents).toEqual({
      voiceMinutes: 300,
      secretary: true,
      conversationalQuote: true,
      advancedAccounting: true,
      reminders: "sms",
      lines: 1,
      topUps: true,
      // Appels d'offres : formule Entreprise seulement (ADR 0287).
      tenders: false,
    });
    expect(parseAiAgents({ agents: { appels_offres: true } }).agents.tenders).toBe(true);
    expect(state.calls).toEqual([
      { agent: "secretaire", seconds: 125, at: "2026-11-06T10:00:00+00:00" },
    ]);
  });

  it("sans formule ou réponse illisible : aucun agent vocal", () => {
    const state = parseAiAgents(null);
    expect(state.plan).toBeNull();
    expect(state.agents.secretary).toBe(false);
    expect(state.agents.voiceMinutes).toBe(0);
    expect(state.agents.reminders).toBe("non");
    expect(parseAiAgents({ agents: { rappels: "fax" } }).agents.reminders).toBe("non");
  });

  it("jauge : minutes entières, part utilisée, niveau d'alerte", () => {
    expect(voiceGauge(parseAiAgents(premium))).toEqual({
      usedMinutes: 60,
      includedMinutes: 300,
      topUpMinutes: 10,
      remainingMinutes: 250,
      ratio: 0.2,
      level: "ok",
    });
    const nearly = parseAiAgents({
      ...premium,
      secondes_utilisees: 14400,
      secondes_restantes: 4200,
    });
    expect(voiceGauge(nearly).level).toBe("alerte");
    expect(voiceGauge(nearly).ratio).toBe(VOICE_ALERT_RATIO);
    const empty = parseAiAgents({ ...premium, secondes_utilisees: 18100, secondes_restantes: 0 });
    expect(voiceGauge(empty)).toMatchObject({ level: "epuise", ratio: 1, remainingMinutes: 0 });
  });

  it("formule sans minutes : pas de jauge à remplir", () => {
    const base = parseAiAgents({ formule: "base", agents: { voix_minutes: 0 } });
    expect(voiceGauge(base)).toMatchObject({ includedMinutes: 0, ratio: 0, level: "sans_voix" });
  });
});
