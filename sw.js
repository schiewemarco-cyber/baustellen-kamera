/* Baustellen-Kamera – Offline-Speicher
   Die App startet damit auch ohne Netz. Bei Netz wird immer die neueste
   Version geladen. Nach einer Änderung an dieser Datei die Nummer erhöhen. */
const CACHE = "baustellen-kamera-v5";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.27.0/lib/msal-browser.min.js",
  "https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js"
];
/* Nie zwischenspeichern: Anmeldung, Upload, Karten, Adresssuche */
const NEVER = /login\.microsoftonline|graph\.microsoft|sharepoint|tile\.openstreetmap|nominatim|maps\.googleapis/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(CORE.map(u => c.add(u).catch(() => {})))
  ));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NEVER.test(url.host)) return;

  /* Seite selbst: erst Netz (neueste Version), sonst gespeicherte Version */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Eigene Dateien, Bibliotheken, Schriften: erst Speicher, sonst Netz */
  if (url.origin === location.origin || /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
