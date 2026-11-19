import type { LegalDocument } from "@/content/legal";
import { fr } from "@/i18n/fr";
import { frenchSpacing } from "@/lib/site/typography";
import { RichText } from "./rich-text";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/**
 * Corps d'un texte légal (F-180, ADR 0377) : date de la version, articles, listes et tableaux.
 * Les tableaux défilent dans leur cadre sur un petit écran, sans élargir la page.
 */
export function LegalBody({ document }: { document: LegalDocument }) {
  return (
    <div className="flex flex-col gap-4 text-foreground/90">
      <p className="text-sm text-muted-foreground">
        {fr.legal.version(longDate.format(new Date(document.updatedAt)))}
      </p>
      {document.blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={block.id}
                id={block.id}
                className="scroll-mt-24 pt-4 text-xl font-bold tracking-tight text-foreground first:pt-0"
              >
                {frenchSpacing(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="pt-2 text-base font-semibold text-foreground">
                {frenchSpacing(block.text)}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-pretty">
                <RichText text={block.text} />
              </p>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={i}
                className={`flex flex-col gap-2 pl-6 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-primary`}
              >
                {block.items.map((item) => (
                  <li key={item} className="pl-1 text-pretty">
                    <RichText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-card border border-border bg-surface">
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <caption className="sr-only">{block.caption}</caption>
                  <thead className="bg-primary-softer text-primary-strong">
                    <tr>
                      {block.head.map((cell) => (
                        <th key={cell} scope="col" className="px-3 py-3 font-semibold sm:px-4">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {block.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cell, c) =>
                          c === 0 ? (
                            <th
                              key={c}
                              scope="row"
                              className="px-3 py-3 align-top font-medium text-foreground sm:px-4"
                            >
                              {cell}
                            </th>
                          ) : (
                            <td key={c} className="px-3 py-3 align-top text-pretty sm:px-4">
                              <RichText text={cell} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
