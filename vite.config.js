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
          // crossorigin matches the later `import("./legacy/oriex-app.bundle.js")` (a CORS
          // module fetch, since the entry <script type=module> is crossorigin) so the
          // prefetched bytes land in the SAME cache partition and are reused, not re-fetched.
          tags: [{ tag: "link", attrs: { rel: "modulepreload", crossorigin: "", href: "./" + file }, injectTo: "head" }],
        };
      } catch {
        return html;
      }
    },
  };
}

// Collapse the DEFAULT-login request waterfall. The login screen (modern Firebase Auth
// cutover) is reached via a RUNTIME `import("mountModernCutover.jsx")` in main.js, so the
// browser cannot discover the firebase/React/auth chunks until the entry chunk has
// downloaded, parsed and executed — one full serial hop of dead time before the long pole
// (firebase) even begins. This plugin walks the cutover chunk's transitive STATIC-import
// graph from the Rollup bundle (by facadeModuleId / glob — never a hardcoded hash, so it
// survives every rebuild) and injects <link rel="modulepreload"> for those JS chunks +
// <link rel="preload" as="style"> for their CSS into <head>. The browser's preload scanner
// then fetches them IN PARALLEL with the entry chunk. Vite's __vitePreload dedupes against
// these links, so nothing is fetched twice. Pure HTML hint; no runtime/code change.
function preloadDefaultLoginChunks() {
  return {
    name: "oriex-preload-default-login-chunks",
    apply: "build",
    transformIndexHtml(html, ctx) {
      try {
        if (!ctx || !ctx.bundle) return html;
        const bundle = ctx.bundle;
        // Find the cutover entry chunk durably (by source module, not hash).
        let start = null;
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type !== "chunk") continue;
          const fid = (chunk.facadeModuleId || "").replace(/\\/g, "/");
          if (fid.endsWith("src/features/auth/mountModernCutover.jsx")) {
            start = fileName;
            break;
          }
        }
        if (!start) {
          start = Object.keys(bundle).find((f) => /(^|\/)mountModernCutover-[^/]*\.js$/.test(f)) || null;
        }
        if (!start) return html;
        // BFS over transitive STATIC imports; collect JS chunks + their imported CSS.
        const jsFiles = new Set();
        const cssFiles = new Set();
        const seen = new Set();
        const queue = [start];
        while (queue.length) {
          const name = queue.shift();
          if (seen.has(name)) continue;
          seen.add(name);
          const chunk = bundle[name];
          if (!chunk || chunk.type !== "chunk") continue;
          // Traverse through every chunk (so shared deps aren't missed)...
          for (const imp of chunk.imports || []) queue.push(imp);
          // ...but never emit a hint for the entry chunk itself: it's already the
          // <script type=module> and its CSS is already the blocking <link> in <head>.
          if (chunk.isEntry) continue;
          jsFiles.add(name);
          for (const css of (chunk.viteMetadata && chunk.viteMetadata.importedCss) || []) cssFiles.add(css);
        }
        // Order JS largest-first so the long pole (firebase) gets a socket earliest.
        const ordered = [...jsFiles].sort(
          (a, b) => (bundle[b].code ? bundle[b].code.length : 0) - (bundle[a].code ? bundle[a].code.length : 0),
        );
        const tags = [];
        for (const f of ordered) {
          tags.push({ tag: "link", attrs: { rel: "modulepreload", crossorigin: "", href: "./" + f }, injectTo: "head" });
        }
        for (const f of cssFiles) {
          tags.push({ tag: "link", attrs: { rel: "preload", as: "style", href: "./" + f }, injectTo: "head" });
        }
        return { html, tags };
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
  plugins: [react(), stampServiceWorkerVersion(), prefetchLegacyBundle(), preloadDefaultLoginChunks()],
  build: {
    target: "es2019",
    // The legacy app bundle is intentionally large until screens are
    // migrated out of it; silence the size warning for now.
    chunkSizeWarningLimit: 4096,
    // Don't gzip every emitted asset at build time just to print a size table
    // (the 1.8 MB legacy bundle + 1.24 MB pdf.worker make this slow). No effect
    // on the emitted output — build-time DX only.
    reportCompressedSize: false,
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    // Rules Emulator tests are run separately via `npm run test:rules`
    // (they need the Firebase emulator); keep them out of the normal run.
    exclude: [...configDefaults.exclude, "**/*.emulator.test.js"],
  },
});
