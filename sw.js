
function getAsset(path) {
  if (path === "404.html") return new URL("./index.html", self.location.href).href;
  return new URL(path, self.location.href).href;
}

importScripts(getAsset("vanta/vanta.sw.js"));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

function isIndexedDbFailure(error) {
  const message = String(error?.message ?? error ?? "");
  return /NotFound/i.test(message) &&
    /(IDB|IndexedDB|IDBDatabase|IDBObjectStore|transaction|object store)/i.test(message) &&
    !/cache/i.test(message);
}

async function resetBrokenWorker() {
  try {
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all((await caches.keys()).map(name => caches.delete(name)));
    for (const client of clients) client.navigate(client.url);
  } catch (error) {
    console.error("[Vanta] Failed to reset service worker:", error);
  }
}

self.addEventListener("error", event => {
  if (isIndexedDbFailure(event.error)) {
    event.preventDefault?.();
    void resetBrokenWorker();
  }
});

self.addEventListener("unhandledrejection", event => {
  if (isIndexedDbFailure(event.reason)) {
    event.preventDefault?.();
    void resetBrokenWorker();
  }
});

self.addEventListener("fetch", event => {
  event.respondWith((async () => {
    try {
      if (self.$vantaController?.shouldRoute?.(event)) {
        return await self.$vantaController.route(event);
      }
    } catch (error) {
      if (isIndexedDbFailure(error)) void resetBrokenWorker();
      console.error("[Vanta] Proxy request failed:", error);
      return new Response("Proxy request failed: " + error.message, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    try {
      const response = await fetch(event.request);
      if (response.status === 404 && new URL(event.request.url).origin === self.location.origin) {
        const fallback = await fetch(getAsset("404.html"));
        return new Response(await fallback.text(), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return response;
    } catch (e) {
      return new Response("Network error", { status: 502 });
    }
  })());
});
