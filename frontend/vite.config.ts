import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Publiseres på GitHub Pages under https://<bruker>.github.io/Simulator/,
// så bygget må ligge under /Simulator/. Ved lokal utvikling brukes rot.
const base = process.env.GITHUB_PAGES === "true" ? "/Simulator/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
