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

// Push delivery foundations only. No sender, subscription creation or schedule is activated.
const NOTIFICATION_COPY = {
  workout: { body: "Your workout reminder is ready. Open FitCore to review your plan.", section: "training" },
  weighIn: { body: "Your weigh-in reminder is ready. Open FitCore to log your measurement.", section: "home" },
  lunch: { body: "Your meal reminder is ready. Open FitCore to review your nutrition.", section: "nutrition" },
};

function validPushReminder(value) {
  const now = Date.now();
  return value && value.version === 1 && typeof value.id === "string"
    && /^[a-zA-Z0-9:_-]{1,100}$/.test(value.id) && Object.hasOwn(NOTIFICATION_COPY, value.kind)
    && Number.isFinite(value.issuedAt) && Number.isFinite(value.expiresAt)
    && value.issuedAt <= now + 300000 && value.expiresAt > now
    && value.expiresAt > value.issuedAt && value.expiresAt - value.issuedAt <= 86400000;
}

function notificationReceipt(id, expiresAt, remove = false) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("fitcore-push-receipts", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("receipts", { keyPath: "id" });
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error("Notification receipt storage is blocked"));
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("receipts", "readwrite");
      const store = tx.objectStore("receipts");
      let accepted = false;
      if (remove) store.delete(id);
      else {
        const request = store.getAll();
        request.onsuccess = () => {
          const rows = request.result;
          if (rows.some(row => row.id === id && row.expiresAt > Date.now())) return;
          const retained = rows.filter(row => row.expiresAt > Date.now() && row.id !== id).sort((a, b) => b.expiresAt - a.expiresAt).slice(0, 255);
          const keep = new Set(retained.map(row => row.id));
          for (const row of rows) if (!keep.has(row.id)) store.delete(row.id);
          store.put({ id, expiresAt });
          accepted = true;
        };
      }
      tx.oncomplete = () => { db.close(); resolve(accepted); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Notification receipt could not be saved")); };
    };
  });
}

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    if (!validPushReminder(payload) || self.Notification?.permission !== "granted") return;
    // Atomic browser receipt prevents concurrent/replayed IDs (bounded to 256 unexpired IDs).
    if (!await notificationReceipt(payload.id, payload.expiresAt)) return;
    const copy = NOTIFICATION_COPY[payload.kind];
    try {
      await self.registration.showNotification("FitCore reminder", {
        body: copy.body, icon: "/icon-192.png", badge: "/icon-192.png",
        tag: `fitcore-reminder:${payload.id}`, data: { section: copy.section },
      });
    } catch (error) {
      await notificationReceipt(payload.id, payload.expiresAt, true);
      throw error;
    }
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const requested = event.notification.data?.section;
    const section = ["training", "nutrition", "home"].includes(requested) ? requested : "home";
    const windows = await self.clients.matchAll({ type: "window" });
    const existing = windows.find(client => {
      const url = new URL(client.url);
      return url.origin === self.location.origin && url.pathname === "/";
    });
    if (existing) {
      // Focus and message an existing app instead of navigating away from an unsaved draft.
      existing.postMessage({ type: "fitcore-notification-open", section });
      await existing.focus();
    } else await self.clients.openWindow(`/?notification=${section}`);
  })());
});
