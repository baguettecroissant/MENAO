import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { sendRequests, type RequestValues, type SendContext } from "@/lib/requests";
import { Body, Button, Card, Chip, Notice, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Envoi de la demande aux artisans choisis (F-11), comme sur le site : message facultatif,
 * téléphone (l'artisan rappelle), préférence de rappel. Règles vérifiées en base.
 */
export function RequestForm({ projectId, context }: { projectId: string; context: SendContext }) {
  const [values, setValues] = useState<RequestValues>({
    message: "",
    phone: context.phone,
    callbackMode: "des_que_possible",
    callbackFrom: "",
    callbackTo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RequestValues, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (patch: Partial<RequestValues>) => setValues((current) => ({ ...current, ...patch }));
  const count = context.artisans.length;

  async function submit() {
    setFailure(null);
    setPending(true);
    const outcome = await sendRequests(
      projectId,
      context.artisans.map((a) => a.id),
      values,
    );
    setPending(false);
    if (!outcome.ok) {
      setErrors(outcome.fieldErrors ?? {});
      if (outcome.error) setFailure(outcome.error);
      return;
    }
    router.replace({
      pathname: "/projet/[id]/envoyee",
      params: {
        id: projectId,
        names: context.names,
        count: String(count),
        from: outcome.callbackFrom ?? "",
        to: outcome.callbackTo ?? "",
      },
    });
  }

  return (
    <>
      <Title>{r.title(context.names)}</Title>
      <Body muted>{r.intro}</Body>

      <Card tone="soft">
        <Text style={styles.heading}>{r.selected}</Text>
        {context.artisans.map((artisan) => (
          <View key={artisan.id} style={styles.artisan}>
            {artisan.avatarUrl ? (
              <Image source={{ uri: artisan.avatarUrl }} style={styles.avatar} alt="" />
            ) : (
              <View style={[styles.avatar, styles.initial]}>
                <Text style={styles.initialText}>{artisan.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name}>{artisan.name}</Text>
          </View>
        ))}
      </Card>

      <TextField
        label={r.messageTitle}
        value={values.message}
        onChangeText={(message) => set({ message })}
        hint={r.messageHint(context.names)}
        error={errors.message}
        maxLength={10_000}
        multiline
      />

      <Card>
        <Text style={styles.heading}>{r.contactTitle}</Text>
        <Body muted>{r.contactIntro}</Body>
        <View style={styles.readonly}>
          <Text style={styles.label}>{r.email}</Text>
          <Text style={styles.value}>{context.email}</Text>
        </View>
        <TextField
          label={r.phone}
          value={values.phone}
          onChangeText={(phone) => set({ phone })}
          error={errors.phone}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </Card>

      <Card>
        <Text style={styles.heading}>{r.callbackTitle}</Text>
        <View style={styles.chips}>
          <Chip
            label={r.callbackAsap}
            selected={values.callbackMode === "des_que_possible"}
            onPress={() => set({ callbackMode: "des_que_possible" })}
          />
          <Chip
            label={r.callbackRange}
            selected={values.callbackMode === "plage"}
            onPress={() => set({ callbackMode: "plage" })}
          />
        </View>
        {values.callbackMode === "plage" && (
          <View style={styles.row}>
            <View style={styles.half}>
              <TextField
                label={r.from}
                value={values.callbackFrom}
                onChangeText={(callbackFrom) => set({ callbackFrom })}
                placeholder={r.timePlaceholder}
                error={errors.callbackFrom}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={r.to}
                value={values.callbackTo}
                onChangeText={(callbackTo) => set({ callbackTo })}
                placeholder="18:00"
                error={errors.callbackTo}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        )}
      </Card>

      {failure && <Notice tone="error">{failure}</Notice>}
      <Button label={r.submit(count)} onPress={submit} loading={pending} />
      <Text style={styles.deadline}>{r.deadline}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  artisan: { flexDirection: "row", alignItems: "center", gap: theme.spacing(3) },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  initial: {
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: theme.colors["primary-strong"],
  },
  name: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors.foreground },
  readonly: { gap: theme.spacing(1) },
  label: { fontFamily: theme.font.medium, fontSize: 14, color: theme.colors.foreground },
  value: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors["muted-foreground"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
  row: { flexDirection: "row", gap: theme.spacing(3) },
  half: { flex: 1 },
  deadline: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    textAlign: "center",
    color: theme.colors["muted-foreground"],
  },
});
