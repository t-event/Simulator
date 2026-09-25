/**
 * Kobling til Supabase (B-125, B-126). URL og nøkkel ligger ikke i repoet: de settes som GitHub Secrets og legges inn
 * av bygget (VITE_SUPABASE_URL og VITE_SUPABASE_KEY i pages.yml). Lokalt legges de i frontend/.env.local, som er
 * ignorert av git. Mangler de, er alt på nett slått av og spillet virker som før.
 */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const cloud = {
  url: (env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  key: env.VITE_SUPABASE_KEY ?? "",
};

/** Er koblingen satt opp? Uten nøkler vises ingen konto, og ingenting sendes. */
export function cloudConfigured(): boolean {
  return cloud.url !== "" && cloud.key !== "";
}

/** For tester: setter en falsk kobling */
export function setCloudConfig(url: string, key: string): void {
  cloud.url = url;
  cloud.key = key;
}

/** Appversjonen som sendes med hver lagring, så serveren kan se hvilken versjon spilleren har */
export const APP_VERSION = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "dev";
