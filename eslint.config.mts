import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  globalIgnores([".next", "node_modules", "dist", "build", "out"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: {
      react: {
        version: "19.2.6",
      },
      "import-x/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      eqeqeq: "off",
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off",
      "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
      "react/prop-types": "off",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "error",
    },
  },
]);
