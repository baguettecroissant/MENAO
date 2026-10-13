import * as WebBrowser from "expo-web-browser";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { Body, Button, Card, IconTile, Screen, Title } from "@/ui";

/**
 * Écran d'attente d'un onglet dont le contenu arrive dans un lot suivant de la phase 6. Le lien
 * vers le site n'est proposé qu'aux particuliers (règle 10 : rien qui mène à l'achat de
 * l'abonnement artisan dans l'application).
 */
export function ComingSoon({
  icon,
  title,
  text,
  siteLink = false,
  header,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  siteLink?: boolean;
  header?: ReactNode;
}) {
  return (
    <Screen header={header}>
      <Title>{title}</Title>
      <Card>
        <IconTile icon={icon} />
        <Body>{fr.soon.title}</Body>
        <Body muted>{text}</Body>
        {siteLink && (
          <>
            <Body muted>{fr.soon.web}</Body>
            <Button
              label={fr.brand}
              variant="secondary"
              onPress={() => WebBrowser.openBrowserAsync(env.siteUrl)}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
