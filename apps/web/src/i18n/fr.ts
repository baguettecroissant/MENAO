/** Textes de l'interface, centralisés (CLAUDE.md : pas de chaînes en dur dispersées). */
export const fr = {
  meta: {
    title: "MENAO — Artisans du bâtiment vérifiés",
    description:
      "Trouvez l'artisan du bâtiment qu'il vous faut : devis, signature, paiement sécurisé et suivi de chantier.",
  },
  nav: {
    home: "MENAO",
    signIn: "Connexion",
    signUp: "Créer un compte",
    mySpace: "Mon espace",
  },
  home: {
    title: "Trouvez l'artisan pro du BTP dont vous avez besoin",
    subtitle: "MENAO arrive bientôt dans les Alpes-Maritimes.",
  },
  signUp: {
    title: "Créer mon compte",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone (optionnel)",
    phoneHint: "Indicatif +33 par défaut.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    passwordHint: "12 caractères minimum.",
    acceptTermsBefore: "J'accepte les ",
    terms: "conditions générales d'utilisation",
    acceptTermsMiddle: " et la ",
    privacy: "politique de confidentialité",
    marketing: "J'accepte de recevoir les actualités de MENAO (optionnel).",
    submit: "Créer mon compte",
    haveAccount: "Déjà un compte ?",
    signInLink: "Me connecter à mon espace",
  },
  verifyEmail: {
    title: "Vérifiez votre boîte mail",
    body: "Si cette adresse n'a pas encore de compte, nous venons d'y envoyer un lien de confirmation. Cliquez dessus pour activer votre compte.",
  },
  signIn: {
    title: "Me connecter",
    email: "Adresse e-mail",
    password: "Mot de passe",
    submit: "Me connecter",
    magicLinkLink: "Recevoir un lien de connexion par e-mail",
    noAccount: "Pas encore de compte ?",
    signUpLink: "Créer un compte",
    invalidLink: "Ce lien est invalide ou a expiré. Connectez-vous ou demandez un nouveau lien.",
  },
  magicLink: {
    title: "Connexion par lien magique",
    intro:
      "Saisissez votre adresse e-mail : nous vous enverrons un lien de connexion valable une heure.",
    email: "Adresse e-mail",
    submit: "Recevoir mon lien",
    sent: "Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé.",
    back: "Revenir à la connexion par mot de passe",
  },
  mySpace: {
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : "Bonjour"),
    role: "Type de compte",
    signOut: "Me déconnecter",
  },
  roles: {
    particulier: "Particulier",
    artisan: "Artisan",
    artisan_en_attente: "Artisan (vérification en cours)",
    admin: "Administrateur MENAO",
    support: "Support MENAO",
    visiteur: "Visiteur",
  },
  legal: {
    draftTitle: "Document en cours de rédaction",
    draftBody:
      "Ce document est en cours de validation juridique. Sa version définitive sera publiée avant l'ouverture du service.",
    terms: "Conditions générales d'utilisation",
    privacy: "Politique de confidentialité",
  },
  errors: {
    generic: "Une erreur est survenue. Réessayez dans quelques instants.",
    invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
    emailNotConfirmed: "Confirmez d'abord votre adresse e-mail grâce au lien reçu par e-mail.",
    rateLimited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
    weakPassword: "Ce mot de passe est trop faible. Choisissez-en un plus long ou moins courant.",
  },
} as const;
