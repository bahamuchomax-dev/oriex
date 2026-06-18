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

// `base: "./"` keeps asset URLs relative so the build also works when
// served from a GitHub Pages project subpath (matches manifest/sw "./").
export default defineConfig({
  base: "./",
  plugins: [react(), stampServiceWorkerVersion()],
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
