"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Alert, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { uploadTicketPhoto } from "@/lib/disputes/photos";
import { PHOTO_ACCEPT } from "@/lib/project/photos";

const t = fr.dispute;

/** « Ajouter une photo » au signalement (F-42) : vérifiée et rangée par process-upload. */
export function TicketPhotoUpload({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function send(file: File) {
    setBusy(true);
    setNotice(null);
    const status = await uploadTicketPhoto(ticketId, file);
    setBusy(false);
    if (status === "ok") {
      setNotice({ tone: "success", text: t.photoAdded });
      router.refresh();
    } else {
      setNotice({
        tone: "error",
        text: t.photoErrors[status as keyof typeof t.photoErrors] ?? t.photoErrors.failed,
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`${buttonClasses({ variant: "outline", block: false })} cursor-pointer self-start has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20`}
      >
        {t.addPhoto}
        <ImagePlus aria-hidden="true" className="size-4" />
        <input
          id={id}
          type="file"
          accept={PHOTO_ACCEPT}
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void send(file);
          }}
        />
      </label>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
    </div>
  );
}
