/* in.torma service worker — hanya aset publik dan halaman publik yang di-cache. */
const CACHE = "intorma-v9";
const SHELL = [
  "/",
  "/?source=installed_app",
  "/order",
  "/kalkulator",
  "/lacak",
  "/offline.html",
  "/icon.svg?v=4",
  "/logos/qris.svg",
  "/logos/bca.svg",
  "/logos/bni.svg",
  "/logos/bri.svg",
  "/logos/permata.svg",
  "/manifest.webmanifest?v=4",
];

// Halaman yang memuat data pelanggan tidak boleh tersimpan di Cache Storage,
// termasuk setelah logout atau saat perangkat dipakai bersama.
const PUBLIC_PAGES = new Set([
  "/",
  "/order",
  "/kalkulator",
  "/lacak",
  "/offline.html",
  "/tentang",
  "/kontak",
  "/contact",
  "/privacy",
  "/faq",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("intorma-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-cache") {
    event.waitUntil(caches.delete(CACHE));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Jangan pernah cache area admin, portal, pembayaran, nota, atau endpoint API.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/portal") ||
    url.pathname.startsWith("/bayar") ||
    url.pathname.startsWith("/nota") ||
    url.pathname.startsWith("/masuk") ||
    /(^|\/)(lacak|nota|bayar)\/[^/]+/.test(url.pathname)
  ) {
    return;
  }

  if (req.mode === "navigate") {
    const cacheable = PUBLIC_PAGES.has(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          // Manifest start_url memakai query ?source=installed_app; abaikan
          // query saat mencari halaman yang sudah di-precache.
          const cached = cacheable ? await caches.match(req, { ignoreSearch: true }) : null;
          if (cached) return cached;
          const offline = await caches.match("/offline.html");
          return offline || Response.error();
        }),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|jpg|jpeg|webp|woff2|css|js|webmanifest)$/i.test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
