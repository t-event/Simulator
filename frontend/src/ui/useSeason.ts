/** Hooks for sesongbutikken (B-129), skilt fra komponentene så hurtig oppdatering virker */
import { useSyncExternalStore } from "react";
import { onSeasonChange, seasonStatus, worldEvents } from "../net/season";

export function useSeasonStatus() {
  return useSyncExternalStore(onSeasonChange, seasonStatus, seasonStatus);
}
export function useWorldEvents() {
  return useSyncExternalStore(onSeasonChange, worldEvents, worldEvents);
}
