/**
 * Agents IA des formules (F-82, ADR 0231) : droits de l'artisan selon sa formule et minutes de voix
 * du mois, tels que les renvoie la base (`my_ai_agents`, `voice_artisan_agents`). Lecture défensive
 * (une valeur absente ou inattendue vaut « pas inclus »), et jauge des minutes.
 */

/**
 * Coût estimé d'une minute de voix pour MENAO, en centimes d'euro : 0,08 € en appel web, 0,09 à
 * 0,15 € au téléphone (rapport « Agents IA de MENAO : coûts et formules », 5 novembre 2026).
 */
export const VOICE_COST_CENTS_PER_MINUTE = 9;

/** Alerte à 80 % des minutes incluses (mêmes valeurs que `voice_record_usage`). */
export const VOICE_ALERT_RATIO = 0.8;

export const AI_REMINDER_MODES = ["non", "sms", "appel"] as const;
export type AiReminderMode = (typeof AI_REMINDER_MODES)[number];

export type AiAgentsRights = {
  voiceMinutes: number;
  secretary: boolean;
  conversationalQuote: boolean;
  advancedAccounting: boolean;
  reminders: AiReminderMode;
  lines: number;
  topUps: boolean;
};

export type AiAgentsCall = { agent: string; seconds: number; at: string };

export type AiAgentsState = {
  plan: string | null;
  agents: AiAgentsRights;
  month: string | null;
  includedSeconds: number;
  usedSeconds: number;
  topUpSeconds: number;
  remainingSeconds: number;
  calls: AiAgentsCall[];
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const int = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
const bool = (value: unknown) => value === true;

export function parseAiAgents(raw: unknown): AiAgentsState {
  const r = record(raw);
  const a = record(r.agents);
  const reminders = AI_REMINDER_MODES.find((mode) => mode === a.rappels) ?? "non";
  const calls = Array.isArray(r.appels)
    ? r.appels.flatMap((item) => {
        const c = record(item);
        return typeof c.agent === "string" && typeof c.le === "string"
          ? [{ agent: c.agent, seconds: int(c.secondes), at: c.le }]
          : [];
      })
    : [];
  return {
    plan: typeof r.formule === "string" ? r.formule : null,
    agents: {
      voiceMinutes: int(a.voix_minutes),
      secretary: bool(a.secretaire),
      conversationalQuote: bool(a.devis_conversation),
      advancedAccounting: bool(a.comptable_avance),
      reminders,
      lines: int(a.lignes),
      topUps: bool(a.recharges),
    },
    month: typeof r.mois === "string" ? r.mois : null,
    includedSeconds: int(r.secondes_incluses),
    usedSeconds: int(r.secondes_utilisees),
    topUpSeconds: int(r.secondes_recharge),
    remainingSeconds: int(r.secondes_restantes),
    calls,
  };
}

export type VoiceGauge = {
  usedMinutes: number;
  includedMinutes: number;
  topUpMinutes: number;
  remainingMinutes: number;
  /** Part des minutes incluses utilisée, de 0 à 1. */
  ratio: number;
  level: "sans_voix" | "ok" | "alerte" | "epuise";
};

export function voiceGauge(state: AiAgentsState): VoiceGauge {
  const includedMinutes = Math.floor(state.includedSeconds / 60);
  const gauge = {
    usedMinutes: Math.ceil(state.usedSeconds / 60),
    includedMinutes,
    topUpMinutes: Math.floor(state.topUpSeconds / 60),
    remainingMinutes: Math.floor(state.remainingSeconds / 60),
  };
  if (state.includedSeconds === 0 && state.topUpSeconds === 0) {
    return { ...gauge, ratio: 0, level: "sans_voix" };
  }
  const ratio =
    state.includedSeconds === 0 ? 1 : Math.min(state.usedSeconds / state.includedSeconds, 1);
  const level =
    state.remainingSeconds <= 0 ? "epuise" : ratio >= VOICE_ALERT_RATIO ? "alerte" : "ok";
  return { ...gauge, ratio: Math.round(ratio * 100) / 100, level };
}
