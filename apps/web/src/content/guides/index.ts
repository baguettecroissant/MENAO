import { assuranceDecennale } from "./assurance-decennale";
import { choisirUnArtisan } from "./choisir-un-artisan";
import { devisTravauxMentionsObligatoires } from "./devis-travaux-mentions-obligatoires";
import { factureElectroniqueArtisans } from "./facture-electronique-artisans";
import { tvaTravauxTauxReduit } from "./tva-travaux-taux-reduit";
import type { Guide } from "./types";

export type { Guide, GuideBlock } from "./types";

/** Tous les guides, dans l'ordre d'affichage. */
export const GUIDES: readonly Guide[] = [
  choisirUnArtisan,
  devisTravauxMentionsObligatoires,
  assuranceDecennale,
  tvaTravauxTauxReduit,
  factureElectroniqueArtisans,
];
