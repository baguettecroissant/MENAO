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

/** Mise en page commune des e-mails MENAO : logo, carte blanche, bouton en pilule, pied de page. */
export function NotificationEmail({ content }: { content: EmailContent }) {
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
          <Text
            style={{ fontSize: 24, fontWeight: 700, color: colors.primary, margin: "0 0 16px" }}
          >
            menao
          </Text>
          <Section
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
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
              {content.title}
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
                {paragraph}
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
            <Button
              href={content.cta.url}
              style={{
                backgroundColor: colors.primary,
                color: colors["primary-foreground"],
                borderRadius: 9999,
                fontSize: 15,
                fontWeight: 600,
                padding: "12px 24px",
                marginTop: 8,
                textDecoration: "none",
              }}
            >
              {content.cta.label}
            </Button>
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
