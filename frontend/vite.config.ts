import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Build output goes into app/static/dist so FastAPI can serve it from the existing /static mount.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../app/static/dist"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
