"use client";

import { CalendarPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.chantier.next;

/** « Ajouter à mon agenda » (F-12) : Google Agenda, Outlook ou fichier .ics (Calendrier d'Apple). */
export function AddToCalendar({
  google,
  outlook,
  ics,
}: {
  google: string;
  outlook: string;
  ics: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const option = buttonClasses({ variant: "secondary" });
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonClasses({ variant: "outline" })} whitespace-nowrap`}
      >
        {t.addToCalendar}
        <CalendarPlus aria-hidden="true" className="size-4" />
      </button>
      <Drawer open={open} onClose={close} title={t.addToCalendar} backLabel={t.close}>
        <ul className="flex flex-col gap-2">
          <li>
            <a href={google} target="_blank" rel="noopener noreferrer" className={option}>
              {t.google}
              <span className="sr-only"> {t.newTab}</span>
            </a>
          </li>
          <li>
            <a href={outlook} target="_blank" rel="noopener noreferrer" className={option}>
              {t.outlook}
              <span className="sr-only"> {t.newTab}</span>
            </a>
          </li>
          <li>
            <a href={ics} className={option}>
              {t.apple}
            </a>
          </li>
        </ul>
      </Drawer>
    </>
  );
}
