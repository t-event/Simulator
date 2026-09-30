/**
 * Topplista og kallenavnet (B-127). Serveren regner listene ut fra tidslinja (`snapshots`); appen sender aldri
 * inn poeng selv.
 */
import { rest, rpc, userId } from "./supabase";

export type BoardKind = "verdi" | "konsern" | "omdomme" | "storverk" | "ferdig" | "kontroll" | "utbetalt";

export const BOARDS: { id: BoardKind; label: string; unit: "kr" | "rep" | "dager" | "poeng" }[] = [
  // Konsernverdien regnet av serveren (B-320): konsernkassa + 60 dagers utbytte og bidrag − lån, i ekte tid
  { id: "konsern", label: "Konsernverdi", unit: "kr" },
  // Den gamle lista (kasse − lån + verkenes verdi i spillet) står som før, med ligaer og titler (B-320)
  { id: "verdi", label: "Verdi i spillet", unit: "kr" },
  // «Mest penger på bok» (B-144) er tatt bort (B-306): kassa har et tak på 10 mrd., så lista sa ingenting.
  // Serveren kan fortsatt regne den ut («kasse»); «Utbetalt til eierne» har tatt over
  { id: "storverk", label: "Raskest til storverk", unit: "dager" },
  { id: "ferdig", label: "Raskest til 10 mrd.", unit: "dager" },
  // Beste charge i kontrollrommet (B-295): samme liste i sesongen og i Hall of Fame
  { id: "kontroll", label: "Kontrollrom", unit: "poeng" },
  // Privat formue (B-303, navnet fra B-359): det kassa har tjent over taket, samme liste i sesongen og i Hall of Fame
  { id: "utbetalt", label: "Privat formue", unit: "kr" },
  // «Omdømme» er tatt bort (B-171): nesten alle står på 100, så lista sa ingenting. Serveren kan fortsatt regne den ut
];

export interface BoardRow {
  plass: number;
  nickname: string;
  value: number;
  day: number;
  is_me: boolean;
  /** bronse, solv eller gull (B-129): brukes til å dele spillerne etter nivå, vises ikke som metall (B-139) */
  league: string;
  /** Nivået spilleren er på (0 garasje … 4 storverk) */
  stage: number;
  /** Beste plassering i en sesong som er over, f.eks. «Sesong 1: 3. plass» (B-143), eller null */
  honor: string | null;
  /** Ikonet foran plasseringen (B-237): pokal for vinneren, medalje for topp 10 – serveren sender dem som tegn */
  honorIcon: "trophy" | "medal" | null;
  /** Tittel etter sluttmålet (Stålbaron … Stållegende, B-150), eller null */
  title: string | null;
  /** Spilldagen spillet ble koblet til kontoen (første dag i tidslinja, B-170), eller null. Vises ikke lenger (B-354) */
  linked_day: number | null;
  /** Æresmerker bare serveren vet om, f.eks. «reform» (B-296), vist ved navnet (B-299) */
  badges: string[];
  /** Dagen spilleren er på i sitt eget verk nå (det lagrede spillet, B-378), eller null fra en eldre server */
  today: number | null;
}

/** Navnet på æresmerkene på topplista (samme navn som prestasjonen, B-296) */
export const BADGE_NAMES: Record<string, string> = { reform: "Reformveteran", reform2: "Reformveteran II" };

const STAGE_NAMES = ["Garasje", "Verksted", "Støperi", "Stålverk", "Storverk"];

/** Merket ved navnet på topplista: hvor langt spilleren har kommet (B-139) */
export function levelLabel(r: Pick<BoardRow, "stage" | "league"> & { title?: string | null }): string {
  if (r.title) return r.title;
  if (r.league === "gull") return "Konsern";
  return STAGE_NAMES[r.stage] ?? "Garasje";
}

/** Plassen som tekst («1. plass»); med medalje i grensesnittet: <Place> i ui/Place.tsx (B-237) */
export function placeLabel(plass: number): string {
  return `${plass}. plass`;
}

export interface Profile {
  nickname: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
  banned: boolean;
}

/** `season` = sesongens id, eller null for «Hall of Fame» (alle tider) */
export async function fetchLeaderboard(kind: BoardKind, season: number | null = null, lim = 50): Promise<BoardRow[]> {
  const rows = await rpc<
    {
      plass: number;
      nickname: string;
      value: string | number;
      day: number;
      is_me: boolean;
      league: string | null;
      stage: number | null;
      honor?: string | null;
      title?: string | null;
      linked_day?: number | null;
      badges?: string[] | null;
      today?: number | null;
    }[]
  >("leaderboard", { kind, lim, season });
  return rows.map((r) => ({
    ...r,
    value: Number(r.value),
    league: r.league ?? "bronse",
    stage: Number(r.stage ?? 0),
    ...splitHonor(r.honor ?? null),
    title: r.title ?? null,
    linked_day: r.linked_day ?? null,
    // Eldre server uten merker: tom liste. Ukjente merker vises ikke
    badges: (r.badges ?? []).filter((b) => b in BADGE_NAMES),
    today: r.today ?? null,
  }));
}

/** Min plass på lista, eller null hvis jeg ikke er med */
export async function fetchMyRank(kind: BoardKind, season: number | null = null): Promise<number | null> {
  if (!userId()) return null;
  const r = await rpc<number | null>("my_rank", { kind, season });
  return r ?? null;
}

export async function fetchProfile(): Promise<Profile | null> {
  if (!userId()) return null;
  const rows = await rest<Profile[]>("profiles?select=nickname,flagged_at,flag_reason,banned");
  return rows[0] ?? null;
}

/** Samme regel som set_nickname på serveren: 3–20 tegn, bokstaver, tall, mellomrom og . _ - */
export function nicknameProblem(name: string): string | null {
  const n = name.trim();
  if (n.length < 3 || n.length > 20) return "Brukernavnet må ha 3–20 tegn.";
  if (!/^[A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈè _.-]+$/.test(n))
    return "Bruk bare bokstaver, tall, mellomrom, punktum, bindestrek og understrek i brukernavnet.";
  return null;
}

/** Er brukernavnet ledig? Sjekkes før kontoen opprettes (B-214), uten innlogging */
export async function nicknameAvailable(name: string): Promise<boolean> {
  return rpc<boolean>("nickname_available", { name: name.trim() });
}

/** Setter kallenavnet. Serveren sjekker lengde, tegn og at det er ledig; feil kommer som norsk melding. */
export async function setNickname(name: string): Promise<string> {
  return rpc<string>("set_nickname", { name });
}

/**
 * Serveren skriver plasseringen med et tegn foran («\u{1F3C6} Vinner av …», «\u{1F396} Topp 10 i …»). Appen viser et ikon
 * fra designsystemet i stedet (B-237), så tegnet tas bort og blir til `honorIcon`.
 */
export function splitHonor(honor: string | null): { honor: string | null; honorIcon: "trophy" | "medal" | null } {
  if (!honor) return { honor: null, honorIcon: null };
  const icon = honor.startsWith("\u{1F3C6}") ? "trophy" : honor.startsWith("\u{1F396}") ? "medal" : null;
  return { honor: honor.replace(/^[\p{Extended_Pictographic}\u{FE0F}\s]+/u, ""), honorIcon: icon };
}
