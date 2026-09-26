import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Publiseres på GitHub Pages under https://<bruker>.github.io/Simulator/,
// så bygget må ligge under /Simulator/. Lokal utvikling bruker rot.
const base = process.env.GITHUB_PAGES === "true" ? "/Simulator/" : "/";

// Hvert bygg får en egen id. Den ligger i appen og i version.json, så appen ser når en ny versjon er publisert og
// oppdaterer seg selv (B-148)
const buildId = `${new Date().toISOString()}-${(process.env.GITHUB_SHA ?? "lokal").slice(0, 7)}`;

function versionFile(): Plugin {
  return {
    name: "stalverket-versjon",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ id: buildId }) });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), versionFile()],
  define: {
    // Dagen bygget ble laget, sendes med lagringen på nett (B-125)
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
