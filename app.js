// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paul Tocatlian
const DEFAULT_CURRENCIES = [
  { code: "AUD", name: "Australian Dollar", symbol: "$", example: "325.50" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$", example: "480.00" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", example: "210.75" },
  { code: "AFN", name: "Afghan Afghani", symbol: "؋", example: "8500.00" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", example: "9500.00" },
  { code: "BND", name: "Brunei Dollar", symbol: "$", example: "610.00" },
  { code: "BTN", name: "Bhutanese Ngultrum", symbol: "Nu.", example: "7800.00" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", example: "1500.00" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "$", example: "700.00" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", example: "250000.00" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", example: "8500.00" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", example: "12000" },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", example: "320000" },
  { code: "KPW", name: "North Korean Won", symbol: "₩", example: "95000" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", example: "95000" },
  { code: "LAK", name: "Lao Kip", symbol: "₭", example: "2200000" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", example: "42000.00" },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K", example: "350000" },
  { code: "MNT", name: "Mongolian Tugrik", symbol: "₮", example: "1200000" },
  { code: "MOP", name: "Macanese Pataca", symbol: "MOP$", example: "700.00" },
  { code: "MVR", name: "Maldivian Rufiyaa", symbol: "Rf", example: "1200.00" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", example: "620.00" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs", example: "8800.00" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", example: "3500.00" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", example: "120000.00" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$", example: "560.00" },
  { code: "THB", name: "Thai Baht", symbol: "฿", example: "1800.00" },
  { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$", example: "12000.00" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", example: "2500000" },
  { code: "EUR", name: "Euro", symbol: "€", example: "500.00" },
  { code: "GBP", name: "British Pound", symbol: "£", example: "420.00" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", example: "820.00" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$", example: "610.00" },
];

const BANKNOTES = {
  AFN: [10, 20, 50, 100, 500, 1000],
  AUD: [5, 10, 20, 50, 100],
  BDT: [2, 5, 10, 20, 50, 100, 200, 500, 1000],
  BND: [2, 5, 10, 50, 100, 1000],
  BTN: [1, 5, 10, 20, 50, 100, 500, 1000],
  CAD: [5, 10, 20, 50, 100],
  CHF: [10, 20, 50, 100, 200, 1000],
  CNY: [1, 5, 10, 20, 50, 100],
  EUR: [5, 10, 20, 50, 100, 200, 500],
  GBP: [5, 10, 20, 50],
  HKD: [10, 20, 50, 100, 500, 1000],
  IDR: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  INR: [10, 20, 50, 100, 200, 500, 2000],
  JPY: [1000, 2000, 5000, 10000],
  KHR: [50, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
  KPW: [5, 10, 50, 100, 200, 500, 1000, 2000, 5000],
  KRW: [1000, 5000, 10000, 50000],
  LAK: [1000, 2000, 5000, 10000, 20000, 50000, 100000],
  LKR: [20, 50, 100, 500, 1000, 5000],
  MMK: [50, 100, 200, 500, 1000, 5000, 10000],
  MNT: [10, 20, 50, 100, 500, 1000, 5000, 10000, 20000],
  MOP: [10, 20, 50, 100, 500, 1000],
  MVR: [5, 10, 20, 50, 100, 500, 1000],
  MXN: [20, 50, 100, 200, 500, 1000],
  MYR: [1, 5, 10, 20, 50, 100],
  NPR: [5, 10, 20, 50, 100, 500, 1000],
  NZD: [5, 10, 20, 50, 100],
  PHP: [20, 50, 100, 200, 500, 1000],
  PKR: [10, 20, 50, 100, 500, 1000, 5000],
  SGD: [2, 5, 10, 50, 100, 1000, 10000],
  THB: [20, 50, 100, 500, 1000],
  TWD: [100, 200, 500, 1000, 2000],
  VND: [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000],
};

const STORAGE_KEYS = {
  currency: "fx_selected_currency",
  cache: "fx_rate_cache",
  history: "fx_rate_history",
  customCurrencies: "fx_custom_currencies",
  supportedCodes: "fx_supported_codes",
};

const USD_PLACEHOLDER_TARGET = 100;
const DEFAULT_AMOUNT_PLACEHOLDER = "0";
const FETCH_TIMEOUT_MS = 8000;

const currencySelect = document.getElementById("currencySelect");
const amountInput = document.getElementById("amountInput");
const amountLabel = document.getElementById("amountLabel");
const amountHint = document.getElementById("amountHint");
const amountError = document.getElementById("amountError");
const convertBtn = document.getElementById("convertBtn");
const retryBtn = document.getElementById("retryBtn");
const manualPanel = document.getElementById("manualPanel");
const manualPanelContent = document.getElementById("manualPanelContent");
const manualToggleBtn = document.getElementById("manualToggleBtn");
const manualRateInput = document.getElementById("manualRate");
const manualCode = document.getElementById("manualCode");
const manualPanelHint = document.getElementById("manualPanelHint");
const manualRateError = document.getElementById("manualRateError");
const usdOutput = document.getElementById("usdOutput");
const statusMessage = document.getElementById("statusMessage");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const billsList = document.getElementById("billsList");
const billsMessage = document.getElementById("billsMessage");
const customCodeInput = document.getElementById("customCode");
const customNameInput = document.getElementById("customName");
const customSymbolInput = document.getElementById("customSymbol");
const addCustomBtn = document.getElementById("addCustomBtn");
const customError = document.getElementById("customError");

let currentCurrency = null;
let customCurrencies = [];
let supportedCurrencies = [...DEFAULT_CURRENCIES];
let latestRefreshRequestId = 0;

const currencyDisplay =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

const symbolCache = new Map();
const nameCache = new Map();
const amountPlaceholderFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

function getCurrencyName(code) {
  if (nameCache.has(code)) {
    return nameCache.get(code);
  }
  let name = code;
  if (currencyDisplay) {
    const displayName = currencyDisplay.of(code);
    if (displayName) {
      name = displayName;
    }
  }
  nameCache.set(code, name);
  return name;
}

function getCurrencySymbol(code) {
  if (symbolCache.has(code)) {
    return symbolCache.get(code);
  }
  let symbol = code;
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).formatToParts(1);
    const currencyPart = parts.find((part) => part.type === "currency");
    if (currencyPart && currencyPart.value) {
      symbol = currencyPart.value;
    }
  } catch (error) {
    symbol = code;
  }
  symbolCache.set(code, symbol);
  return symbol;
}

function buildCurrency(code) {
  return {
    code,
    name: getCurrencyName(code),
    symbol: getCurrencySymbol(code),
  };
}

function populateCurrencies() {
  currencySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a currency";
  currencySelect.appendChild(placeholder);

  const customGroup = document.createElement("optgroup");
  customGroup.label = "Custom";
  if (customCurrencies.length) {
    [...customCurrencies].sort(sortByName).forEach((currency) => {
      const option = document.createElement("option");
      option.value = currency.code;
      option.textContent = `${currency.name} ${currency.code}`;
      customGroup.appendChild(option);
    });
    const clearOption = document.createElement("option");
    clearOption.value = "__clear_custom__";
    clearOption.textContent = "Clear custom currencies";
    customGroup.appendChild(clearOption);
  } else {
    const emptyOption = document.createElement("option");
    emptyOption.value = "__empty_custom__";
    emptyOption.textContent = "No custom currencies";
    emptyOption.disabled = true;
    customGroup.appendChild(emptyOption);
  }
  currencySelect.appendChild(customGroup);

  const supportedGroup = document.createElement("optgroup");
  supportedGroup.label = "Supported";
  [...supportedCurrencies].sort(sortByName).forEach((currency) => {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = `${currency.name} ${currency.code}`;
    supportedGroup.appendChild(option);
  });
  currencySelect.appendChild(supportedGroup);
}

function getCurrencyByCode(code) {
  return (
    customCurrencies.find((currency) => currency.code === code) ||
    supportedCurrencies.find((currency) => currency.code === code) ||
    null
  );
}

function setCurrency(code) {
  const currency = getCurrencyByCode(code);
  if (!currency) {
    currentCurrency = null;
    currencySelect.value = "";
    removeStorageItem(STORAGE_KEYS.currency);
    updateUIForCurrency(null);
    return;
  }

  currentCurrency = currency;
  currencySelect.value = currency.code;
  setStorageItem(STORAGE_KEYS.currency, currency.code);
  updateUIForCurrency(currency);
}

function getAmountPlaceholderFromRate(rate) {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return DEFAULT_AMOUNT_PLACEHOLDER;
  }
  return amountPlaceholderFormatter.format(USD_PLACEHOLDER_TARGET / numericRate);
}

function syncAmountPlaceholder() {
  if (!currentCurrency) {
    amountInput.placeholder = DEFAULT_AMOUNT_PLACEHOLDER;
    return;
  }

  const manualRate = getValidManualRate();
  if (manualRate) {
    amountInput.placeholder = getAmountPlaceholderFromRate(manualRate);
    return;
  }

  const cached = getCachedRate(currentCurrency.code);
  amountInput.placeholder = getAmountPlaceholderFromRate(cached ? cached.rate : null);
}

function setManualPanelOpen(isOpen) {
  if (manualPanel) {
    manualPanel.open = isOpen;
  }
  if (manualPanelContent) {
    manualPanelContent.hidden = !isOpen;
  }
  if (manualToggleBtn) {
    manualToggleBtn.textContent = isOpen ? "–" : "+";
    manualToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

function getManualRateState() {
  const manualRaw = manualRateInput.value.trim();
  if (!manualRaw) {
    return {
      raw: "",
      hasValue: false,
      isValid: false,
      value: null,
    };
  }

  const manualParsed = parseAmount(manualRaw);
  if (manualParsed.error || manualParsed.value <= 0) {
    return {
      raw: manualRaw,
      hasValue: true,
      isValid: false,
      value: null,
    };
  }

  return {
    raw: manualRaw,
    hasValue: true,
    isValid: true,
    value: manualParsed.value,
  };
}

function updateManualPanelHint() {
  if (!manualPanelHint) {
    return;
  }

  if (!currentCurrency) {
    manualPanelHint.textContent = "Choose a currency first to enter a manual rate.";
    return;
  }

  const manualState = getManualRateState();
  if (!manualState.hasValue) {
    manualPanelHint.textContent = "Uses live rate by default. Enter a manual rate to override it.";
    return;
  }

  if (!manualState.isValid) {
    manualPanelHint.textContent = "Enter a rate greater than 0 to override the live rate.";
    return;
  }

  manualPanelHint.textContent = `Using manual rate: 1 ${currentCurrency.code} = ${formatRatePlaceholder(
    manualState.value,
  )} USD`;
}

function updateUIForCurrency(currency) {
  if (!currency) {
    amountLabel.textContent = "Amount in currency";
    amountInput.placeholder = DEFAULT_AMOUNT_PLACEHOLDER;
    amountInput.value = "";
    amountHint.textContent = "";
    amountError.textContent = "";
    manualCode.textContent = "XXX";
    manualRateInput.value = "";
    manualRateInput.placeholder = "";
    manualRateInput.disabled = true;
    manualRateError.textContent = "";
    setManualPanelOpen(false);
    resetConversionOutput();
    clearStatus();
    updateManualPanelHint();
    updateBills();
    return;
  }

  amountLabel.textContent = `Amount in ${currency.code}`;
  syncAmountPlaceholder();
  amountHint.textContent = "";
  amountError.textContent = "";
  manualCode.textContent = currency.code;
  manualRateInput.value = "";
  manualRateInput.placeholder = "";
  manualRateInput.disabled = false;
  manualRateError.textContent = "";
  setManualPanelOpen(false);
  resetConversionOutput();
  clearStatus();
  updateManualPanelHint();
  updateBills();
}

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

function getCache() {
  const raw = getStorageItem(STORAGE_KEYS.cache);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function setCache(cache) {
  setStorageItem(STORAGE_KEYS.cache, JSON.stringify(cache));
}

function saveRateToCache(code, rate) {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return;
  }
  const cache = getCache();
  cache[code] = {
    rate: numericRate,
    fetchedAt: new Date().toISOString(),
  };
  setCache(cache);
}

function getCachedRate(code) {
  const cache = getCache();
  const entry = cache[code];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const rate = Number(entry.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return {
    rate,
    fetchedAt: entry.fetchedAt || null,
  };
}

function getHistory() {
  const raw = getStorageItem(STORAGE_KEYS.history);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((event) => {
        if (!event || typeof event !== "object") return null;
        const code = normalizeCode(String(event.code || ""));
        const rate = Number(event.rate);
        if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(rate) || rate <= 0) {
          return null;
        }
        const source = String(event.source || "Rate update").trim() || "Rate update";
        const timestamp = typeof event.timestamp === "string" ? event.timestamp : "";
        return { code, rate, source, timestamp };
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function setHistory(history) {
  setStorageItem(STORAGE_KEYS.history, JSON.stringify(history));
}

function clearHistory() {
  setHistory([]);
  renderHistory([]);
}

function addHistoryEvent({ code, rate, source }) {
  const history = getHistory();
  const previousForCode = history.find((event) => event.code === code);
  if (previousForCode && Number(previousForCode.rate) === Number(rate)) {
    return;
  }
  history.unshift({
    code,
    rate: Number(rate),
    source: source || "Rate update",
    timestamp: new Date().toISOString(),
  });
  const trimmed = history.slice(0, 15);
  setHistory(trimmed);
  renderHistory(trimmed);
}

function renderHistory(history = getHistory()) {
  historyList.innerHTML = "";
  if (!history.length) {
    const empty = document.createElement("li");
    empty.textContent = "No rate history yet.";
    historyList.appendChild(empty);
    if (clearHistoryBtn) {
      clearHistoryBtn.disabled = true;
    }
    return;
  }
  if (clearHistoryBtn) {
    clearHistoryBtn.disabled = false;
  }
  history.forEach((event) => {
    const item = document.createElement("li");
    const time = formatHistoryTimestamp(event.timestamp);
    const source = event.source ? String(event.source) : "Rate update";
    item.textContent = `${time} — 1 USD = ${formatHistoryRate(event.rate)} ${event.code} (${source})`;
    historyList.appendChild(item);
  });
}

function getCustomCurrencies() {
  const raw = getStorageItem(STORAGE_KEYS.customCurrencies);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const code = normalizeCode(String(item.code || ""));
        const name = String(item.name || "").trim();
        const symbol = String(item.symbol || "").trim();
        const example = String(item.example || "700.00").trim() || "700.00";
        if (!/^[A-Z]{3}$/.test(code) || !name) return null;
        return { code, name, symbol: symbol || code, example };
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function setCustomCurrencies(list) {
  if (!list.length) {
    removeStorageItem(STORAGE_KEYS.customCurrencies);
    return;
  }
  setStorageItem(STORAGE_KEYS.customCurrencies, JSON.stringify(list));
}

function getSupportedCodes() {
  const raw = getStorageItem(STORAGE_KEYS.supportedCodes);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((code) => normalizeCode(String(code || "")))
      .filter((code) => /^[A-Z]{3}$/.test(code));
  } catch (error) {
    return [];
  }
}

function setSupportedCodes(codes) {
  if (!codes.length) {
    removeStorageItem(STORAGE_KEYS.supportedCodes);
    return;
  }
  setStorageItem(STORAGE_KEYS.supportedCodes, JSON.stringify(codes));
}

function updateSupportedCurrencies(codes) {
  supportedCurrencies = codes.map(buildCurrency);
  renderCustomCurrencies();
  if (currentCurrency && !getCurrencyByCode(currentCurrency.code)) {
    setCurrency("");
  }
}

async function loadSupportedCurrencies() {
  try {
    const data = await fetchJson("https://open.er-api.com/v6/latest/USD");
    if (!data || data.result !== "success" || !data.rates) {
      throw new Error("Currency data missing.");
    }
    const codes = Object.keys(data.rates)
      .map((code) => normalizeCode(code))
      .filter((code) => /^[A-Z]{3}$/.test(code) && code !== "USD");
    if (!codes.length) return;
    setSupportedCodes(codes);
    updateSupportedCurrencies(codes);
  } catch (error) {
    return;
  }
}

function renderCustomCurrencies() {
  populateCurrencies();
  if (currentCurrency) {
    currencySelect.value = currentCurrency.code;
  }
}

async function addCustomCurrency() {
  if (!customCodeInput || !customNameInput || !customError) return;
  customError.textContent = "";
  const code = normalizeCode(customCodeInput.value);
  const name = customNameInput.value.trim();
  const symbol = customSymbolInput ? customSymbolInput.value.trim() : "";

  if (!code || !/^[A-Z]{3}$/.test(code)) {
    customError.textContent = "Use a 3-letter currency code (A-Z only).";
    return;
  }
  if (!name) {
    customError.textContent = "Enter a currency name.";
    return;
  }
  if (supportedCurrencies.some((currency) => currency.code === code)) {
    customError.textContent = "That code is already a supported currency.";
    return;
  }
  if (customCurrencies.some((currency) => currency.code === code)) {
    customError.textContent = "That custom currency already exists.";
    return;
  }

  const newCurrency = {
    code,
    name,
    symbol: symbol || code,
  };
  customCurrencies = [newCurrency, ...customCurrencies];
  setCustomCurrencies(customCurrencies);
  renderCustomCurrencies();
  setCurrency(code);
  customCodeInput.value = "";
  customNameInput.value = "";
  if (customSymbolInput) customSymbolInput.value = "";
  amountError.textContent = "";
  amountInput.value = "";
  clearStatus();
  await refreshManualRate(code);
  updateBills();
}

function clearCustomCurrencies() {
  customCurrencies = [];
  setCustomCurrencies(customCurrencies);
  renderCustomCurrencies();
  if (currentCurrency && !getCurrencyByCode(currentCurrency.code)) {
    setCurrency("");
  }
  amountError.textContent = "";
}

function parseAmount(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter an amount to convert." };
  }

  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d*\.?\d+$/.test(normalized)) {
    return { error: "Use numbers only (one decimal point allowed)." };
  }

  const value = Number(normalized);
  if (Number.isNaN(value)) {
    return { error: "Enter a valid number." };
  }

  if (value < 0) {
    return { error: "Negative amounts are not allowed." };
  }

  const display = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  return { value, display };
}

function formatRate(rate) {
  return Number(rate).toFixed(6);
}

function getUsdToCurrencyRate(rate) {
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return null;
  }
  return 1 / numericRate;
}

function formatHistoryRate(rate) {
  const usdToCurrencyRate = getUsdToCurrencyRate(rate);
  return usdToCurrencyRate ? formatRate(usdToCurrencyRate) : "--";
}

function formatHistoryTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRatePlaceholder(rate) {
  const value = Number(rate);
  if (Number.isNaN(value)) return "";
  if (value === 0) return "0.0000";
  if (value < 0.01) {
    return value.toFixed(6);
  }
  return value.toFixed(4);
}

function formatUsd(value) {
  return Number(value).toFixed(2);
}

function resetConversionOutput() {
  usdOutput.textContent = "USD --";
}

function formatForeignAmount(amount, currency) {
  const symbol = currency && currency.symbol ? currency.symbol : currency.code;
  const needsSpace = /[A-Za-z]$/.test(symbol);
  return `${symbol}${needsSpace ? " " : ""}${amount}`;
}

function setLiveRatePlaceholder(rate) {
  manualRateInput.placeholder = rate ? formatRatePlaceholder(rate) : "";
}

function hasCurrentRefreshTarget(code, requestId) {
  return Boolean(
    currentCurrency && currentCurrency.code === code && requestId === latestRefreshRequestId,
  );
}

async function fetchJson(url) {
  const supportsAbort = typeof AbortController !== "undefined";
  const controller = supportsAbort ? new AbortController() : null;
  const timeoutId =
    controller &&
    setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      throw new Error("Request failed.");
    }
    return response.json();
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getValidManualRate() {
  const manualState = getManualRateState();
  return manualState.isValid ? manualState.value : null;
}

function getLiveRateForBills(code) {
  const cached = getCachedRate(code);
  return cached ? cached.rate : null;
}

function updateBills() {
  if (!currentCurrency) {
    billsList.innerHTML = "";
    billsMessage.textContent = "Select a currency to view bills.";
    return;
  }

  const banknotes = BANKNOTES[currentCurrency.code];
  if (!banknotes || banknotes.length === 0) {
    billsList.innerHTML = "";
    billsMessage.textContent = "Banknote denominations are not available.";
    return;
  }

  const manualState = getManualRateState();
  if (manualState.hasValue && !manualState.isValid) {
    billsList.innerHTML = "";
    billsMessage.textContent = "Enter a valid manual rate to preview banknotes.";
    return;
  }

  let rate = manualState.isValid ? manualState.value : null;
  if (!rate) {
    rate = getLiveRateForBills(currentCurrency.code);
  }

  if (!rate) {
    billsList.innerHTML = "";
    billsMessage.textContent = "No valid rate available.";
    return;
  }

  billsMessage.textContent = "";
  billsList.innerHTML = "";
  banknotes.forEach((denomination) => {
    const row = document.createElement("li");
    const foreign = formatForeignAmount(denomination, currentCurrency);
    const usdValue = formatUsd(denomination * rate);
    row.textContent = `${foreign} equals USD ${usdValue}`;
    billsList.appendChild(row);
  });
}

function clearStatus() {
  retryBtn.hidden = true;
  statusMessage.textContent = "";
  statusMessage.removeAttribute("data-tone");
}

function setStatus(message, tone = "warning") {
  statusMessage.textContent = message;
  statusMessage.setAttribute("data-tone", tone === "error" ? "error" : "warning");
}

async function fetchLiveRate(code) {
  const data = await fetchJson(`https://open.er-api.com/v6/latest/${code}`);
  if (!data || data.result !== "success" || !data.rates || !data.rates.USD) {
    const errorType = data && data["error-type"] ? data["error-type"] : "Rate data missing.";
    throw new Error(errorType);
  }
  const rate = Number(data.rates.USD);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid rate.");
  }
  return rate;
}

async function refreshManualRate(code) {
  if (!code) return;
  const requestId = ++latestRefreshRequestId;
  if (!navigator.onLine) {
    const cached = getCachedRate(code);
    if (!hasCurrentRefreshTarget(code, requestId)) {
      return;
    }
    if (cached) {
      setLiveRatePlaceholder(cached.rate);
      syncAmountPlaceholder();
      addHistoryEvent({ code, rate: cached.rate, source: "Cached (offline)" });
      setStatus("Offline: using last cached rate.", "warning");
      updateBills();
    } else {
      manualRateInput.value = "";
      manualRateError.textContent = "";
      setLiveRatePlaceholder(null);
      syncAmountPlaceholder();
      updateManualPanelHint();
      setStatus("Offline: connect to refresh the rate.", "error");
      updateBills();
    }
    return;
  }

  try {
    const rate = await fetchLiveRate(code);
    if (!hasCurrentRefreshTarget(code, requestId)) {
      return;
    }
    saveRateToCache(code, rate);
    setLiveRatePlaceholder(rate);
    syncAmountPlaceholder();
    addHistoryEvent({ code, rate, source: "Live refresh" });
    clearStatus();
    updateBills();
  } catch (error) {
    const cached = getCachedRate(code);
    if (!hasCurrentRefreshTarget(code, requestId)) {
      return;
    }
    if (cached) {
      setLiveRatePlaceholder(cached.rate);
      syncAmountPlaceholder();
      addHistoryEvent({ code, rate: cached.rate, source: "Cached fallback" });
      setStatus("Live rate unavailable. Using cached rate.", "warning");
      updateBills();
    } else {
      manualRateInput.value = "";
      manualRateError.textContent = "";
      setLiveRatePlaceholder(null);
      syncAmountPlaceholder();
      updateManualPanelHint();
      setStatus("Could not retrieve the live rate.", "error");
      updateBills();
    }
  }
}

function updateResult({ amountDisplay, rate }) {
  const usdValue = formatUsd(amountDisplay.value * rate);
  usdOutput.textContent = `USD ${usdValue}`;
  clearStatus();
}

async function handleConvert() {
  clearStatus();
  amountError.textContent = "";
  manualRateError.textContent = "";

  if (!currentCurrency) {
    setStatus("Choose a currency from the dropdown above.", "warning");
    return;
  }

  const amountDisplay = parseAmount(amountInput.value);
  if (amountDisplay.error) {
    amountError.textContent = amountDisplay.error;
    return;
  }

  const manualState = getManualRateState();
  if (manualState.hasValue) {
    if (!manualState.isValid) {
      setManualPanelOpen(true);
      manualRateError.textContent = "Enter a valid manual rate greater than 0.";
      updateManualPanelHint();
      return;
    }
    updateResult({
      amountDisplay,
      rate: manualState.value,
    });
    updateBills();
    return;
  }

  const conversionCode = currentCurrency.code;
  const cached = getCachedRate(conversionCode);
  if (!navigator.onLine) {
    if (cached) {
      updateResult({
        amountDisplay,
        rate: cached.rate,
      });
      return;
    }
    setStatus("Offline and no cached rate available. Connect to the internet and retry.", "error");
    retryBtn.hidden = false;
    return;
  }

  try {
    convertBtn.disabled = true;
    convertBtn.textContent = "Converting...";
    const rate = await fetchLiveRate(conversionCode);
    if (!currentCurrency || currentCurrency.code !== conversionCode) {
      return;
    }
    saveRateToCache(conversionCode, rate);
    addHistoryEvent({ code: conversionCode, rate, source: "Live convert" });
    updateResult({
      amountDisplay,
      rate,
    });
    setLiveRatePlaceholder(rate);
    syncAmountPlaceholder();
    updateBills();
  } catch (error) {
    if (!currentCurrency || currentCurrency.code !== conversionCode) {
      return;
    }
    if (cached) {
      addHistoryEvent({
        code: conversionCode,
        rate: cached.rate,
        source: "Cached convert",
      });
      updateResult({
        amountDisplay,
        rate: cached.rate,
      });
      setLiveRatePlaceholder(cached.rate);
      syncAmountPlaceholder();
      updateBills();
    } else {
      syncAmountPlaceholder();
      setStatus("Could not retrieve the live rate. Please try again.", "error");
      retryBtn.hidden = false;
    }
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert";
  }
}

currencySelect.addEventListener("change", async (event) => {
  const code = event.target.value;
  if (code === "__clear_custom__") {
    clearCustomCurrencies();
    currencySelect.value = "";
    updateBills();
    return;
  }
  setCurrency(code);
  amountError.textContent = "";
  manualRateError.textContent = "";
  amountInput.value = "";
  clearStatus();
  await refreshManualRate(code);
  updateBills();
});

convertBtn.addEventListener("click", handleConvert);
retryBtn.addEventListener("click", handleConvert);
amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleConvert();
  }
});

amountInput.addEventListener("input", () => {
  amountError.textContent = "";
  clearStatus();
  if (!amountInput.value.trim()) {
    resetConversionOutput();
  }
});

manualRateInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleConvert();
  }
});

manualRateInput.addEventListener("input", () => {
  manualRateError.textContent = "";
  clearStatus();
  syncAmountPlaceholder();
  updateManualPanelHint();
  updateBills();
});

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", clearHistory);
}

if (addCustomBtn) {
  addCustomBtn.addEventListener("click", addCustomCurrency);
}

if (manualToggleBtn) {
  manualToggleBtn.addEventListener("click", () => {
    setManualPanelOpen(!(manualPanel && manualPanel.open));
  });
}

if (customCodeInput && customNameInput) {
  customCodeInput.addEventListener("input", () => {
    const sanitized = customCodeInput.value.toUpperCase().replace(/[^A-Z]/g, "");
    customCodeInput.value = sanitized.slice(0, 3);
  });
  [customCodeInput, customNameInput, customSymbolInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        addCustomCurrency();
      }
    });
  });
}

function registerServiceWorker() {
  if (
    typeof window === "undefined" ||
    typeof location === "undefined" ||
    !navigator.serviceWorker
  ) {
    return;
  }

  const canRegister =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!canRegister) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

async function init() {
  customCurrencies = getCustomCurrencies();
  const cachedCodes = getSupportedCodes();
  if (cachedCodes.length) {
    updateSupportedCurrencies(cachedCodes);
  } else {
    supportedCurrencies = [...DEFAULT_CURRENCIES];
    renderCustomCurrencies();
  }
  const stored = getStorageItem(STORAGE_KEYS.currency);
  if (stored && getCurrencyByCode(stored)) {
    setCurrency(stored);
  } else {
    setCurrency("");
  }
  amountInput.value = "";
  resetConversionOutput();
  renderHistory();
  updateManualPanelHint();
  updateBills();
  const startupTasks = [loadSupportedCurrencies()];
  if (currentCurrency) {
    startupTasks.unshift(refreshManualRate(currentCurrency.code));
  }
  await Promise.allSettled(startupTasks);
  registerServiceWorker();
}

void init();
