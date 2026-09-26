/** Hook for dagens status fra serveren (B-149), skilt fra komponentene så hurtig oppdatering virker */
import { useSyncExternalStore } from "react";
import { dailyStatus, onDailyChange } from "../net/daily";

export function useDailyStatus() {
  return useSyncExternalStore(onDailyChange, dailyStatus, dailyStatus);
}
