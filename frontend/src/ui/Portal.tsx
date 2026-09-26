/**
 * Ark og vinduer som åpnes fra innholdet på Verket, legges rett i <body> (B-152). Inne i .g-main (som scroller, B-137)
 * klipper Safari på iPhone et fast ark til innholdet, og arket kan ikke scrolles.
 */
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function Portal({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? children : createPortal(children, document.body);
}
