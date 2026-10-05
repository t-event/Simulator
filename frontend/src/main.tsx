import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./ui/tokens.css";
import "./index.css";
import { GameApp } from "./ui/GameApp";
import { captureReferral } from "./net/referral";

// En vervelenke (?verv=KODE, B-459) huskes før spillet starter, og tas bort fra adresselinja
captureReferral();

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

// Offline og installasjon på hjemskjermen (bare i det publiserte bygget)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Uten service worker virker spillet fortsatt, bare ikke offline
    });
  });
}
