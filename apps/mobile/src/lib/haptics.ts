import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Vibrations légères (retour au toucher, lot 1 de la refonte de l'espace artisan), comme les
 * applications natives d'iOS : sélection d'un choix, onglet, succès d'un enregistrement, erreur.
 * Sans effet sur la version web de développement ; une erreur du moteur est sans conséquence.
 */
function safely(run: () => Promise<void>) {
  if (Platform.OS === "web") return;
  run().catch(() => undefined);
}

export const haptic = {
  /** Choix coché, onglet, interrupteur. */
  select: () => safely(() => Haptics.selectionAsync()),
  /** Bouton d'action principal, ouverture du menu (+). */
  tap: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
