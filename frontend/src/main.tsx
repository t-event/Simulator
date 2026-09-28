import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./ui/tokens.css";
import "./index.css";
import { GameApp } from "./ui/GameApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);

// Siden skal alltid stå øverst (B-262). iPhone scroller vinduet når tastaturet åpnes, eller når adresselinja og
// skjermkanten endrer det synlige, og lar det stå slik etterpå. Da ligger knappene lenger opp enn der trykket treffer,
// og spilleren må trykke over dem.
function pinTop() {
  // Mens et tekstfelt er i bruk, får iPhone flytte siden så feltet synes over tastaturet
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}
window.addEventListener("scroll", pinTop, { passive: true });
window.addEventListener("resize", pinTop);
window.addEventListener("orientationchange", pinTop);
document.addEventListener("visibilitychange", pinTop);
// Etter at tastaturet lukkes, flytter iPhone siden tilbake litt senere enn focusout
document.addEventListener("focusout", () => setTimeout(pinTop, 100));
window.visualViewport?.addEventListener("resize", pinTop);

// iPhone med spillet på hjemskjermen (B-268): der regner Safari det synlige området som kortere enn skjermen, så de
// faste lagene sluttet et stykke over bunnen (også med 100dvh). Da får de hele skjermens høyde direkte.
const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
function fitScreen() {
  if (!standalone) return;
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  const w = portrait ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  const h = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  // Bare når appen fyller hele skjermen i bredden (ikke delt skjerm på iPad)
  const full = Math.abs(window.innerWidth - w) < 2;
  document.documentElement.classList.toggle("is-standalone", full);
  if (full) document.documentElement.style.setProperty("--app-h", `${h}px`);
}
fitScreen();
window.addEventListener("resize", fitScreen);
window.addEventListener("orientationchange", () => setTimeout(fitScreen, 100));

// Offline og installasjon på hjemskjermen (bare i det publiserte bygget)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Uten service worker virker spillet fortsatt, bare ikke offline
    });
  });
}
