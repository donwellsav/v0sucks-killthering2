import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // TEMPORARY: force-replace zombie SW from backend hardening deploy.
  // The old SW had custom ktr-* CacheFirst rules and skipWaiting:false,
  // so it never yielded to the reverted SW. This forces immediate activation.
  // TODO: revert to skipWaiting:false after one production deploy confirms fix.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Purge stale ktr-* caches left by the backend hardening SW.
// TODO: remove this listener after one production deploy confirms fix.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("ktr-"))
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Allow the app to trigger SW activation when the user explicitly accepts an update
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
