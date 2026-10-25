import { cookies } from "next/headers";
import type { ReactNode } from "react";
import type { ShellAccount } from "@/lib/client/shell";
import { AppFrame } from "./app-frame";
import { MENU_COOKIE, type Badges, type Space } from "./nav-config";
import type { Visibility } from "./sidebar";

/**
 * Coque des espaces connectés (ADR 0035) : lit le choix « menu replié » dans le cookie pour un
 * premier affichage sans saut, puis délègue l'affichage à AppFrame.
 */
export async function AppShell({
  space,
  account,
  badges = {},
  visibility = null,
  topBanner = null,
  children,
}: {
  space: Space;
  account: ShellAccount | null;
  badges?: Badges;
  visibility?: Visibility | null;
  /** Bandeau fin en haut de l'écran (données d'exemple, ADR 0184). */
  topBanner?: ReactNode;
  children: ReactNode;
}) {
  const collapsed = (await cookies()).get(MENU_COOKIE)?.value === "reduit";
  return (
    <AppFrame
      space={space}
      account={account}
      badges={badges}
      visibility={visibility}
      initialCollapsed={collapsed}
      topBanner={topBanner}
    >
      {children}
    </AppFrame>
  );
}
