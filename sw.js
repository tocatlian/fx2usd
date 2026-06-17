// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paul Tocatlian

const APP_VERSION = "0.1.0";
const CACHE_NAME = `fx2usd-app-v${APP_VERSION}`;
const STATIC_ASSETS = [
  "./",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-512.png",
  "docs/screenshot.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          const cacheWrite = caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          if (event.waitUntil) {
            event.waitUntil(cacheWrite);
          }
        }
        return networkResponse;
      });
    }),
  );
});
