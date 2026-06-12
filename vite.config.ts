import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base:'./' keeps asset URLs relative (works on GitHub Pages sub-paths),
// matching the original deployment which used './' paths.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 4000,
  },
});
