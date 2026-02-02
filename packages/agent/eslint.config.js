import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-console": "off"
    }
  },
  eslintConfigPrettier
];
