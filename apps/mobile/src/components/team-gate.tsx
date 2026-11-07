import { teamCan, type TeamPermission } from "@menao/core";
import { Redirect } from "expo-router";
import type { ComponentType } from "react";
import { useTeamPosition } from "@/lib/team";

/**
 * Écran réservé aux places qui ont ce droit (ADR 0241) : les autres reviennent à l'accueil. La base
 * refuse de toute façon leurs données ; l'écran s'affiche pendant la lecture de la place.
 */
export function withTeamPermission<P extends object>(
  permission: TeamPermission,
  Screen: ComponentType<P>,
): ComponentType<P> {
  function TeamGatedScreen(props: P) {
    const position = useTeamPosition();
    if (position !== undefined && position !== null && !teamCan(position, permission)) {
      return <Redirect href="/pro" />;
    }
    return <Screen {...props} />;
  }
  TeamGatedScreen.displayName = `TeamGated(${Screen.displayName ?? Screen.name ?? "Screen"})`;
  return TeamGatedScreen;
}
