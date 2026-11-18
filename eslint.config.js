"use strict";

const js = require("@eslint/js");
const css = require("@eslint/css").default;

const browserGlobals = {
  AbortController: "readonly",
  clearTimeout: "readonly",
  document: "readonly",
  fetch: "readonly",
  localStorage: "readonly",
  location: "readonly",
  navigator: "readonly",
  setTimeout: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  __dirname: "readonly",
  console: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
  URL: "readonly",
};

const serviceWorkerGlobals = {
  caches: "readonly",
  fetch: "readonly",
  Promise: "readonly",
  self: "readonly",
  URL: "readonly",
};

module.exports = [
  {
    ignores: [".cache/**", "build/**", "coverage/**", "dist/**", "node_modules/**", "vendor/**"],
  },
  { ...js.configs.recommended, files: ["**/*.{js,mjs}"] },
  {
    ...css.configs.recommended,
    files: ["**/*.css"],
    language: "css/css",
    rules: {
      ...css.configs.recommended.rules,
      // Existing summary markers have list-style and WebKit fallbacks.
      "css/use-baseline": ["error", { allowSelectors: ["marker"] }],
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },
  {
    files: ["app.js"],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ["sw.js"],
    languageOptions: {
      globals: serviceWorkerGlobals,
    },
  },
  {
    files: ["eslint.config.js", "scripts/**/*.{js,mjs}", "tests/**/*.js"],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        AbortController: "readonly",
        clearTimeout: "readonly",
        globalThis: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
    },
  },
];
