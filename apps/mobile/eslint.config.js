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
  {
    // TypeScript vérifie déjà les membres importés ; la règle ne lit plus les énumérations
    // d'expo-notifications depuis le SDK 58 (`Notifications.AndroidImportance` signalé à tort).
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "import/namespace": "off" },
  },
]);
