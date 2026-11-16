import { describe, expect, it } from "vitest";
import { evaluateExpression } from "../src/plan-chat-calc";

describe("evaluateExpression", () => {
  it("calcule les quatre opérations, les parenthèses et les virgules", () => {
    expect(evaluateExpression("(7,58 + 7,58 + 3 + 3,62) * 2,5")).toEqual({
      ok: true,
      value: 54.45,
    });
    expect(evaluateExpression("54,45 × 2 ÷ 3")).toEqual({ ok: true, value: 36.3 });
    expect(evaluateExpression("-2 + 10 / 4")).toEqual({ ok: true, value: 0.5 });
  });

  it("remplace les valeurs nommées lues sur le plan", () => {
    expect(evaluateExpression("longueur * hauteur", { longueur: 7.58, hauteur: 2.5 })).toEqual({
      ok: true,
      value: 18.95,
    });
    expect(evaluateExpression("longueur * 2", {})).toEqual({ ok: false, error: "inconnu" });
  });

  it("refuse tout ce qui n'est pas un calcul", () => {
    expect(evaluateExpression("1 / 0")).toEqual({ ok: false, error: "division" });
    expect(evaluateExpression("2 ** 3")).toEqual({ ok: false, error: "syntaxe" });
    expect(evaluateExpression("alert(1)")).toEqual({ ok: false, error: "syntaxe" });
    expect(evaluateExpression("(1 + 2")).toEqual({ ok: false, error: "syntaxe" });
    expect(evaluateExpression("")).toEqual({ ok: false, error: "syntaxe" });
    expect(evaluateExpression("1+".repeat(200) + "1")).toEqual({ ok: false, error: "syntaxe" });
  });
});
