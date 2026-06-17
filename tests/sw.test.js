const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PACKAGE = require("../package.json");
const SW_PATH = path.join(__dirname, "..", "sw.js");
const SW_SOURCE = fs.readFileSync(SW_PATH, "utf8");
const EXPECTED_CACHE_NAME = `fx2usd-app-v${PACKAGE.version}`;
const EXPECTED_STATIC_ASSETS = [
  "/",
  "/app.js",
  "/styles.css",
  "/manifest.webmanifest",
  "/favicon-16.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-512.png",
  "/docs/screenshot.jpg",
];

class FakeResponse {
  constructor(body, { ok = true, status = 200 } = {}) {
    this.body = body;
    this.ok = ok;
    this.status = status;
  }

  clone() {
    return new FakeResponse(this.body, {
      ok: this.ok,
      status: this.status,
    });
  }

  async text() {
    return this.body;
  }
}

function toAbsoluteUrl(requestOrUrl) {
  const rawUrl = typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url;
  return new URL(rawUrl, "https://example.test/").href;
}

function createCacheStorage() {
  const stores = new Map();

  function ensureStore(name) {
    if (!stores.has(name)) {
      stores.set(name, new Map());
    }
    return stores.get(name);
  }

  return {
    async delete(name) {
      return stores.delete(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async match(request) {
      const url = toAbsoluteUrl(request);
      for (const store of stores.values()) {
        if (store.has(url)) {
          return store.get(url).clone();
        }
      }
      return undefined;
    },
    async open(name) {
      const store = ensureStore(name);
      return {
        async addAll(assets) {
          assets.forEach((asset) => {
            store.set(toAbsoluteUrl(asset), new FakeResponse(`cached ${asset}`));
          });
        },
        async keys() {
          return [...store.keys()].map((url) => ({ url }));
        },
        async match(request) {
          const response = store.get(toAbsoluteUrl(request));
          return response ? response.clone() : undefined;
        },
        async put(request, response) {
          store.set(toAbsoluteUrl(request), response.clone());
        },
      };
    },
  };
}

function createServiceWorkerRuntime({ fetchImpl } = {}) {
  const listeners = {};
  const lifecycle = {
    claimed: false,
    skippedWaiting: false,
  };
  const caches = createCacheStorage();
  const self = {
    clients: {
      async claim() {
        lifecycle.claimed = true;
      },
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    location: {
      origin: "https://example.test",
    },
    async skipWaiting() {
      lifecycle.skippedWaiting = true;
    },
  };
  const context = {
    caches,
    fetch: fetchImpl || (async (request) => new FakeResponse(`network ${request.url || request}`)),
    Promise,
    self,
    URL,
  };

  vm.createContext(context);
  vm.runInContext(SW_SOURCE, context, { filename: SW_PATH });

  async function dispatchExtendableEvent(type) {
    const waitUntilPromises = [];
    listeners[type]({
      waitUntil(promise) {
        waitUntilPromises.push(Promise.resolve(promise));
      },
    });
    await Promise.all(waitUntilPromises);
  }

  async function dispatchFetch(request) {
    const waitUntilPromises = [];
    let responsePromise = null;
    listeners.fetch({
      request,
      respondWith(promise) {
        responsePromise = Promise.resolve(promise);
      },
      waitUntil(promise) {
        waitUntilPromises.push(Promise.resolve(promise));
      },
    });

    if (!responsePromise) {
      return undefined;
    }

    const response = await responsePromise;
    await Promise.all(waitUntilPromises);
    return response;
  }

  return {
    caches,
    dispatchExtendableEvent,
    dispatchFetch,
    lifecycle,
  };
}

test("install precaches the app shell and activates immediately", async () => {
  const runtime = createServiceWorkerRuntime();

  await runtime.dispatchExtendableEvent("install");

  assert.equal(runtime.lifecycle.skippedWaiting, true);
  assert.deepEqual(await runtime.caches.keys(), [EXPECTED_CACHE_NAME]);

  const cache = await runtime.caches.open(EXPECTED_CACHE_NAME);
  const cachedPaths = (await cache.keys()).map((request) => new URL(request.url).pathname).sort();
  assert.deepEqual(cachedPaths, [...EXPECTED_STATIC_ASSETS].sort());
});

test("activate deletes old app caches and claims clients", async () => {
  const runtime = createServiceWorkerRuntime();
  await (await runtime.caches.open("fx2usd-app-v0.0.0")).addAll(["app.js"]);
  await runtime.dispatchExtendableEvent("install");

  await runtime.dispatchExtendableEvent("activate");

  assert.equal(runtime.lifecycle.claimed, true);
  assert.deepEqual(await runtime.caches.keys(), [EXPECTED_CACHE_NAME]);
});

test("fetch ignores non-GET and cross-origin requests", async () => {
  let fetchCount = 0;
  const runtime = createServiceWorkerRuntime({
    fetchImpl: async () => {
      fetchCount += 1;
      return new FakeResponse("network");
    },
  });

  const postResponse = await runtime.dispatchFetch({
    method: "POST",
    mode: "cors",
    url: "https://example.test/app.js",
  });
  const crossOriginResponse = await runtime.dispatchFetch({
    method: "GET",
    mode: "cors",
    url: "https://open.er-api.com/v6/latest/EUR",
  });

  assert.equal(postResponse, undefined);
  assert.equal(crossOriginResponse, undefined);
  assert.equal(fetchCount, 0);
});

test("navigation fetch falls back to cached shell when offline", async () => {
  const runtime = createServiceWorkerRuntime({
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  await runtime.dispatchExtendableEvent("install");

  const response = await runtime.dispatchFetch({
    method: "GET",
    mode: "navigate",
    url: "https://example.test/some/deep/link",
  });

  assert.equal(await response.text(), "cached ./");
});

test("same-origin asset fetch caches successful network responses", async () => {
  const runtime = createServiceWorkerRuntime({
    fetchImpl: async (request) => new FakeResponse(`fresh ${request.url}`),
  });
  await runtime.dispatchExtendableEvent("install");

  const response = await runtime.dispatchFetch({
    method: "GET",
    mode: "cors",
    url: "https://example.test/extra.js",
  });
  const cachedResponse = await runtime.caches.match("https://example.test/extra.js");

  assert.equal(await response.text(), "fresh https://example.test/extra.js");
  assert.equal(await cachedResponse.text(), "fresh https://example.test/extra.js");
});
