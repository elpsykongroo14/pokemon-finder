import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  { ignores: ["dist/**"] },
  js.configs.recommended, // baseline rules: no-undef, no-unused-vars, etc.
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module", // you use import/export
      globals: { ...globals.browser }, // tells ESLint that `document`, `window`,
    }, // `localStorage` etc. legitimately exist
  },
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: { ...globals.vitest, ...globals.node },
    },
  },
  prettierConfig, // turns off ESLint's own formatting opinions
]; // so it never fights Prettier over style
