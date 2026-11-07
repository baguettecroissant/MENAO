import { describe, expect, it } from "vitest";
import { messages } from "../src/messages";
import { teamInviteSchema } from "../src/team";

describe("invitation d'un membre de l'équipe (ADR 0240)", () => {
  it("accepte un chef d'équipe ou un ouvrier, adresse en minuscules", () => {
    const parsed = teamInviteSchema.safeParse({
      firstName: " Léa ",
      lastName: "Martin",
      email: " Lea.Martin@Example.TEST ",
      role: "chef",
    });
    expect(parsed.success && parsed.data).toEqual({
      firstName: "Léa",
      lastName: "Martin",
      email: "lea.martin@example.test",
      role: "chef",
    });
  });

  it("refuse un rôle inconnu, une adresse invalide, un nom vide", () => {
    const parsed = teamInviteSchema.safeParse({
      firstName: "",
      lastName: "Martin",
      email: "pas-une-adresse",
      role: "patron",
    });
    expect(parsed.success).toBe(false);
    const issues = parsed.error?.issues.map((i) => [i.path[0], i.message]);
    expect(issues).toContainEqual(["firstName", messages.required]);
    expect(issues).toContainEqual(["email", messages.emailInvalid]);
    expect(issues).toContainEqual(["role", messages.teamRole]);
  });
});
