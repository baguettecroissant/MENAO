import { router } from "expo-router";
import { fr } from "@/i18n/fr";
import { Body, Button, Screen, Title } from "@/ui";

export default function NotFound() {
  return (
    <Screen centered>
      <Title>{fr.notFound.title}</Title>
      <Body muted>{fr.notFound.text}</Body>
      <Button label={fr.notFound.home} onPress={() => router.replace("/")} />
    </Screen>
  );
}
