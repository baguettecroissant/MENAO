import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/** Notifications push sur iPhone et Android seulement (pas sur la version web de l'application). */
export const pushSupported = Platform.OS === "ios" || Platform.OS === "android";

export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

/** Jeton de l'appareil enregistré pour le compte connecté, désinscrit à la déconnexion. */
let registeredToken: string | null = null;

/** Conversation affichée à l'écran : ses nouveaux messages n'y sonnent pas (ADR 0201). */
let visibleConversation: string | null = null;

export function setVisibleConversation(id: string | null): void {
  visibleConversation = id;
}

/** Push d'un message de la conversation affichée (lien « …/messages/<chantier> »). */
export function isVisibleConversationLink(link: unknown): boolean {
  return (
    typeof link === "string" &&
    visibleConversation !== null &&
    link.endsWith(`/messages/${visibleConversation}`)
  );
}

/** Autorisation du téléphone pour les notifications. */
export async function pushPermission(): Promise<PushPermission> {
  if (!pushSupported) return "unsupported";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" || status === "denied" ? status : "undetermined";
  } catch {
    return "unsupported";
  }
}

/** Canal Android des notifications MENAO (requis avant la demande d'autorisation, Android 13+). */
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "MENAO",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Appareil enregistré pour le compte connecté (ADR 0079), à chaque ouverture de l'application,
 * si l'autorisation est déjà donnée : jeton Expo transmis à `register_push_token`. Sans effet sur
 * un simulateur, dans Expo Go sur Android ou si le service ne répond pas.
 */
export async function registerDevice(): Promise<void> {
  if (!pushSupported) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await ensureAndroidChannel();
    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_platform: Platform.OS === "ios" ? "ios" : "android",
    });
    if (!error) registeredToken = token;
  } catch {
    // Pas de notification push sur cet appareil : l'application fonctionne sans.
  }
}

/**
 * « Activer les notifications » : autorisation demandée au téléphone (une seule fois), puis
 * appareil enregistré.
 */
export async function enablePush(): Promise<PushPermission> {
  if (!pushSupported) return "unsupported";
  try {
    await ensureAndroidChannel();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return status === "denied" ? "denied" : "undetermined";
    await registerDevice();
    return "granted";
  } catch {
    return "unsupported";
  }
}

/** Avant la déconnexion : l'appareil ne reçoit plus les notifications de ce compte. */
export async function unregisterDevice(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  await supabase.rpc("unregister_push_token", { p_token: token });
}
