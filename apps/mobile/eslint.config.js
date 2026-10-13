// @ts-check
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*", "expo-env.d.ts"] },
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]);
