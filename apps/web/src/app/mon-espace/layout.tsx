import type { ReactNode } from "react";
import { ClientShell } from "@/components/app-shell/client-shell";

/** Application client (ADR 0034) : chantiers, devis, messages, documents, sans le site vitrine. */
export default function ClientSpaceLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
