import { COMPANY, LEGAL_UPDATED_AT } from "./company";
import type { LegalDocument } from "./types";

// TODO(legal) : texte à faire valider par l'avocat, dont l'exemption de consentement pour la mesure
// d'audience Umami, sans cookie (F-189, ADR 0388).
// TODO(legal) : texte à faire valider par l'avocat. Un bandeau de consentement sera ajouté avant
// tout cookie non indispensable (mesure d'audience), refus aussi simple que l'acceptation.
// Le tableau suit le code (cookies, stockage local et de session) : le tenir à jour à chaque
// ajout. Noms : PRELAUNCH_COOKIE, COMMERCIAL_DEMO_COOKIE, MENU_COOKIE, ARTISAN_SIGNUP_DRAFT_KEY,
// birth-date-memo, app-download-modal, registry-auto-check.
export const cookies: LegalDocument = {
  title: "Politique cookies",
  intro: "MENAO utilise uniquement les cookies nécessaires au fonctionnement du site.",
  updatedAt: LEGAL_UPDATED_AT,
  blocks: [
    { type: "h2", id: "depots", text: "Ce que MENAO dépose sur votre appareil" },
    {
      type: "p",
      text: "Un cookie est un petit fichier que le site enregistre dans votre navigateur. La mémoire locale du navigateur joue le même rôle, sans être envoyée au site à chaque page.",
    },
    {
      type: "p",
      text: "Aucun cookie publicitaire, aucun cookie de mesure d'audience ni aucun traceur de réseau social n'est déposé à ce jour.",
    },
    {
      type: "p",
      text: "Pour savoir quelles pages sont consultées, MENAO utilise Umami, un outil de mesure d'audience hébergé dans l'Union européenne qui ne dépose aucun cookie, n'enregistre rien dans votre navigateur et ne conserve aucune donnée permettant de vous identifier. Si votre navigateur demande à ne pas être suivi, aucune visite n'est comptée.",
    },
    {
      type: "table",
      caption: "Cookies et mémoires locales utilisés par MENAO",
      head: ["Nom", "À quoi il sert", "Durée", "Déposé par"],
      rows: [
        [
          "sb-…-auth-token (cookie)",
          "Vous garder connecté à votre espace",
          "Le temps de votre connexion",
          "MENAO, via Supabase",
        ],
        [
          "menao_menu (cookie)",
          "Retenir si vous avez réduit le menu de votre espace",
          "1 an",
          "MENAO",
        ],
        [
          "menao_acces (cookie)",
          "Retenir le code d'accès saisi avant l'ouverture du site",
          "30 jours",
          "MENAO",
        ],
        [
          "menao_demo_commercial (cookie)",
          "Ouvrir l'espace de démonstration à partir d'un lien d'invitation",
          "7 jours",
          "MENAO",
        ],
        [
          "menao.inscription-pro.v1 (mémoire locale)",
          "Retrouver votre inscription d'artisan en cours si vous revenez plus tard",
          "Jusqu'à la fin de l'inscription",
          "MENAO",
        ],
        [
          "menao:naissance:… (mémoire locale)",
          "Préremplir votre date de naissance à l'étape des paiements, après lecture de votre pièce d'identité",
          "Effacée dès la création du compte de paiement",
          "MENAO",
        ],
        [
          "menao-fenetre-application-vue (mémoire locale)",
          "Ne pas vous reproposer la fenêtre de téléchargement de l'application",
          "Jusqu'à effacement par vous",
          "MENAO",
        ],
        [
          "menao:registre-relance (mémoire de session)",
          "Éviter de relancer plusieurs fois la vérification au registre",
          "Jusqu'à la fermeture de l'onglet",
          "MENAO",
        ],
        [
          "Cookies de Stripe",
          "Sécuriser le paiement et prévenir la fraude, sur les pages de paiement et le formulaire du compte de paiement",
          "Fixée par Stripe",
          "Stripe",
        ],
      ],
    },
    {
      type: "p",
      text: "La signature d'un devis se fait sur une page de DocuSeal, et la connexion avec Google ou Apple sur leurs propres pages : ces services y déposent leurs propres cookies, selon leurs règles.",
    },
    {
      type: "p",
      text: "L'assistante vocale n'ouvre une connexion audio avec ses prestataires que si vous lancez un appel.",
    },
    {
      type: "p",
      text: "Suivi des erreurs : en cas de plantage, des informations techniques (navigateur, page, message d'erreur) sont transmises à notre outil de suivi Sentry, sans donnée personnelle ni cookie.",
    },
    {
      type: "p",
      text: "L'application mobile n'utilise pas de cookies. Elle garde votre connexion dans le trousseau chiffré du téléphone.",
    },

    { type: "h2", id: "choix", text: "Votre choix" },
    {
      type: "p",
      text: "Ces cookies et mémoires sont nécessaires au service que vous demandez : rester connecté, retrouver une inscription en cours, payer en sécurité. Ils ne nécessitent pas votre consentement.",
    },
    {
      type: "p",
      text: "Vous pouvez les bloquer ou les effacer dans les réglages de votre navigateur. Sans le cookie de connexion, votre espace ne peut pas s'ouvrir.",
    },
    {
      type: "p",
      text: "Si nous utilisions un jour des cookies de mesure d'audience ou de publicité, votre consentement serait demandé au préalable, et le refus serait aussi simple que l'acceptation.",
    },

    { type: "h2", id: "contact", text: "Contact" },
    {
      type: "p",
      text: `Une question sur cette page : ${COMPANY.email}. Vos droits sur vos données sont décrits dans la [politique de confidentialité](/confidentialite).`,
    },
  ],
};
