import { fr } from "@/i18n/fr";
import { formatDayTime } from "@/lib/format";

export type TicketEntry = {
  id: string;
  fromStaff: boolean;
  body: string | null;
  /** URL signée de la photo jointe. */
  photoUrl: string | null;
  createdAt: string;
};

/** Échanges d'un ticket (F-42) : messages du déclarant et de l'équipe MENAO, photos jointes. */
export function TicketThread({
  entries,
  labels,
  emptyText,
  mine = "reporter",
}: {
  entries: TicketEntry[];
  labels: { staff: string; reporter: string };
  emptyText: string;
  /** Qui lit le fil : le déclarant (par défaut) ou l'équipe MENAO (back-office). */
  mine?: "reporter" | "staff";
}) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  let photo = 0;
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`flex flex-col gap-1 rounded-card p-3 ${
            entry.fromStaff ? "bg-primary-softer" : "border border-border bg-surface"
          } ${
            // Refonte « Nette » (ADR 0258) : mes messages en bulles bleu nuit à droite.
            entry.fromStaff === (mine === "staff")
              ? "in-[.app-nette]:max-w-[85%] in-[.app-nette]:self-end in-[.app-nette]:rounded-[1.125rem] in-[.app-nette]:rounded-br-md in-[.app-nette]:border-0 in-[.app-nette]:bg-foreground in-[.app-nette]:px-4 in-[.app-nette]:text-white"
              : "in-[.app-nette]:max-w-[85%] in-[.app-nette]:self-start in-[.app-nette]:rounded-[1.125rem] in-[.app-nette]:rounded-bl-md in-[.app-nette]:border in-[.app-nette]:border-border in-[.app-nette]:bg-surface in-[.app-nette]:px-4"
          }`}
        >
          <p
            className={`text-xs text-muted-foreground ${
              entry.fromStaff === (mine === "staff") ? "in-[.app-nette]:text-white/75" : ""
            }`}
          >
            <span
              className={`font-medium text-foreground ${
                entry.fromStaff === (mine === "staff") ? "in-[.app-nette]:text-white" : ""
              }`}
            >
              {entry.fromStaff ? labels.staff : labels.reporter}
            </span>{" "}
            · {formatDayTime(entry.createdAt)}
          </p>
          {entry.photoUrl ? (
            <a
              href={entry.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4) */}
              <img
                src={entry.photoUrl}
                alt={fr.dispute.photoAlt(++photo)}
                className="max-h-48 rounded-input object-cover"
              />
            </a>
          ) : (
            <p className="text-sm whitespace-pre-line">{entry.body}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
