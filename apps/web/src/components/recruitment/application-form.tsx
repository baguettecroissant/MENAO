"use client";

import { CANDIDATE_CV_MAX_BYTES, recruitmentSourceFromParam } from "@menao/core";
import { commercialApplicationSteps, messages } from "@menao/validation";
import { ArrowLeft, ArrowRight, CircleCheck, FileText, Loader2, Send } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Alert, Button, Field, FieldError, focusRing, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ensureSession } from "@/lib/project/client";
import { applyAsCommercial, type ApplicationState } from "@/lib/site/recruitment-actions";
import { uploadCandidateCv } from "@/lib/site/recruitment-cv";
import { ChoicePills } from "./choice-pills";

const t = fr.pages.recruitment;
const o = t.options;
const f = t.fields;
const k = t.form;
const initial: ApplicationState = {};

/** Champs de chaque étape : sert à revenir sur la bonne étape quand la base refuse un champ. */
const STEP_FIELDS: readonly (readonly string[])[] = [
  ["first_name", "last_name", "email", "phone", "sector"],
  ["legal_status", "sees_artisans", "experience", "availability", "source"],
  ["linkedin_url", "motivation", "consent", "cv_path"],
];

type Errors = Record<string, string[] | undefined>;

/**
 * Candidature « Devenir commercial MENAO » en 3 étapes (lot 79, ADR 0382) : vous, votre profil,
 * votre CV. Chaque étape est contrôlée dans le navigateur avant la suivante ; tous les champs
 * restent dans le même formulaire (étapes masquées), envoyé une seule fois. Le CV part du
 * navigateur vers le stockage privé (process-upload), puis la candidature est enregistrée. La
 * provenance d'une annonce (`?source=linkedin`) est lue dans le navigateur (page statique).
 */
export function ApplicationForm() {
  const [state, action, pending] = useActionState(applyAsCommercial, initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [source, setSource] = useState<string | undefined>(undefined);
  const [cv, setCv] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState("");
  const [cvError, setCvError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromLink = recruitmentSourceFromParam(
      new URLSearchParams(window.location.search).get("source"),
    );
    // Lien d'une annonce : la provenance est pré-cochée (lue après le rendu, la page est statique).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromLink) setSource(fromLink);
  }, []);

  // Refus de la base : retour à la première étape qui contient un champ refusé.
  useEffect(() => {
    const failed = Object.keys(state.fieldErrors ?? {});
    if (failed.length === 0) return;
    const first = STEP_FIELDS.findIndex((fields) => fields.some((name) => failed.includes(name)));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (first >= 0) setStep(first);
    setErrors(state.fieldErrors ?? {});
  }, [state.fieldErrors]);

  if (state.token && state.firstName && state.email) {
    return <Sent firstName={state.firstName} email={state.email} />;
  }

  const v = state.values;
  const busy = pending || uploading;

  function show(next: number) {
    setStep(next);
    const box = top.current?.getBoundingClientRect();
    if (box && box.top < 0) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function check(form: HTMLFormElement, index: number): boolean {
    const values: Record<string, unknown> = Object.fromEntries(new FormData(form));
    values.consent = values.consent === "on";
    const parsed = commercialApplicationSteps[index]?.safeParse(values);
    if (!parsed || parsed.success) {
      setErrors({});
      return true;
    }
    const found: Errors = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      found[key] = [...(found[key] ?? []), issue.message];
    }
    setErrors(found);
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!check(form, step)) return;
    if (step < 2) {
      show(step + 1);
      return;
    }
    // CV facultatif (ADR 0386) : envoyé seulement s'il a été choisi.
    let path = cvPath;
    if (cv && !path) {
      setUploading(true);
      const result = await uploadCandidateCv(cv);
      setUploading(false);
      if (result.status !== "ok") {
        setCvError(k.errors[result.status] ?? messages.candidateCv);
        return;
      }
      path = result.path;
      setCvPath(path);
    } else if (!path) {
      // Sans CV, la session anonyme est ouverte ici (apply_as_commercial est réservée aux
      // comptes connectés, ADR 0382) ; un échec retombe sur le message d'erreur du serveur.
      setUploading(true);
      await ensureSession();
      setUploading(false);
    }
    const data = new FormData(form);
    data.set("cv_path", path);
    startTransition(() => action(data));
  }

  function chooseCv(file: File | null) {
    setCvPath("");
    if (!file) return setCv(null);
    if (file.size > CANDIDATE_CV_MAX_BYTES) {
      setCv(null);
      return setCvError(messages.candidateCvTooLarge);
    }
    if (file.type && file.type !== "application/pdf") {
      setCv(null);
      return setCvError(messages.candidateCvType);
    }
    setCvError(null);
    setCv(file);
  }

  return (
    <div ref={top} className="scroll-mt-24">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Progress step={step} />
        <h3 className="font-display text-[1.375rem] leading-tight font-bold tracking-tight">
          {k.stepTitles[step]}
        </h3>
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <fieldset className={`${step === 0 ? "flex" : "hidden"} flex-col gap-4`}>
          <legend className="sr-only">{k.stepNames[0]}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={f.firstName}
              name="first_name"
              autoComplete="given-name"
              maxLength={60}
              required
              defaultValue={v?.first_name}
              errors={errors.first_name}
            />
            <Field
              label={f.lastName}
              name="last_name"
              autoComplete="family-name"
              maxLength={60}
              required
              defaultValue={v?.last_name}
              errors={errors.last_name}
            />
          </div>
          <Field
            label={f.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={v?.email}
            errors={errors.email}
          />
          <Field
            label={f.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={v?.phone}
            errors={errors.phone}
          />
          <Field
            label={f.sector}
            name="sector"
            maxLength={120}
            required
            hint={f.sectorHint}
            defaultValue={v?.sector}
            errors={errors.sector}
          />
        </fieldset>

        <fieldset className={`${step === 1 ? "flex" : "hidden"} flex-col gap-5`}>
          <legend className="sr-only">{k.stepNames[1]}</legend>
          <ChoicePills
            legend={f.legalStatus}
            name="legal_status"
            options={o.legalStatus}
            defaultValue={v?.legal_status}
            errors={errors.legal_status}
          />
          <ChoicePills
            legend={f.seesArtisans}
            name="sees_artisans"
            options={o.seesArtisans}
            defaultValue={v?.sees_artisans}
            errors={errors.sees_artisans}
          />
          <ChoicePills
            legend={f.experience}
            name="experience"
            options={o.experience}
            defaultValue={v?.experience}
            errors={errors.experience}
          />
          <ChoicePills
            legend={f.availability}
            name="availability"
            options={o.availability}
            defaultValue={v?.availability}
            errors={errors.availability}
          />
          <ChoicePills
            key={source ?? "aucune"}
            legend={f.source}
            name="source"
            options={o.source}
            defaultValue={v?.source || source}
            errors={errors.source}
            hint={f.sourceHint}
          />
        </fieldset>

        <fieldset className={`${step === 2 ? "flex" : "hidden"} flex-col gap-5`}>
          <legend className="sr-only">{k.stepNames[2]}</legend>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">
              {k.cv} <span className="font-normal text-muted-foreground">{f.optional}</span>
            </span>
            <label
              className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 border-dashed px-4 py-3.5 transition-colors hover:bg-background ${
                cvError || errors.cv_path ? "border-danger" : "border-border-strong"
              } ${focusRing} has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20`}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                aria-describedby="cv-aide"
                onChange={(event) => chooseCv(event.target.files?.[0] ?? null)}
              />
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                <FileText aria-hidden="true" className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate text-[0.9375rem]">{cv ? cv.name : k.choose}</b>
                <span id="cv-aide" className="text-[0.8125rem] text-muted-foreground">
                  {k.cvHint}
                  {cv && (
                    <>
                      {" · "}
                      <span className="font-semibold text-primary-strong">{k.replace}</span>
                    </>
                  )}
                </span>
              </span>
              {cv && <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />}
            </label>
            {(cvError ?? errors.cv_path?.[0]) && (
              <FieldError>{cvError ?? errors.cv_path?.[0]}</FieldError>
            )}
          </div>
          <Field
            label={k.linkedin}
            labelNote={f.optional}
            name="linkedin_url"
            inputMode="url"
            autoComplete="url"
            maxLength={300}
            placeholder={k.linkedinPlaceholder}
            defaultValue={v?.linkedin_url}
            errors={errors.linkedin_url}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="candidature-motivation" className="text-sm font-semibold">
              {f.motivation} <span className="font-normal text-muted-foreground">{f.optional}</span>
            </label>
            <textarea
              id="candidature-motivation"
              name="motivation"
              rows={3}
              maxLength={1000}
              defaultValue={v?.motivation}
              aria-invalid={errors.motivation ? true : undefined}
              className={`${inputClasses} min-h-24 resize-y py-3 text-base`}
            />
            {errors.motivation?.[0] && <FieldError>{errors.motivation[0]}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-label">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={v?.consent === "on"}
                aria-invalid={errors.consent ? true : undefined}
                className={`mt-0.5 size-5 shrink-0 accent-primary ${focusRing}`}
              />
              <span>
                {f.consent}{" "}
                <Link
                  href="/confidentialite"
                  className="font-semibold text-primary-strong underline-offset-4 hover:underline"
                >
                  {f.privacy}
                </Link>
              </span>
            </label>
            {errors.consent?.[0] && <FieldError>{errors.consent[0]}</FieldError>}
          </div>
        </fieldset>

        {step === 2 ? (
          <div className="flex flex-col items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="size-4" />
              )}
              {uploading ? k.sending : t.submit}
            </Button>
            <button
              type="button"
              onClick={() => show(1)}
              className={`inline-flex items-center gap-1.5 rounded-sm text-[0.9375rem] font-semibold text-primary-strong ${focusRing}`}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {k.back}
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                block={false}
                onClick={() => show(step - 1)}
              >
                {k.back}
              </Button>
            )}
            <Button type="submit">
              {k.next}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

/** « Étape 2 sur 3 » et les trois traits, avec le nom de chaque étape. */
function Progress({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[0.8125rem] text-muted-foreground" aria-live="polite">
        {k.stepOf(step + 1)}
      </p>
      <ol className="grid grid-cols-3 gap-2">
        {k.stepNames.map((label, i) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-pill ${i <= step ? "bg-primary" : "bg-border"}`}
            />
            <span
              aria-current={i === step ? "step" : undefined}
              className={`text-xs ${
                i === step
                  ? "font-bold text-foreground"
                  : i < step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Après l'envoi : merci, ce qui se passe ensuite. */
function Sent({ firstName, email }: { firstName: string; email: string }) {
  const s = t.sent;
  return (
    <div className="flex flex-col gap-4" role="status">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
        <CircleCheck aria-hidden="true" className="size-7" />
      </span>
      <h3 className="font-display text-[1.625rem] leading-tight font-bold tracking-tight">
        {s.title(firstName)}
      </h3>
      <p className="leading-relaxed text-label">{s.text(email)}</p>
      <ol className="flex flex-col gap-2.5 rounded-2xl bg-background p-4">
        {s.next.map((item, i) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-label">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
      <a
        href="#"
        className={`self-start rounded-sm font-semibold text-primary-strong ${focusRing}`}
      >
        {s.back}
      </a>
    </div>
  );
}
