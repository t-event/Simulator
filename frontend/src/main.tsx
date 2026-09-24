import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GameApp } from "./ui/GameApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);

// Offline og installasjon på hjemskjermen (bare i det publiserte bygget)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Uten service worker virker spillet fortsatt, bare ikke offline
    });
  });
}
