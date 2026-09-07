import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "no-undef": "off",
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-typescript"] },
        sourceType: "module",
      },
    },
  },
];
