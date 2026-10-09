import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Configuration ESLint commune aux paquets TypeScript (hors Next.js). */
export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", ".turbo/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
);
