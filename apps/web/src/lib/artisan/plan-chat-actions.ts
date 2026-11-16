"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeamPermission } from "./space";
import type { PlanChatResult } from "./plan-chat";

export type PlanChatReply =
  | {
      status: "ok";
      kind: "answer" | "question";
      messageId: string;
      answer: string;
      result: PlanChatResult;
      used: number;
      limit: number;
    }
  | { status: "quota"; used?: number; limit?: number }
  | { status: "busy" | "timeout" | "unavailable" | "forbidden" | "invalid" | "error" };

const input = z.object({ tenderId: z.uuid(), question: z.string().trim().min(2).max(2000) });

/**
 * Une question posée à « Demander à MENAO » (F-160, ADR 0347) : la fonction serveur plan-chat
 * répond avec le jeton de l'utilisateur (formule, entreprise et quota vérifiés par la base) et
 * enregistre l'échange.
 */
export async function askPlanChat(tenderId: string, question: string): Promise<PlanChatReply> {
  const parsed = input.safeParse({ tenderId, question });
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireTeamPermission("money");
  const { data, error } = await supabase.functions.invoke<PlanChatReply>("plan-chat", {
    method: "POST",
    body: parsed.data,
  });
  let reply: PlanChatReply = data ?? { status: "error" };
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    const status = body?.status;
    reply =
      status === "quota" ||
      status === "busy" ||
      status === "timeout" ||
      status === "unavailable" ||
      status === "forbidden"
        ? { status }
        : { status: "error" };
  } else if (error) {
    reply = { status: "error" };
  }
  if (reply.status === "ok") {
    revalidatePath(`/pro/demandes/appels-offres/${parsed.data.tenderId}/demander`);
  }
  return reply;
}
