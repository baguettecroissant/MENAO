import "server-only";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "./catalog";
import { absoluteUrl } from "./seo";

const t = fr.llms;
const link = (label: string, path: string, detail?: string) =>
  `- [${label}](${absoluteUrl(path)})${detail ? `: ${detail}` : ""}`;

/** Liens principaux, communs aux deux fichiers. */
async function sections(): Promise<string[]> {
  const { trades } = await seoCatalog();
  return [
    `## ${t.clients}`,
    link(fr.footer.findArtisan, "/recherche", t.links.search),
    link(fr.nav.howItWorks, "/comment-ca-marche", t.links.howItWorks),
    link(fr.nav.guarantees, "/garanties", t.links.guarantees),
    link(fr.footer.faq, "/faq", t.links.faq),
    link(fr.footer.ranking, "/criteres-de-classement", t.links.ranking),
    "",
    `## ${t.pros}`,
    link(fr.nav.pro, "/pro", t.links.pro),
    link(fr.footer.proSignUp, "/pro/inscription", t.links.proSignUp),
    "",
    `## ${t.trades}`,
    ...trades.map(
      (trade) =>
        `${link(trade.label, `/${trade.code}`, t.tradeLink(trade.label))} ([${t.proTradeLink(trade.label)}](${absoluteUrl(`/pro/${trade.code}`)}))`,
    ),
    "",
    `## ${t.about}`,
    link(fr.footer.about, "/a-propos", t.links.about),
    link(fr.footer.contact, "/contact", t.links.contact),
  ];
}

/** llms.txt (format llmstxt.org) : présentation courte et liens vers les pages clés. */
export async function llmsTxt(): Promise<string> {
  return [
    `# ${fr.meta.name}`,
    "",
    `> ${fr.structuredData.organizationDescription}`,
    "",
    t.intro,
    "",
    ...(await sections()),
    "",
    `## ${t.full}`,
    link("llms-full.txt", "/llms-full.txt", t.fullLink),
    "",
  ].join("\n");
}

/** llms-full.txt : la même présentation, avec les faits clés, le fonctionnement et la FAQ. */
export async function llmsFullTxt(): Promise<string> {
  const { communes } = await seoCatalog();
  const about = fr.pages.about;
  const how = fr.pages.howItWorks;
  const faq = fr.pages.faq;
  const steps = (items: readonly { title: string; text: string }[]) =>
    items.map((step, i) => `${i + 1}. **${step.title}** : ${step.text}`);
  return [
    `# ${fr.meta.name}`,
    "",
    `> ${fr.structuredData.organizationDescription}`,
    "",
    t.intro,
    "",
    `## ${t.keyFacts}`,
    ...about.commitments.map((item) => `- **${item.title}** : ${item.text}`),
    "",
    `## ${t.howItWorksClient}`,
    ...steps(how.client),
    "",
    `## ${t.howItWorksPro}`,
    ...steps(how.pro),
    "",
    `## ${t.communes}`,
    communes.map((c) => c.nom).join(", "),
    "",
    `## ${t.faq}`,
    ...[faq.project, faq.payments, faq.trust, faq.pros].flatMap((group) => [
      `### ${group.title}`,
      ...group.items.flatMap((item) => [`**${item.q}**`, item.a, ""]),
    ]),
    ...(await sections()),
    "",
  ].join("\n");
}
