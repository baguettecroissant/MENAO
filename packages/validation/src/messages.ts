/** Messages d'erreur de validation, en français, centralisés. */
export const messages = {
  required: "Ce champ est obligatoire.",
  tooLong: "Ce champ est trop long.",
  emailInvalid: "Adresse e-mail invalide.",
  phoneInvalid: "Numéro de téléphone invalide.",
  passwordTooShort: "Le mot de passe doit contenir au moins 12 caractères.",
  passwordTooLong: "Le mot de passe doit contenir au plus 72 caractères.",
  termsRequired:
    "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité.",
} as const;
