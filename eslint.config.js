import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  { ignores: ["**/dist/", "**/node_modules/", ".ai.dump/", "home/index.html"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  prettierPlugin,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
      },
    },
  },
);
