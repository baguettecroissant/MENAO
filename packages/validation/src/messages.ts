/** Messages d'erreur de validation, en français, centralisés. */
export const messages = {
  required: "Ce champ est obligatoire.",
  tooLong: "Ce champ est trop long.",
  emailInvalid: "Adresse e-mail invalide.",
  phoneInvalid: "Numéro de téléphone invalide.",
  passwordTooShort: "Le mot de passe doit contenir au moins 12 caractères.",
  passwordTooLong: "Le mot de passe doit contenir au plus 72 caractères.",
  siretInvalid: "Numéro SIRET invalide (14 chiffres).",
  cgvRequired: "Vous devez accepter les conditions générales de vente artisans.",
  phoneRequired: "Le téléphone est obligatoire pour un compte professionnel.",
  tradeRequired: "Choisissez au moins un métier.",
  experienceInvalid: "Nombre d'années invalide.",
  dateInvalid: "Date invalide.",
  dateExpired: "Cette date est déjà passée.",
  zoneAddressRequired: "Choisissez une adresse dans la liste proposée.",
  radiusInvalid: "Choisissez un rayon dans la liste.",
  communesRequired: "Ajoutez au moins une commune.",
  tooMany: "Trop d'éléments sélectionnés.",
  termsRequired:
    "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité.",
} as const;
