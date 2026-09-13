const CACHE = "t4c2-1.7.0";
const ASSETS = [
  "./",
  "./index.html",
  "./t4c2_web.html",
  "./docs.html",
  "./fiche.html",
  "./t4c2.js",
  "./brand.css",
  "./home.css",
  "./home.js",
  "./constellation.js",
  "./sparkles.js",
  "./favicon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
