"use client";

import {
  type DocumentReadingWarning,
  type IdentityPiece,
  type IdentityReading,
  type IdentitySide,
  IDENTITY_PIECES,
  MAX_UPLOAD_BYTES,
  READABLE_IMAGE_MAX_BYTES,
  STRIPE_IDENTITY_MIME_TYPES,
  identityComplete,
  identitySides,
  mergeIdentityReadings,
} from "@menao/core";
import { ArrowRight, Camera, Check, CreditCard, FileUp, Info, Lock } from "lucide-react";
import type { ComponentProps } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { AiWorking } from "@/components/ai-working";
import { GuideBar } from "@/components/pro/guide-bar";
import { Alert, Button, ButtonLink, Field } from "@/components/ui";
import { CameraButton, type UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";
import { processUpload, readDocument } from "@/lib/artisan/actions";
import { rememberBirthDate } from "@/lib/artisan/birth-date-memo";
import type { FormState } from "@/lib/auth/form";
import { discardRaw, resizeImage, uploadRaw } from "@/lib/upload/client";

const t = fr.pro.onboarding.documents;
const i = t.identity;
const u = fr.pro.onboarding.upload;
const r = t.reading;
const ACCEPT = "application/pdf,image/jpeg,image/png";
/** Photo trop lourde pour être lue : réduite avant l'envoi, comme les autres documents (ADR 0176). */
const PHOTO_MAX_SIDE = 2400;
const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDate = (iso: string) => longDate.format(new Date(iso));

type SideState = {
  name: string;
  key: string;
  /** Image : la pièce pourra être transmise à Stripe (un PDF ne l'est pas). */
  image: boolean;
  /** Chemin du fichier brut dans « uploads », une fois déposé. */
  path: Promise<string | null>;
  status: "reading" | "done" | "failed";
  reading?: IdentityReading;
  warnings: DocumentReadingWarning[];
};
type Sides = Partial<Record<IdentitySide, SideState>>;

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

/**
 * Dépôt de la pièce d'identité du dirigeant (F-181, ADR 0378, maquette du lot 75) : l'artisan
 * choisit sa pièce, puis dépose ce qu'elle demande, recto et verso pour une carte d'identité ou un
 * titre de séjour, une page pour un passeport. Chaque côté est lu dès son dépôt ; le bouton ne
 * s'allume que lorsque tout est déposé.
 */
export function IdentityUpload({
  userId,
  label,
  guide,
}: {
  userId: string;
  /** Hors du parcours guidé : texte du bouton d'envoi. */
  label: string;
  /** Parcours guidé (ADR 0373) : barre du bas « Déposer et continuer ». */
  guide?: ComponentProps<typeof UploadForm>["guide"];
}) {
  const [piece, setPiece] = useState<IdentityPiece>("carte_identite");
  const [sides, setSides] = useState<Sides>({});
  // Dernier état connu, lu par les dépôts en cours (un fichier remplacé pendant sa lecture).
  const latest = useRef<Sides>({});
  const [share, setShare] = useState(true);
  const [dateFin, setDateFin] = useState("");
  const [dateTouched, setDateTouched] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  function update(next: Sides) {
    latest.current = next;
    setSides(next);
  }

  // Page quittée sans envoyer : les fichiers bruts sont retirés.
  useEffect(
    () => () => {
      for (const side of Object.values(latest.current))
        void side.path.then((path) => (path ? discardRaw(path) : undefined));
    },
    [],
  );

  const wanted = identitySides(piece);
  const merged = mergeIdentityReadings(wanted.map((side) => sides[side]?.reading));
  const complete = identityComplete(piece, {
    recto: Boolean(sides.recto),
    verso: Boolean(sides.verso),
  });
  const busy = wanted.some((side) => sides[side]?.status === "reading");
  const started = wanted.some((side) => sides[side]);
  // Date lue : proposée tant que l'artisan n'a pas saisi la sienne.
  const dateValue = dateTouched ? dateFin : (merged.dateFin ?? "");
  // La transmission à Stripe ne concerne qu'une pièce déposée en image.
  const shareable = wanted.every((side) => sides[side]?.image);

  function discard(side: SideState | undefined) {
    void side?.path.then((path) => (path ? discardRaw(path) : undefined));
  }

  function remove(side: IdentitySide) {
    discard(latest.current[side]);
    const next = { ...latest.current };
    delete next[side];
    update(next);
  }

  function choosePiece(next: IdentityPiece) {
    setPiece(next);
    // Passeport : une seule page, le verso déjà déposé n'a plus lieu d'être.
    if (!identitySides(next).includes("verso") && latest.current.verso) remove("verso");
  }

  async function pick(side: IdentitySide, file: File) {
    setPickError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setPickError(u.fileTooLarge);
    if (!ACCEPT.split(",").includes(file.type)) return setPickError(u.status.invalid_type);
    const key = fileKey(file);
    discard(latest.current[side]);
    const path = (async () => {
      let blob: Blob = file;
      if (file.type !== "application/pdf" && file.size > READABLE_IMAGE_MAX_BYTES)
        blob = await resizeImage(file, PHOTO_MAX_SIDE, { quality: 0.9 }).catch(() => file);
      return uploadRaw(userId, blob);
    })();
    const image = STRIPE_IDENTITY_MIME_TYPES.some((type) => type === file.type);
    const entry: SideState = { name: file.name, key, image, path, status: "reading", warnings: [] };
    update({ ...latest.current, [side]: entry });

    const stored = await path;
    const current = () => latest.current[side]?.key === key;
    if (!current()) return;
    if (!stored) {
      remove(side);
      return setPickError(u.uploadFailed);
    }
    const result = await readDocument(stored, "identite");
    if (!current()) return;
    if (result.status !== "ok")
      return update({ ...latest.current, [side]: { ...entry, status: "failed" } });
    // La date de naissance lue reste sur cet appareil, pour l'étape « Paiements » (ADR 0375).
    if (result.birthDate) rememberBirthDate(userId, result.birthDate);
    update({
      ...latest.current,
      [side]: {
        ...entry,
        status: "done",
        reading: { dateFin: result.fields.dateFin ?? null, birthDate: result.birthDate ?? null },
        // Le verso d'une carte ne ressemble pas toujours à une pièce d'identité : pas d'alerte.
        warnings: result.warnings.filter(
          (warning) => !(side === "verso" && warning === "autre_document"),
        ),
      },
    });
  }

  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const recto = latest.current.recto;
    if (!recto || !identityComplete(piece, { recto: true, verso: Boolean(latest.current.verso) }))
      return { fieldErrors: { file: [u.fileRequired] } };
    const path = await recto.path;
    const versoPath = wanted.includes("verso") ? await latest.current.verso?.path : null;
    if (!path || (wanted.includes("verso") && !versoPath)) return { error: u.uploadFailed };

    const data = new FormData();
    data.set("purpose", "document");
    data.set("documentType", "identite");
    data.set("path", path);
    if (versoPath) data.set("versoPath", versoPath);
    data.set("piece", piece);
    data.set("dateFin", String(formData.get("dateFin") ?? ""));
    // Le choix de l'artisan seulement : une pièce en PDF n'est de toute façon pas transmise.
    if (!share) data.set("partageStripe", "non");
    const suite = formData.get("suite");
    if (typeof suite === "string") data.set("suite", suite);
    const result = await processUpload(prev, data);
    // Champs refusés avant l'enregistrement (date dépassée) : les fichiers restent déposés, à
    // renvoyer une fois la date corrigée. Sinon le serveur a retiré les fichiers bruts.
    if (!result.fieldErrors) {
      latest.current = {};
      setSides({});
      setDateTouched(false);
      setDateFin("");
    }
    return result;
  }, {});

  const errors = state.fieldErrors ?? {};
  const sideText = (side: IdentitySide) =>
    piece === "passeport" ? i.sides.page : side === "recto" ? i.sides.recto : i.sides.verso;
  const firstMissing = wanted.find((side) => !sides[side]);
  const readRows = (
    reading: IdentityReading | { dateFin: string | null; birthDate: string | null },
  ) =>
    [
      reading.birthDate ? ([i.birthDate, formatDate(reading.birthDate)] as const) : null,
      reading.dateFin ? ([i.expiry, formatDate(reading.dateFin)] as const) : null,
    ].filter((row) => row !== null);

  const readBox = (title: string, rows: (readonly [string, string])[]) =>
    rows.length === 0 ? null : (
      <div className="flex flex-col gap-2 rounded-input border border-success/25 bg-success-soft px-3.5 py-3 text-sm">
        <p className="font-medium text-success">{title}</p>
        <ul className="flex flex-col gap-1.5">
          {rows.map(([name, value]) => (
            <li key={name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-label">{name}</span>
              <span className="flex items-center gap-2">
                <b>{value}</b>
                <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-semibold text-success">
                  {r.read}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <fieldset className="flex flex-col gap-3">
        <legend className={started ? "sr-only" : "mb-3 text-[0.9375rem] text-label"}>
          {i.question}
        </legend>
        <div className="grid grid-cols-3 gap-1.5">
          {IDENTITY_PIECES.map((value) => (
            <label key={value} className="relative">
              <input
                type="radio"
                name="pieceChoisie"
                value={value}
                checked={piece === value}
                onChange={() => choosePiece(value)}
                className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
              />
              <span className="flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-1.5 text-center text-[0.8125rem] leading-tight font-bold text-label peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-surface peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
                {i.pieces[value]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {wanted.map((side) => {
        const text = sideText(side);
        const entry = sides[side];
        if (!entry) {
          const now = side === firstMissing;
          return (
            <section
              key={side}
              aria-label={text.title}
              // Sur ordinateur, le fichier peut aussi être glissé sur le côté voulu.
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) void pick(side, file);
              }}
              className={`flex flex-col gap-2.5 rounded-card border-[1.5px] border-dashed p-3.5 ${
                now ? "border-primary bg-primary-softer" : "border-border-strong bg-surface"
              }`}
            >
              <div className="flex flex-col">
                <p className="font-semibold">{text.title}</p>
                <p className="text-sm text-muted-foreground">{text.hint}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CameraButton
                  id={`identite-${side}-camera`}
                  inputRef={{ current: null }}
                  label={i.photo}
                  ariaLabel={i.photoLabel(text.title)}
                  icon={<Camera aria-hidden="true" className="size-5" />}
                  accept="image/*"
                  capture
                  primary
                  onPick={(file) => void pick(side, file)}
                />
                <CameraButton
                  id={`identite-${side}-file`}
                  inputRef={{ current: null }}
                  label={i.file}
                  ariaLabel={i.fileLabel(text.title)}
                  icon={<FileUp aria-hidden="true" className="size-5" />}
                  accept={ACCEPT}
                  onPick={(file) => void pick(side, file)}
                />
              </div>
            </section>
          );
        }
        return (
          <div key={side} className="flex flex-col gap-2">
            <section
              aria-label={text.title}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-success text-white">
                <Check aria-hidden="true" className="size-[1.125rem]" strokeWidth={3} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{text.deposited}</span>
                <span className="truncate text-sm text-muted-foreground">{entry.name}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(side)}
                aria-label={i.changeLabel(text.title)}
                className="min-h-touch shrink-0 text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                {i.change}
              </button>
            </section>
            <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
              {entry.status === "reading" && <AiWorking label={r.reading} />}
              {entry.warnings.map((warning) => (
                <Alert key={warning} tone="error">
                  {warning === "autre_document"
                    ? r.otherDocument(t.types.identite)
                    : r.warnings[warning]}
                </Alert>
              ))}
              {/* Pièce incomplète : ce qui vient d'être lu sur ce côté. Complète : un seul encadré. */}
              {!complete && entry.reading && readBox(text.readOn, readRows(entry.reading))}
            </div>
          </div>
        );
      })}
      {pickError && (
        <p className="text-sm text-danger" role="alert">
          {pickError}
        </p>
      )}
      {errors.file && (
        <p className="text-sm text-danger" role="alert">
          {errors.file[0]}
        </p>
      )}

      {started && !complete && sides.recto && wanted.includes("verso") && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {i.versoLeft}
        </p>
      )}
      {complete && !busy && readBox(i.readAll, readRows(merged))}
      {started && (
        <Field
          id="identite-dateFin"
          label={t.dateFinIdentite}
          name="dateFin"
          type="date"
          value={dateValue}
          onChange={(event) => {
            setDateTouched(true);
            setDateFin(event.currentTarget.value);
          }}
          errors={errors.dateFin}
        />
      )}
      {complete && shareable && (
        <div className="flex items-start gap-3 rounded-card border border-border bg-surface p-3.5">
          <CreditCard aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-[0.9375rem] font-semibold">
              {share ? i.share.title : i.share.declinedTitle}
            </p>
            <p className="text-label">
              {share ? i.share.text : i.share.declinedText}{" "}
              <button
                type="button"
                onClick={() => setShare(!share)}
                className="font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                {share ? i.share.decline : i.share.accept}
              </button>
            </p>
          </div>
        </div>
      )}
      {!started && (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Camera aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {i.photoHint}
          </p>
          <p className="flex items-start gap-2">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {i.privacy}
          </p>
        </div>
      )}

      {guide ? (
        <>
          <input type="hidden" name="suite" value={guide.step} />
          <GuideBar
            backHref={guide.backHref}
            note={started ? guide.nextNote : (guide.skipNote ?? guide.nextNote)}
          >
            {started ? (
              <Button type="submit" size="lg" disabled={pending || busy || !complete}>
                {pending ? u.sending : fr.pro.onboarding.guide.depositAndContinue}
                <ArrowRight aria-hidden="true" className="size-5" />
              </Button>
            ) : (
              <ButtonLink href={guide.skipHref} variant="outline" size="lg" block>
                {guide.skipLabel}
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
            )}
          </GuideBar>
        </>
      ) : (
        started && (
          <Button
            type="submit"
            disabled={pending || busy || !complete}
            className="sm:w-auto sm:self-start sm:px-6"
          >
            {pending ? u.sending : label}
          </Button>
        )
      )}
    </form>
  );
}
