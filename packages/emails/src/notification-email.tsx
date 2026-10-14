import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { colors } from "@menao/ui-tokens";
import { EMAIL_FOOTER, quoted, type EmailContent } from "./content.ts";

// Polices système : les messageries ignorent le plus souvent les polices web.
const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Espace insécable avant « ! ? : ; » : la ponctuation ne passe jamais seule à la ligne.
const typo = (text: string) => text.replace(/ ([!?:;])/g, "\u00a0$1");

// Logo servi par le site (public/images/email/logo.png, 342 × 96, densité ×3), affiché à 150 px.
const LOGO = { path: "/images/email/logo.png", width: 150, height: 42 };

/**
 * Mise en page commune des e-mails MENAO, d'après la maquette « Nouveau devis disponible » :
 * bandeau bleu clair avec le logo, carte blanche, bouton en pilule centré, pied de page.
 * Sans adresse du site (aperçus), le logo est remplacé par le mot « menao ».
 */
export function NotificationEmail({
  content,
  siteUrl = "",
}: {
  content: EmailContent;
  siteUrl?: string;
}) {
  const base = siteUrl.replace(/\/+$/, "");
  return (
    <Html lang="fr">
      <Head />
      <Preview>{content.preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: font,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
          <Section
            align="center"
            style={{
              backgroundColor: colors["primary-soft"],
              borderRadius: "16px 16px 0 0",
              padding: "24px",
              textAlign: "center",
            }}
          >
            {base ? (
              <img
                src={`${base}${LOGO.path}`}
                width={LOGO.width}
                height={LOGO.height}
                alt="MENAO"
                style={{
                  display: "block",
                  margin: "0 auto",
                  border: 0,
                  outline: "none",
                  textDecoration: "none",
                }}
              />
            ) : (
              <Text style={{ fontSize: 26, fontWeight: 700, color: colors.primary, margin: 0 }}>
                menao
              </Text>
            )}
          </Section>
          <Section
            style={{
              backgroundColor: colors.surface,
              borderLeft: `1px solid ${colors.border}`,
              borderRight: `1px solid ${colors.border}`,
              padding: "28px 24px",
            }}
          >
            <Heading
              as="h1"
              style={{
                fontSize: 22,
                lineHeight: "28px",
                color: colors.foreground,
                margin: "0 0 16px",
              }}
            >
              {typo(content.title)}
            </Heading>
            {content.paragraphs.map((paragraph) => (
              <Text
                key={paragraph}
                style={{
                  fontSize: 15,
                  lineHeight: "22px",
                  color: colors.foreground,
                  margin: "0 0 12px",
                }}
              >
                {typo(paragraph)}
              </Text>
            ))}
            {content.quote && (
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: "22px",
                  color: colors.foreground,
                  backgroundColor: colors["primary-softer"],
                  borderLeft: `3px solid ${colors.primary}`,
                  borderRadius: 8,
                  margin: "0 0 16px",
                  padding: "10px 14px",
                }}
              >
                {quoted(content.quote)}
              </Text>
            )}
            <Section style={{ textAlign: "center", paddingTop: 8 }}>
              <Button
                href={content.cta.url}
                style={{
                  backgroundColor: colors.primary,
                  color: colors["primary-foreground"],
                  borderRadius: 9999,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "12px 24px",
                  textDecoration: "none",
                }}
              >
                {content.cta.label}
              </Button>
            </Section>
          </Section>
          {/* Bande bleu clair qui ferme la carte, comme sur la maquette. */}
          <Section
            style={{
              backgroundColor: colors["primary-soft"],
              borderRadius: "0 0 16px 16px",
              height: 12,
              lineHeight: "12px",
              fontSize: 0,
            }}
          >
            &nbsp;
          </Section>
          <Hr style={{ borderColor: colors.border, margin: "24px 0 12px" }} />
          <Text
            style={{
              fontSize: 12,
              lineHeight: "18px",
              color: colors["muted-foreground"],
              margin: 0,
            }}
          >
            {EMAIL_FOOTER}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
