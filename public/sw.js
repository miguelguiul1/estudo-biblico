const CACHE = "lectio-v5";
const FILES = ["./","index.html","styles.css","app.js","conta.js","fotos.js","vendor/supabase.js","manifest.webmanifest","data/encheivos.json","data/quiz.json","icons/icon.svg"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const mesmaOrigem = u.origin === location.origin, fonte = FONT_HOSTS.includes(u.hostname);
  if (!mesmaOrigem && !fonte) return;
  // dados e páginas: rede primeiro (conteúdo novo aparece), cache se estiver offline; fontes e estáticos: cache primeiro
  const redePrimeiro = mesmaOrigem && (u.pathname.startsWith("/data/") || u.pathname === "/" || u.pathname.endsWith(".html") || u.pathname.endsWith(".js") || u.pathname.endsWith(".css"));
  const guarda = res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(e.request, c)); } return res; };
  e.respondWith(redePrimeiro
    ? fetch(e.request).then(guarda).catch(() => caches.match(e.request))
    : caches.match(e.request).then(r => r || fetch(e.request).then(guarda)));
});
