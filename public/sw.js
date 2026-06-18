/* Oriex service worker — offline app shell.
   Strategy:
   - navigations (HTML): network-first, fall back to cached app when offline
   - Google Fonts: stale-while-revalidate (works offline after first load)
   - same-origin static assets (manifest, scripts, images, fonts): stale-while-revalidate
   - everything else (Firestore/Firebase/Google APIs): not intercepted -> normal network
*/
/* VERSION is stamped from package.json at build time (see vite.config.js
   stamp-sw-version plugin). Bumping the app version now ALWAYS changes the
   shell cache name, so activate() purges the old cached index.html + chunks
   and the new build actually reaches installed PWAs. Dev (no build) keeps the
   literal placeholder, which is fine — the SW only registers in PROD. */
var VERSION = '__APP_VERSION__';
var SHELL = 'oriex-shell-' + VERSION;
var FONTS = 'oriex-fonts-v1';
/* Keep the install precache SMALL — it is re-fetched (cache:'no-cache') on every version
   bump. Dropped: three.min.js (608 KB — deferred at runtime, only the hamster room needs
   it; still cached on-demand via the same-origin SWR branch below), and the root
   manifest/icon-180 (the built page references the HASHED ./assets/* copies, also SWR-
   cached). The entry/login chunks are likewise covered by SWR after first fetch. */
var SHELL_URLS = ['./', './index.html', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return Promise.all(SHELL_URLS.map(function (u) {
        return fetch(u, { cache: 'no-cache' })
          .then(function (r) { if (r && r.ok) return c.put(u, r.clone()); })
          .catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== FONTS) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function swr(cacheName, req) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) c.put(req, res.clone());
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    });
  });
}

function isStaticAssetRequest(req, url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.indexOf('/__/') !== -1) return false;
  if (req.destination && ['script', 'style', 'image', 'font', 'manifest', 'worker'].indexOf(req.destination) !== -1) {
    return true;
  }
  return /\.(?:html|css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|json|webmanifest|woff2?|ttf|otf)$/i.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (_) { return; }

  // App navigations: network-first, but DON'T let a slow/flaky mobile network stall
  // startup — race the network against a ~2.5s timer that serves the already-warm cached
  // shell. The network still wins when it's responsive (fresh HTML), and its result still
  // updates the cache. Offline / network error falls back to the cached shell as before.
  if (req.mode === 'navigate') {
    e.respondWith(
      new Promise(function (resolve) {
        var done = false;
        function settle(r) { if (!done && r) { done = true; resolve(r); } }
        function cachedShell() {
          return caches.match('./').then(function (r) { return r || caches.match('./index.html'); });
        }
        var timer = setTimeout(function () { cachedShell().then(settle); }, 2500);
        fetch(req).then(function (res) {
          clearTimeout(timer);
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put('./', copy); });
          }
          // Prefer the (fresh) network response; if it somehow isn't usable, fall back.
          if (res) { done = true; resolve(res); } else cachedShell().then(settle);
        }).catch(function () {
          clearTimeout(timer);
          cachedShell().then(function (r) { done = true; resolve(r); });
        });
      })
    );
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    e.respondWith(swr(FONTS, req));
    return;
  }

  // Same-origin static assets only: stale-while-revalidate
  if (isStaticAssetRequest(req, url)) {
    e.respondWith(swr(SHELL, req));
    return;
  }

  // else: Firestore / Firebase / other APIs -> let the network handle it
});
