"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/** Ouvre l'impression du navigateur. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" block={false} onClick={() => window.print()}>
      <Printer aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
