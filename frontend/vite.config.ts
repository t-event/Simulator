import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Publiseres på GitHub Pages under https://<bruker>.github.io/Simulator/,
// så bygget må ligge under /Simulator/. Lokal utvikling bruker rot.
const base = process.env.GITHUB_PAGES === "true" ? "/Simulator/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  // Dagen bygget ble laget, sendes med lagringen på nett (B-125)
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
});
