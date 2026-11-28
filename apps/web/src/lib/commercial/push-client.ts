"use client";

import { vapidKeyBytes } from "@menao/core";
import { createClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/project/client";

/**
 * Notifications sur le téléphone (web push, ADR 0396), côté navigateur : service worker de
 * l'espace des conseillers, abonnement avec la clé publique VAPID (fonction web-push-key) et
 * enregistrement de l'abonnement en base. Rien n'est demandé sans un toucher du conseiller.
 */
const SW_URL = "/commercial-sw.js";
const SCOPE = "/commercial";

export type PushSupport = "ok" | "unsupported" | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "ok";
}

async function registration() {
  return navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
}

/** Abonnement actuel de ce navigateur, s'il existe. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() === "unsupported") return null;
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Demande l'autorisation, s'abonne et enregistre l'abonnement ; « ok », « denied » ou « error ». */
export async function enablePush(): Promise<"ok" | "denied" | "unsupported" | "error"> {
  if (pushSupport() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const supabase = createClient();
  const result = await invokeFunction<{ status: string; key?: string }>(
    supabase,
    "web-push-key",
    {},
  );
  if (result.status !== "ok" || !("key" in result) || !result.key) return "error";
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes(result.key) as BufferSource,
      }));
    const json = sub.toJSON();
    const { error } = await supabase.rpc("register_web_push", {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh ?? "",
      p_auth: json.keys?.auth ?? "",
    });
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}

/** Désabonne ce navigateur et l'oublie en base. */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await createClient().rpc("unregister_web_push", { p_endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => false);
}
