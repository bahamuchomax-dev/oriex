import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Notes:
// - `base: "./"` keeps relative asset paths, matching how the v6.9 dist was
//   served from GitHub Pages. Adjust if you deploy to a sub-path.
// - The legacy-dist/ folder is reference-only and is NOT part of the build.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true, // keep sourcemaps so future builds stay debuggable
  },
});
