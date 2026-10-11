importScripts("./vanta/vanta.sw.js");
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (self.$vantaController?.shouldRoute?.(event)) {
    event.respondWith(self.$vantaController.route(event));
  }
});
