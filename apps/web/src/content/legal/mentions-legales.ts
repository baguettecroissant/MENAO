import { COMPANY, LEGAL_UPDATED_AT } from "./company";
import type { LegalDocument } from "./types";

// TODO(legal) : texte à faire valider par l'avocat. Restent à ajouter : SIREN, numéro de TVA,
// téléphone, médiateur de la consommation, informations dues par les plateformes en ligne.
export const mentionsLegales: LegalDocument = {
  title: "Mentions légales",
  updatedAt: LEGAL_UPDATED_AT,
  blocks: [
    { type: "h2", id: "editeur", text: "Éditeur du site" },
    {
      type: "p",
      text: `Le site menao.fr et l'application MENAO sont édités par **${COMPANY.name}**, ${COMPANY.form}.`,
    },
    {
      type: "list",
      items: [
        `Siège social : ${COMPANY.address}`,
        `Immatriculation : ${COMPANY.registry}`,
        `Contact : ${COMPANY.email}`,
      ],
    },
    { type: "h2", id: "directeur", text: "Directeur de la publication" },
    { type: "p", text: `${COMPANY.director}.` },
    { type: "h2", id: "hebergement", text: "Hébergement" },
    {
      type: "list",
      items: [
        "Site web : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (fonctions exécutées dans l'Union européenne).",
        "Données : Supabase Inc., hébergement des bases de données dans l'Union européenne.",
      ],
    },
    { type: "h2", id: "activite", text: "Activité" },
    {
      type: "p",
      text: "MENAO met en relation des particuliers qui ont un projet de travaux avec des artisans du bâtiment, et fournit à ces artisans des outils de devis, de facturation et de suivi de chantier. MENAO n'exécute pas les travaux et n'est pas partie aux contrats conclus entre les particuliers et les artisans.",
    },
    {
      type: "p",
      text: "Les paiements des chantiers sont traités par Stripe et versés directement à l'artisan. MENAO ne les encaisse pas.",
    },
    {
      type: "p",
      text: "L'ordre dans lequel les artisans sont présentés est expliqué sur la page [Critères de classement](/criteres-de-classement).",
    },
    { type: "h2", id: "propriete", text: "Propriété intellectuelle" },
    {
      type: "p",
      text: `La marque MENAO, le logo, les textes, les images et le logiciel sont la propriété de ${COMPANY.name} ou de ses partenaires. Toute reproduction sans accord écrit est interdite. Les fiches, photos et logos des artisans restent leur propriété.`,
    },
    { type: "h2", id: "signalement", text: "Signaler un contenu" },
    {
      type: "p",
      text: `Pour signaler un contenu illicite ou une fiche trompeuse, écrivez à ${COMPANY.email} en précisant la page concernée et la raison.`,
    },
    { type: "h2", id: "donnees", text: "Données personnelles et cookies" },
    {
      type: "p",
      text: "Voir la [politique de confidentialité](/confidentialite) et la [politique cookies](/cookies).",
    },
  ],
};
