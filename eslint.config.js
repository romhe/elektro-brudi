import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";

export default [
  { ignores: ["node_modules/**", "coverage/**", "**/dist/**", "dist/**"] },
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
  {
    files: ["**/*.tsx"],
    rules: {
      "no-undef": "off",
      // Core ESLint does not see JSX usage; components and wrappers are
      // PascalCase, so unused-variable checks stay on for everything else.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]" }],
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          parserOpts: { plugins: ["jsx", "typescript"] },
        },
        sourceType: "module",
      },
    },
  },
];
