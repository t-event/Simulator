/**
 * Kobling til Supabase (B-125). URL-en og den offentlige nøkkelen er laget for å ligge i koden: sikkerheten ligger i
 * tilgangsreglene i databasen (se supabase/). Den hemmelige nøkkelen (service_role) skal aldri hit.
 */
export const SUPABASE_URL = "https://qzdwiamiangrjpmglpwy.supabase.co";
export const SUPABASE_KEY = "sb_publishable_k3Q6-Z7Hn9VKaqf-PfShSg_OMKWCr3t";

/** Appversjonen som sendes med hver lagring, så serveren kan se hvilken versjon spilleren har */
export const APP_VERSION = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "dev";
