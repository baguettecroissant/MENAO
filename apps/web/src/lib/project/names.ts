const list = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/** « Noé », « Noé et Inès », « Noé, Inès et Lou ». */
export function joinNames(names: string[]): string {
  return list.format(names);
}
