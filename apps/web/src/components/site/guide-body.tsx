import { CircleAlert, Sparkles } from "lucide-react";
import type { GuideBlock } from "@/content/guides";
import { frenchSpacing } from "@/lib/site/typography";
import { DecisionFigure, DocumentFigure, FlowFigure, PeriodsFigure } from "./guide-figures";
import { RichText } from "./rich-text";

/**
 * Corps d'un guide (ADR 0135) : intertitres ancrés, paragraphes, listes, tableaux, encadrés et
 * schémas (ADR 0150).
 */
export function GuideBody({ blocks }: { blocks: readonly GuideBlock[] }) {
  return (
    <div className="flex flex-col gap-5 text-[1.0625rem] leading-relaxed text-foreground/90">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={block.id}
                id={block.id}
                className="scroll-mt-24 pt-6 text-[1.5rem] leading-tight font-medium tracking-tight text-balance text-foreground sm:text-[1.75rem]"
              >
                {frenchSpacing(block.text)}
              </h2>
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
              <div
                key={i}
                className="overflow-x-auto rounded-card border border-border bg-surface shadow-card"
              >
                <table className="w-full border-collapse text-left text-sm sm:text-[0.9375rem]">
                  <caption className="sr-only">{block.caption}</caption>
                  <thead className="bg-primary-softer text-sm text-primary-strong">
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
          case "periods":
            return <PeriodsFigure key={i} block={block} />;
          case "decision":
            return <DecisionFigure key={i} block={block} />;
          case "flow":
            return <FlowFigure key={i} block={block} />;
          case "document":
            return <DocumentFigure key={i} block={block} />;
          case "callout": {
            const menao = block.tone === "menao";
            const Icon = menao ? Sparkles : CircleAlert;
            return (
              <aside
                key={i}
                className={`flex gap-3 rounded-card border p-5 ${
                  menao
                    ? "border-primary-soft bg-primary-softer"
                    : "border-warning/30 bg-warning-soft"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`mt-0.5 size-5 shrink-0 ${menao ? "text-primary" : "text-warning"}`}
                />
                <div className="flex flex-col gap-1 text-[0.9375rem]">
                  <p className="font-semibold text-foreground">{block.title}</p>
                  <p className="text-pretty">
                    <RichText text={block.text} />
                  </p>
                </div>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}
