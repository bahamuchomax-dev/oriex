import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
);

// Stamp the service worker's cache VERSION from package.json at build time, so
// every version bump changes the SHELL cache name. Without this the SW VERSION
// went stale and activate() never purged the old cached index.html → installed
// PWAs kept serving an old build (new lazy chunks were never reached).
function stampServiceWorkerVersion() {
  return {
    name: "oriex-stamp-sw-version",
    apply: "build",
    closeBundle() {
      const swPath = fileURLToPath(new URL("./dist/sw.js", import.meta.url));
      if (!existsSync(swPath)) return;
      const src = readFileSync(swPath, "utf8");
      const stamped = src.replace(/__APP_VERSION__/g, `v${pkg.version}`);
      if (stamped !== src) writeFileSync(swPath, stamped);
    },
  };
}

// Inject a low-priority <link rel="prefetch"> for the big legacy app bundle so the
// browser downloads it IN THE BACKGROUND while the user is on the login screen
// (the bundle is otherwise only fetched AFTER login → a long wait). Prefetch is low
// priority, so it never competes with the login's own resources; on repeat visits it
// just hits the cache. Permanent first-load speedup with no runtime/code change.
function prefetchLegacyBundle() {
  return {
    name: "oriex-prefetch-legacy-bundle",
    apply: "build",
    transformIndexHtml(html, ctx) {
      try {
        if (!ctx || !ctx.bundle) return html;
        const file = Object.keys(ctx.bundle).find((f) => /oriex-app\.bundle-.*\.js$/.test(f));
        if (!file) return html;
        return {
          html,
          tags: [{ tag: "link", attrs: { rel: "prefetch", as: "script", href: "./" + file }, injectTo: "head" }],
        };
      } catch {
        return html;
      }
    },
  };
}

// `base: "./"` keeps asset URLs relative so the build also works when
// served from a GitHub Pages project subpath (matches manifest/sw "./").
export default defineConfig({
  base: "./",
  plugins: [react(), stampServiceWorkerVersion(), prefetchLegacyBundle()],
  build: {
    target: "es2019",
    // The legacy app bundle is intentionally large until screens are
    // migrated out of it; silence the size warning for now.
    chunkSizeWarningLimit: 4096,
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    // Rules Emulator tests are run separately via `npm run test:rules`
    // (they need the Firebase emulator); keep them out of the normal run.
    exclude: [...configDefaults.exclude, "**/*.emulator.test.js"],
  },
});
