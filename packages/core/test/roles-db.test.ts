import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import { ROLES } from "../src/roles";

describe("cohérence avec la base", () => {
  it("les rôles stockés correspondent exactement à l'enum public.app_role", () => {
    const stored = ROLES.filter((r) => r !== "visiteur");
    expect([...Constants.public.Enums.app_role].sort()).toEqual([...stored].sort());
  });
});
