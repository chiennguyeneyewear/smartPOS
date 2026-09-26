import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Identifies this build. Every deploy gets a new one; the running app compares it with /version.json.
const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

export default defineConfig(({ command }) => ({
  define: { __APP_VERSION__: JSON.stringify(command === "build" ? appVersion : "dev") },
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    react(),
    {
      name: "emit-version-json",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: appVersion }) });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query", "@tanstack/react-table"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-select",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "lucide-react",
          ],
          "charts-vendor": ["recharts"],
        },
      },
    },
  },
}));
