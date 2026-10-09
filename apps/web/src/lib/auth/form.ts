/** État renvoyé par les Server Actions des formulaires d'authentification. */
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

/** Lit un champ texte d'un FormData ; undefined si absent. */
export function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}
