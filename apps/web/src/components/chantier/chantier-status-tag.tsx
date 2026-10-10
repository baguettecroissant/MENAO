import { StatusBadge, Tag } from "@/components/ui";
import type { ChantierTagData } from "@/lib/chantier/view";

const chip = {
  primary: "bg-primary-soft text-primary-strong",
  success: "bg-success-soft text-success",
  neutral: "bg-background text-muted-foreground",
  danger: "bg-danger-soft text-danger",
} as const;

/** Pastille d'état du chantier : puce colorée, ou pastille à point pour un état en cours. */
export function ChantierStatusTag({ tag }: { tag: ChantierTagData }) {
  if (tag.dot) return <StatusBadge tone={tag.tone}>{tag.text}</StatusBadge>;
  if (tag.tone === "primary") return <Tag>{tag.text}</Tag>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-xs font-medium ${chip[tag.tone]}`}
    >
      {tag.text}
    </span>
  );
}
