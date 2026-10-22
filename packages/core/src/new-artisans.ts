/**
 * Nouveaux artisans (lot 5 du plan V1.1, ADR 0160, d'après « Mettre en avant les nouveaux
 * artisans ») : le filet de sécurité de l'artisan qui n'est pas choisi. Être choisi, c'est voir
 * un client signer son devis (un chantier vient toujours d'une demande MENAO). Mêmes valeurs dans
 * la base (migration « nouveaux_artisans ») : toute modification se fait aux deux endroits.
 */
import { percent } from "./overview";

/** Alerte du back-office : au moins 6 demandes reçues en 30 jours sans avoir jamais été choisi. */
export const SUPPORT_ALERT_REQUESTS = 6;
export const SUPPORT_ALERT_DAYS = 30;
/** Pas de nouvelle alerte pour le même artisan pendant 30 jours. */
export const SUPPORT_ALERT_COOLDOWN_DAYS = 30;

/**
 * Mois offert de démarrage : aucun devis signé pendant les 2 premiers mois payants. Il est posé
 * dans Stripe à la facture qui suit ces 2 mois et porte sur la suivante, comme le parrainage.
 */
export const STARTER_MONTH_PAID_MONTHS = 2;

/**
 * Indicateur clé de fidélisation : part des artisans validés il y a 60 à 150 jours (trois mois de
 * validations dont les 60 jours sont écoulés) qui ont signé un premier devis sous 60 jours.
 */
export const FIRST_CHANTIER_DAYS = 60;
export const FIRST_CHANTIER_COHORT_DAYS = 90;

/** Pourcentage arrondi de la cohorte, ou null sans artisan dans la cohorte. */
export function firstChantierRate(c: { cohort: number; withChantier: number }): number | null {
  return percent(c.withChantier, c.cohort);
}
