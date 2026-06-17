const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_PATH = path.join(__dirname, "..", "app.js");
const APP_SOURCE = fs
  .readFileSync(APP_PATH, "utf8")
  .replace(/void init\(\);\s*$/, "globalThis.__initPromise = init();\n");

const STORAGE_KEYS = {
  currency: "fx_selected_currency",
  cache: "fx_rate_cache",
  history: "fx_rate_history",
  customCurrencies: "fx_custom_currencies",
  supportedCodes: "fx_supported_codes",
};

class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.listeners = {};
    this.attributes = new Map();
    this.style = {};
    this.value = "";
    this.placeholder = "";
    this.disabled = false;
    this.hidden = false;
    this.open = false;
    this.textContent = "";
    this.label = "";
    this.summary = "";
    this._innerHTML = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(handler);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  trigger(type, event = {}) {
    const handlers = this.listeners[type] || [];
    const completeEvent = { target: this, key: undefined, ...event };
    handlers.forEach((handler) => handler(completeEvent));
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
    if (value === "") {
      this.textContent = "";
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function createLocalStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

function createDocument() {
  const elements = new Map();
  return {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, new FakeElement("div", id));
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    elements,
  };
}

function createFetchStub(overrides = {}) {
  return async function fetch(url) {
    if (overrides[url] instanceof Error) {
      throw overrides[url];
    }
    if (typeof overrides[url] === "function") {
      return overrides[url](url);
    }
    if (overrides[url]) {
      return overrides[url];
    }

    if (url === "https://open.er-api.com/v6/latest/USD") {
      return {
        ok: true,
        async json() {
          return {
            result: "success",
            rates: {
              EUR: 0.91,
              GBP: 0.78,
              JPY: 156.4,
            },
          };
        },
      };
    }

    if (url === "https://open.er-api.com/v6/latest/EUR") {
      return {
        ok: true,
        async json() {
          return {
            result: "success",
            rates: {
              USD: 1.25,
            },
          };
        },
      };
    }

    if (url === "https://open.er-api.com/v6/latest/XTS") {
      return {
        ok: true,
        async json() {
          return {
            result: "success",
            rates: {
              USD: 2.5,
            },
          };
        },
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };
}

async function createApp({ onLine = true, storage = {}, fetchOverrides = {} } = {}) {
  const document = createDocument();
  const localStorage = createLocalStorage(storage);
  const context = {
    AbortController,
    Array,
    Boolean,
    Date,
    Intl,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    String,
    console,
    clearTimeout,
    document,
    fetch: createFetchStub(fetchOverrides),
    localStorage,
    navigator: { onLine },
    setTimeout,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(APP_SOURCE, context, { filename: APP_PATH });
  if (context.__initPromise) {
    await context.__initPromise;
  }
  return { context, document, localStorage };
}

function getElement(document, id) {
  return document.getElementById(id);
}

function getTextContentList(element) {
  return element.children.map((child) => child.textContent);
}

test("history renders rates as 1 USD equals foreign currency", async () => {
  const { context, document } = await createApp();

  context.renderHistory([
    {
      code: "EUR",
      rate: 0.8,
      source: "Live refresh",
      timestamp: "2026-06-11T15:00:00.000Z",
    },
  ]);

  const historyItems = getTextContentList(getElement(document, "historyList"));
  assert.equal(historyItems.length, 1);
  assert.match(historyItems[0], /1 USD = 1\.250000 EUR/);
  assert.doesNotMatch(historyItems[0], /1 EUR =/);
});

test("history rendering hardens malformed persisted metadata", async () => {
  const { document } = await createApp({
    storage: {
      [STORAGE_KEYS.history]: JSON.stringify([
        {
          code: "JPY",
          rate: 0.0064,
          source: "",
          timestamp: "not-a-date",
        },
      ]),
    },
  });

  const historyItems = getTextContentList(getElement(document, "historyList"));
  assert.equal(historyItems.length, 1);
  assert.equal(historyItems[0], "Unknown time — 1 USD = 156.250000 JPY (Rate update)");
});

test("manual override keeps conversion and banknotes in foreign-to-USD direction", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");

  const amountInput = getElement(document, "amountInput");
  const manualRateInput = getElement(document, "manualRate");
  amountInput.value = "50";
  manualRateInput.value = "2";
  manualRateInput.trigger("input");

  await context.handleConvert();

  assert.equal(getElement(document, "usdOutput").textContent, "USD 100.00");
  assert.match(getElement(document, "billsList").children[0].textContent, /equals USD 10\.00$/);
});

test("manual rate panel starts collapsed and stays collapsed when a currency is selected", async () => {
  const { context, document } = await createApp();

  assert.equal(getElement(document, "manualPanel").open, false);
  assert.equal(getElement(document, "manualPanelContent").hidden, true);
  assert.equal(getElement(document, "manualRate").disabled, true);
  assert.equal(getElement(document, "manualToggleBtn").textContent, "+");
  assert.equal(getElement(document, "manualToggleBtn").getAttribute("aria-expanded"), "false");
  assert.equal(
    getElement(document, "manualPanelHint").textContent,
    "Choose a currency first to enter a manual rate.",
  );

  context.setCurrency("EUR");

  assert.equal(getElement(document, "manualPanel").open, false);
  assert.equal(getElement(document, "manualPanelContent").hidden, true);
  assert.equal(getElement(document, "manualRate").disabled, false);
  assert.equal(
    getElement(document, "manualPanelHint").textContent,
    "Uses live rate by default. Enter a manual rate to override it.",
  );
});

test("manual conversion honors a populated manual rate even without an input event", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");

  getElement(document, "amountInput").value = "50";
  getElement(document, "manualRate").value = "2";

  await context.handleConvert();

  assert.equal(getElement(document, "usdOutput").textContent, "USD 100.00");
});

test("manual toggle button opens and closes the panel", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");

  getElement(document, "manualToggleBtn").trigger("click");
  assert.equal(getElement(document, "manualPanel").open, true);
  assert.equal(getElement(document, "manualPanelContent").hidden, false);
  assert.equal(getElement(document, "manualToggleBtn").textContent, "–");

  getElement(document, "manualToggleBtn").trigger("click");
  assert.equal(getElement(document, "manualPanel").open, false);
  assert.equal(getElement(document, "manualPanelContent").hidden, true);
  assert.equal(getElement(document, "manualToggleBtn").textContent, "+");
});

test("invalid manual rate opens the panel and blocks banknote previews", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");
  await context.refreshManualRate("EUR");

  getElement(document, "amountInput").value = "25";
  getElement(document, "manualPanel").open = false;
  getElement(document, "manualRate").value = "0";
  getElement(document, "manualRate").trigger("input");

  await context.handleConvert();

  assert.equal(getElement(document, "manualPanel").open, true);
  assert.equal(getElement(document, "manualPanelContent").hidden, false);
  assert.equal(getElement(document, "manualToggleBtn").textContent, "–");
  assert.equal(getElement(document, "manualToggleBtn").getAttribute("aria-expanded"), "true");
  assert.equal(
    getElement(document, "manualRateError").textContent,
    "Enter a valid manual rate greater than 0.",
  );
  assert.equal(
    getElement(document, "billsMessage").textContent,
    "Enter a valid manual rate to preview banknotes.",
  );
  assert.equal(getElement(document, "billsList").children.length, 0);
});

test("clearing the manual rate returns banknotes to the live cached rate", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");
  await context.refreshManualRate("EUR");

  getElement(document, "manualRate").value = "2";
  getElement(document, "manualRate").trigger("input");
  getElement(document, "manualRate").value = "";
  getElement(document, "manualRate").trigger("input");

  assert.equal(
    getElement(document, "manualPanelHint").textContent,
    "Uses live rate by default. Enter a manual rate to override it.",
  );
  assert.equal(getElement(document, "billsMessage").textContent, "");
  assert.match(getElement(document, "billsList").children[0].textContent, /equals USD 6\.25$/);
});

test("switching currencies clears the manual rate and collapses the panel", async () => {
  const { context, document } = await createApp();
  context.setCurrency("EUR");

  getElement(document, "manualToggleBtn").trigger("click");
  getElement(document, "manualRate").value = "2";
  getElement(document, "manualRate").trigger("input");

  context.setCurrency("GBP");

  assert.equal(getElement(document, "manualPanel").open, false);
  assert.equal(getElement(document, "manualPanelContent").hidden, true);
  assert.equal(getElement(document, "manualRate").value, "");
  assert.equal(getElement(document, "manualRateError").textContent, "");
  assert.equal(getElement(document, "manualToggleBtn").textContent, "+");
  assert.equal(
    getElement(document, "manualPanelHint").textContent,
    "Uses live rate by default. Enter a manual rate to override it.",
  );
  assert.equal(getElement(document, "usdOutput").textContent, "USD --");
});

test("offline conversion uses cached rate without surfacing a retry error", async () => {
  const { context, document } = await createApp({
    onLine: false,
    storage: {
      [STORAGE_KEYS.cache]: JSON.stringify({
        EUR: {
          rate: 1.1,
          fetchedAt: "2026-06-11T10:00:00.000Z",
        },
      }),
    },
  });

  context.setCurrency("EUR");
  getElement(document, "amountInput").value = "10";

  await context.handleConvert();

  assert.equal(getElement(document, "usdOutput").textContent, "USD 11.00");
  assert.equal(getElement(document, "statusMessage").textContent, "");
  assert.equal(getElement(document, "retryBtn").hidden, true);
});

test("refreshManualRate falls back to cached data when the live fetch fails", async () => {
  const { context, document } = await createApp({
    storage: {
      [STORAGE_KEYS.cache]: JSON.stringify({
        EUR: {
          rate: 1.2,
          fetchedAt: "2026-06-11T10:00:00.000Z",
        },
      }),
    },
    fetchOverrides: {
      "https://open.er-api.com/v6/latest/EUR": new Error("network down"),
    },
  });

  context.setCurrency("EUR");
  await context.refreshManualRate("EUR");

  assert.equal(getElement(document, "manualRate").placeholder, "1.2000");
  assert.equal(
    getElement(document, "statusMessage").textContent,
    "Live rate unavailable. Using cached rate.",
  );
  assert.match(
    getElement(document, "historyList").children[0].textContent,
    /1 USD = 0\.833333 EUR \(Cached fallback\)/,
  );
});

test("adding a custom currency persists it and selects it immediately", async () => {
  const { context, document, localStorage } = await createApp();

  getElement(document, "customCode").value = "xts";
  getElement(document, "customName").value = "Test Tender";
  getElement(document, "customSymbol").value = "T$";

  await context.addCustomCurrency();

  const savedCurrencies = JSON.parse(localStorage.snapshot()[STORAGE_KEYS.customCurrencies]);
  assert.deepEqual(savedCurrencies, [
    {
      code: "XTS",
      name: "Test Tender",
      symbol: "T$",
    },
  ]);
  assert.equal(getElement(document, "currencySelect").value, "XTS");
  assert.equal(getElement(document, "amountLabel").textContent, "Amount in XTS");
  assert.equal(getElement(document, "manualRate").placeholder, "2.5000");
});
