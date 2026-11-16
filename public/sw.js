const CACHE_NAME = "fitcore-v2";
const INSTALL_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

async function saveShell(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/html")) {
    throw new Error("FitCore shell is unavailable");
  }

  const html = await response.clone().text();
  const assets = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)\b/g) ?? [])];
  if (!assets.some((asset) => asset.endsWith(".js"))) {
    throw new Error("FitCore shell has no application bundle");
  }

  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    assets.map(async (asset) => {
      if (!(await cache.match(asset))) await cache.add(asset);
    }),
  );
  // Replace saved HTML only after its matching assets are available.
  await cache.put("/", response);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(INSTALL_ASSETS);
      await saveShell(await fetch("/", { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("fitcore-v") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/") {
    const network = fetch(request);
    if (!url.search) {
      event.waitUntil(network.then((response) => saveShell(response.clone())).catch(() => {}));
    }
    event.respondWith(
      network.catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("/")) ?? Response.error();
      }),
    );
    return;
  }

  // Restrict Cache Storage to public build files. Server functions stay network-only.
  if (url.pathname.startsWith("/assets/") || INSTALL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ?? fetch(request);
      })(),
    );
  }
});
