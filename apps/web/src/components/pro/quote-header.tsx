import { CalendarDays, Clock } from "lucide-react";
import { DetailHeader } from "@/components/pro/detail";
import { formatDayLong, formatTime } from "@/lib/format";

/** En-tête des écrans du devis (maquettes « Envoyer un devis ») : chantier et rendez-vous. */
export function QuoteHeader({
  backHref,
  backLabel,
  title,
  chantierTitle,
  appointmentAt,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  chantierTitle: string;
  /** Rendez-vous planifié, s'il y en a un. */
  appointmentAt: string | null;
}) {
  return (
    <DetailHeader backHref={backHref} backLabel={backLabel} title={title}>
      <p className="text-sm text-white/90">{chantierTitle}</p>
      {appointmentAt && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4" />
            {formatDayLong(appointmentAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {formatTime(appointmentAt)}
          </span>
        </div>
      )}
    </DetailHeader>
  );
}
