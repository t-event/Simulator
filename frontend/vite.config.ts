import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Publiseres på GitHub Pages under https://<bruker>.github.io/Simulator/,
// så bygget må ligge under /Simulator/. Relayen og lokal utvikling bruker rot.
const base = process.env.GITHUB_PAGES === "true" ? "/Simulator/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    // Under utvikling går /relay videre til relayen, slik den gjør når
    // relayen selv serverer appen
    proxy: {
      "/relay": { target: "ws://localhost:8080", ws: true },
    },
  },
});
