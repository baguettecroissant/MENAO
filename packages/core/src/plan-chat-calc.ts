/**
 * Calculateur du chat « Demander à MENAO » (F-160, ADR 0345) : l'IA écrit le calcul, MENAO le fait.
 * Seuls les nombres (virgule ou point), les valeurs nommées, les quatre opérations et les
 * parenthèses sont acceptés ; tout le reste est refusé. Aucune évaluation de code.
 */
export type CalcResult =
  { ok: true; value: number } | { ok: false; error: "syntaxe" | "inconnu" | "division" };

const MAX_LENGTH = 300;

type Token =
  { kind: "num"; value: number } | { kind: "name"; value: string } | { kind: "op"; value: string };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)?)|([a-zà-öø-ÿ_][a-zà-öø-ÿ0-9_]*)|([-+*/×÷()]))/giy;
  let at = 0;
  while (at < input.length) {
    re.lastIndex = at;
    const m = re.exec(input);
    if (!m) return input.slice(at).trim() === "" ? tokens : null;
    if (m[1] !== undefined) tokens.push({ kind: "num", value: Number(m[1].replace(",", ".")) });
    else if (m[2] !== undefined) tokens.push({ kind: "name", value: m[2].toLowerCase() });
    else if (m[3] !== undefined)
      tokens.push({ kind: "op", value: m[3] === "×" ? "*" : m[3] === "÷" ? "/" : m[3] });
    at = re.lastIndex;
  }
  return tokens;
}

class Failure extends Error {
  constructor(readonly code: "syntaxe" | "inconnu" | "division") {
    super(code);
  }
}

export function evaluateExpression(input: string, values: Record<string, number> = {}): CalcResult {
  if (!input.trim() || input.length > MAX_LENGTH) return { ok: false, error: "syntaxe" };
  const parsed = tokenize(input);
  if (!parsed || parsed.length === 0) return { ok: false, error: "syntaxe" };
  const tokens: Token[] = parsed;
  const named = Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
  let i = 0;
  const peek = () => tokens[i];
  const isOp = (op: string) => peek()?.kind === "op" && peek()?.value === op;

  // expression := terme (('+' | '-') terme)* ; terme := facteur (('*' | '/') facteur)*
  // facteur := ('-' | '+') facteur | nombre | nom | '(' expression ')'
  function expression(): number {
    let value = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[i++]?.value;
      const right = term();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  function term(): number {
    let value = factor();
    while (isOp("*") || isOp("/")) {
      const op = tokens[i++]?.value;
      const right = factor();
      if (op === "/") {
        if (right === 0) throw new Failure("division");
        value /= right;
      } else value *= right;
    }
    return value;
  }
  function factor(): number {
    const t = tokens[i++];
    if (!t) throw new Failure("syntaxe");
    if (t.kind === "op" && (t.value === "-" || t.value === "+")) {
      const v = factor();
      return t.value === "-" ? -v : v;
    }
    if (t.kind === "num") return t.value;
    if (t.kind === "name") {
      // Pas d'appel de fonction : « nom( » est refusé.
      if (isOp("(")) throw new Failure("syntaxe");
      const v = named[t.value];
      if (v === undefined || !Number.isFinite(v)) throw new Failure("inconnu");
      return v;
    }
    if (t.kind === "op" && t.value === "(") {
      const v = expression();
      if (!isOp(")")) throw new Failure("syntaxe");
      i++;
      return v;
    }
    throw new Failure("syntaxe");
  }

  try {
    const value = expression();
    if (i !== tokens.length || !Number.isFinite(value)) return { ok: false, error: "syntaxe" };
    // Arrondi au milliardième : 7,58 × 2,5 donne 18,95 et non 18,949999….
    return { ok: true, value: Math.round(value * 1e9) / 1e9 };
  } catch (e) {
    return { ok: false, error: e instanceof Failure ? e.code : "syntaxe" };
  }
}
