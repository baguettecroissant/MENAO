"use client";

import {
  LAUNCH_CATEGORIES,
  LAUNCH_LIMITS,
  LAUNCH_MEMBER_KINDS,
  LAUNCH_PHASES,
  LAUNCH_TASK_STATUSES,
  type LaunchCategory,
  type LaunchMemberKind,
  type LaunchPhase,
  type LaunchTaskStatus,
} from "@menao/core";
import type { LaunchPlanFile } from "@menao/validation";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Alert,
  Button,
  CheckboxField,
  Field,
  FieldError,
  Hint,
  SelectField,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  copyLaunchTasks,
  deleteLaunchMember,
  deleteLaunchTask,
  importLaunchPlan,
  saveLaunchMember,
  saveLaunchTask,
} from "@/lib/admin/launch-actions";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { checkLaunchPlanFile } from "@/lib/launch/plan-file";

const t = fr.admin.launch;
const labels = fr.commercialLaunch;

/** Clé d'un formulaire : réaffiché avec les valeurs renvoyées après une erreur. */
const formKey = (state: FormState) => JSON.stringify(state.values ?? {});

/** Zone de texte sur plusieurs lignes, avec libellé, aide et erreur (comme Field). */
function TextArea({
  name,
  label,
  defaultValue,
  maxLength,
  hint,
  errors,
}: {
  name: string;
  label: string;
  defaultValue: string;
  maxLength: number;
  hint?: string;
  errors?: readonly string[];
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`${inputClasses} py-3`}
      />
      {errorId && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}

/**
 * Bouton qui ouvre une fenêtre de confirmation avant une action irréversible (retrait d'un membre,
 * suppression d'une tâche).
 */
function ConfirmForm({
  button,
  title,
  text,
  confirm,
  cancel,
  hidden,
  action,
  pending,
  error,
}: {
  button: string;
  title: string;
  text: string;
  confirm: string;
  cancel: string;
  hidden: Record<string, string>;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="danger-text"
        size="sm"
        block={false}
        onClick={() => dialog.current?.showModal()}
      >
        {button}
      </Button>
      <p className="text-xs text-muted-foreground">{text}</p>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-card bg-surface p-0 text-foreground backdrop:bg-foreground/60"
      >
        <form action={action} className="flex flex-col gap-4 p-5 sm:p-6">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="text-lg font-medium">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{text}</p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" variant="danger" disabled={pending} className="sm:w-auto">
              {confirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
              className="sm:w-auto"
            >
              {cancel}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export type LaunchAccountOption = {
  user_id: string;
  nom: string;
  email: string;
  role: string;
  member_id: string | null;
};

/**
 * Membre de l'équipe de lancement (F-66, ADR 0208) : nom, mission, rôle dans l'équipe, compte
 * relié (admins et commerciaux ; un compte déjà dans l'équipe est grisé), objectif interne et
 * ordre. Création si `member` est absent ; sinon remplacement complet.
 */
export function LaunchMemberForm({
  member,
  accounts,
}: {
  member?: {
    id: string;
    nom: string;
    mission: string | null;
    kind: LaunchMemberKind;
    user_id: string | null;
    objectif_valides: number | null;
    ordre: number;
  };
  accounts: readonly LaunchAccountOption[];
}) {
  const [state, action, pending] = useActionState(saveLaunchMember, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const f = t.member.fields;
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-4">
      {member && <input type="hidden" name="id" value={member.id} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={f.nom}
        name="nom"
        defaultValue={v?.nom ?? member?.nom}
        maxLength={LAUNCH_LIMITS.memberNameMaxLength}
        autoComplete="off"
        errors={errors.nom}
        required
      />
      <TextArea
        name="mission"
        label={f.mission}
        hint={f.missionHint}
        defaultValue={v?.mission ?? member?.mission ?? ""}
        maxLength={LAUNCH_LIMITS.missionMaxLength}
        errors={errors.mission}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={f.kind}
          name="kind"
          defaultValue={v?.kind ?? member?.kind ?? "autre"}
          errors={errors.kind}
          required
        >
          {LAUNCH_MEMBER_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {labels.kinds[kind]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={f.account}
          name="user_id"
          hint={f.accountHint}
          defaultValue={v?.user_id ?? member?.user_id ?? ""}
          errors={errors.user_id}
        >
          <option value="">{f.accountNone}</option>
          {accounts.map((a) => {
            const taken = a.member_id !== null && a.member_id !== member?.id;
            const name = `${a.nom} · ${t.member.roles[a.role] ?? a.role}`;
            return (
              <option key={a.user_id} value={a.user_id} disabled={taken}>
                {taken ? f.accountTaken(name) : name}
              </option>
            );
          })}
        </SelectField>
        <Field
          label={f.objective}
          name="objectif_valides"
          type="number"
          inputMode="numeric"
          min={1}
          max={LAUNCH_LIMITS.objectiveMax}
          hint={f.objectiveHint}
          defaultValue={v?.objectif_valides ?? member?.objectif_valides?.toString() ?? ""}
          errors={errors.objectif_valides}
        />
        <Field
          label={f.ordre}
          name="ordre"
          type="number"
          inputMode="numeric"
          hint={f.ordreHint}
          defaultValue={v?.ordre ?? member?.ordre.toString() ?? ""}
          errors={errors.ordre}
        />
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-6">
        {member ? t.member.save : t.member.create}
      </Button>
    </form>
  );
}

/** Retrait d'un membre de l'équipe, après confirmation ; ses tâches restent pour l'équipe. */
export function LaunchMemberDeleteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteLaunchMember, initialFormState);
  const m = t.member;
  return (
    <ConfirmForm
      button={m.delete}
      title={m.delete}
      text={m.deleteHint}
      confirm={m.deleteConfirm}
      cancel={m.cancel}
      hidden={{ id }}
      action={action}
      pending={pending}
      error={state.error}
    />
  );
}

/**
 * Tâche du planning : titre, détail, responsable (ou toute l'équipe), étape, catégorie, dates,
 * rendez-vous régulier, jalon, partage avec toute l'équipe et état. Création si `task` est absent.
 */
export function LaunchTaskForm({
  task,
  members,
  defaultMemberId,
}: {
  task?: {
    id: string;
    member_id: string | null;
    titre: string;
    detail: string | null;
    phase: LaunchPhase;
    categorie: LaunchCategory;
    debut: string | null;
    echeance: string | null;
    recurrence: string | null;
    jalon: boolean;
    partage: boolean;
    statut: LaunchTaskStatus;
  };
  members: readonly { id: string; nom: string }[];
  /** Responsable proposé pour une nouvelle tâche (?membre=…). */
  defaultMemberId?: string | null;
}) {
  const [state, action, pending] = useActionState(saveLaunchTask, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const f = t.task.fields;
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-4">
      {task && <input type="hidden" name="id" value={task.id} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={f.titre}
        name="titre"
        defaultValue={v?.titre ?? task?.titre}
        maxLength={LAUNCH_LIMITS.titleMaxLength}
        autoComplete="off"
        errors={errors.titre}
        required
      />
      <TextArea
        name="detail"
        label={f.detail}
        defaultValue={v?.detail ?? task?.detail ?? ""}
        maxLength={LAUNCH_LIMITS.detailMaxLength}
        errors={errors.detail}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={f.member}
          name="member_id"
          defaultValue={v?.member_id ?? task?.member_id ?? defaultMemberId ?? ""}
          errors={errors.member_id}
        >
          <option value="">{f.team}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={f.statut}
          name="statut"
          defaultValue={v?.statut ?? task?.statut ?? "a_faire"}
          errors={errors.statut}
        >
          {LAUNCH_TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labels.statuses[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={f.phase}
          name="phase"
          defaultValue={v?.phase ?? task?.phase ?? "preparation"}
          errors={errors.phase}
        >
          {LAUNCH_PHASES.map((p) => (
            <option key={p} value={p}>
              {labels.phases[p]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={f.categorie}
          name="categorie"
          defaultValue={v?.categorie ?? task?.categorie ?? "pilotage"}
          errors={errors.categorie}
        >
          {LAUNCH_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labels.categories[c]}
            </option>
          ))}
        </SelectField>
        <Field
          label={f.debut}
          name="debut"
          type="date"
          min={LAUNCH_LIMITS.minDate}
          max={LAUNCH_LIMITS.maxDate}
          defaultValue={v?.debut ?? task?.debut ?? ""}
          errors={errors.debut}
        />
        <Field
          label={f.echeance}
          name="echeance"
          type="date"
          min={LAUNCH_LIMITS.minDate}
          max={LAUNCH_LIMITS.maxDate}
          hint={f.echeanceHint}
          defaultValue={v?.echeance ?? task?.echeance ?? ""}
          errors={errors.echeance}
        />
      </div>
      <Field
        label={f.recurrence}
        name="recurrence"
        hint={f.recurrenceHint}
        defaultValue={v?.recurrence ?? task?.recurrence ?? ""}
        maxLength={LAUNCH_LIMITS.recurrenceMaxLength}
        autoComplete="off"
        errors={errors.recurrence}
      />
      <CheckboxField name="jalon" defaultChecked={v ? v.jalon === "on" : (task?.jalon ?? false)}>
        {f.jalon}
      </CheckboxField>
      <div className="flex flex-col gap-1.5">
        <CheckboxField
          name="partage"
          defaultChecked={v ? v.partage === "on" : (task?.partage ?? false)}
          aria-describedby="partage-aide"
        >
          {f.partage}
        </CheckboxField>
        <Hint id="partage-aide">{f.partageHint}</Hint>
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-6">
        {t.task.save}
      </Button>
    </form>
  );
}

/** Suppression d'une tâche, après confirmation ; retour sur le tableau de son responsable. */
export function LaunchTaskDeleteForm({ id, memberId }: { id: string; memberId: string | null }) {
  const [state, action, pending] = useActionState(deleteLaunchTask, initialFormState);
  const k = t.task;
  return (
    <ConfirmForm
      button={k.delete}
      title={k.delete}
      text={k.deleteHint}
      confirm={k.deleteConfirm}
      cancel={k.cancel}
      hidden={memberId ? { id, member: memberId } : { id }}
      action={action}
      pending={pending}
      error={state.error}
    />
  );
}

/**
 * Copie du planning d'un membre vers un autre (nouveau commercial), après confirmation : toutes
 * ses tâches, remises à faire.
 */
export function LaunchCopyForm({ members }: { members: readonly { id: string; nom: string }[] }) {
  const [state, action, pending] = useActionState(copyLaunchTasks, initialFormState);
  const [from, setFrom] = useState(state.values?.from ?? "");
  const [to, setTo] = useState(state.values?.to ?? "");
  const [localError, setLocalError] = useState<{ from?: string; to?: string }>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const c = t.copy;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.nom ?? "";

  function open() {
    const errors = {
      from: from ? undefined : c.choose,
      to: !to ? c.choose : to === from ? c.same : undefined,
    };
    setLocalError(errors);
    if (!errors.from && !errors.to) dialog.current?.showModal();
  }

  const options = (
    <>
      <option value="" disabled>
        {c.choose}
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nom}
        </option>
      ))}
    </>
  );
  const fieldError = (name: "from" | "to") => {
    const message = localError[name] ?? state.fieldErrors?.[name]?.[0];
    return message ? [message] : undefined;
  };

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="copie-de"
          label={c.from}
          name="from"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          errors={fieldError("from")}
        >
          {options}
        </SelectField>
        <SelectField
          id="copie-vers"
          label={c.to}
          name="to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          errors={fieldError("to")}
        >
          {options}
        </SelectField>
      </div>
      <Button
        type="button"
        variant="secondary"
        block={false}
        onClick={open}
        className="self-start sm:px-6"
      >
        {c.submit}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-card bg-surface p-0 text-foreground backdrop:bg-foreground/60"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 id={titleId} className="text-lg font-medium">
            {c.title}
          </h2>
          <p className="text-sm text-muted-foreground">{c.confirm(nameOf(from), nameOf(to))}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" disabled={pending} className="sm:w-auto">
              {c.confirmButton}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
              className="sm:w-auto"
            >
              {c.cancel}
            </Button>
          </div>
        </div>
      </dialog>
    </form>
  );
}

/**
 * Import du plan de lancement : fichier .json choisi sur l'ordinateur de l'admin (gardé hors du
 * dépôt public), lu et vérifié dans le navigateur (aperçu « n membres, n tâches », et les cibles
 * et réglages des chiffres s'il y en a, lot 2), puis envoyé à l'action serveur ; message avec les
 * compteurs de la base.
 */
export function LaunchPlanImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<LaunchPlanFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const i = t.import;

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    setPlan(null);
    setError(null);
    setDone(null);
    const file = event.target.files?.[0];
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError(i.errors.read);
      return;
    }
    const checked = checkLaunchPlanFile(data);
    if ("error" in checked) setError(checked.error);
    else setPlan(checked.plan);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) {
      setError(error ?? i.errors.choose);
      return;
    }
    startTransition(async () => {
      const response = await importLaunchPlan(plan).catch(() => null);
      if (!response || "error" in response) {
        setError(response?.error ?? i.errors.save);
        return;
      }
      setPlan(null);
      setDone(i.done(response.result));
      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  let message: ReactNode = null;
  if (error) message = <Alert tone="error">{error}</Alert>;
  else if (done) message = <Alert tone="success">{done}</Alert>;
  else if (plan) {
    message = (
      <Alert tone="info">
        {i.preview(
          plan.members.length,
          plan.tasks.length,
          plan.cibles?.length ?? 0,
          plan.reglages !== undefined,
        )}
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-lancement" className="text-sm font-medium">
          {i.file}
        </label>
        <input
          ref={input}
          id="plan-lancement"
          type="file"
          accept="application/json,.json"
          onChange={pick}
          disabled={pending}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:min-h-touch file:cursor-pointer file:rounded-button file:border file:border-border-strong file:bg-surface file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-background"
        />
      </div>
      {message}
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-6">
        {i.submit}
      </Button>
    </form>
  );
}
