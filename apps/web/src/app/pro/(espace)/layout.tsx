import type { ReactNode } from "react";
import { ProHeader } from "@/components/pro/pro-header";
import { ProBottomNav } from "@/components/pro/pro-nav";
import { requireProSpace } from "@/lib/artisan/space";

/** Espace pro (F-16 à F-18) : en-tête dédié et barre de navigation mobile des maquettes. */
export default async function ProSpaceLayout({ children }: { children: ReactNode }) {
  const { firstName, avatarUrl } = await requireProSpace();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ProHeader firstName={firstName} avatarUrl={avatarUrl} />
      <div className="flex flex-1 flex-col">{children}</div>
      <ProBottomNav />
    </div>
  );
}
