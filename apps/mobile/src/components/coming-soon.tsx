import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { Body, Card, IconTile, Screen, Title } from "@/ui";

/**
 * Écran d'attente d'un onglet dont le contenu arrive dans un lot suivant de la phase 6 (espace
 * artisan). Aucun lien vers le site (règle 10 : rien qui mène à l'achat de l'abonnement artisan
 * dans l'application).
 */
export function ComingSoon({
  icon,
  title,
  text,
  header,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  header?: ReactNode;
}) {
  return (
    <Screen header={header}>
      <Title>{title}</Title>
      <Card>
        <IconTile icon={icon} />
        <Body>{fr.soon.title}</Body>
        <Body muted>{text}</Body>
      </Card>
    </Screen>
  );
}
