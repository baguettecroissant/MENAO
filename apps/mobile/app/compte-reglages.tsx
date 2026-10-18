import { AccountScreen } from "@/components/account-screen";
import { fr } from "@/i18n/fr";

/**
 * « Identité et connexion » de l'artisan, ouvert depuis « Mon profil » (ADR 0129) : informations,
 * e-mail, mot de passe, communications, données, suppression du compte et déconnexion.
 */
export default function CompteReglages() {
  return <AccountScreen title={fr.proHub.rows.identity} />;
}
