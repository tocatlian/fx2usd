"use strict";

const js = require("@eslint/js");

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
    ignores: ["build/**", "coverage/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
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
    files: ["eslint.config.js", "scripts/**/*.js", "tests/**/*.js"],
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
];
