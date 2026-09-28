import { BONUS_COOLDOWN_DAYS, fpDeal, keyUpgrade, upgradeOptions } from "../game/actions";
import { auto, missingResearchFor, researchOptions } from "../game/research";
import { scrapResearchFor, scrapResearchHint } from "../game/recipe";
import { GRADES, ROLES } from "../game/data";
import { currentOrder, recipeEstimate, scrapStopHelp } from "../game/engine";
import {
  bonusGap,
  day,
  furnaceGrade,
  gradeRecipe,
  gradesInUse,
  isAbsent,
  staffing,
  tempsActive,
  fixedPriceAdvice,
  plannerOrders,
  type PlantStats,
} from "../game/plant";
import type { GameState, RoleId } from "../game/types";
import { fmtNum, fmtT } from "./format";
import { canWarn } from "../game/actions";
import { avgRating, shiftLeaderAtWork, sickSpells } from "../game/engine";
import type { View } from "./views";
import {
  cleaner,
  cleanerName,
  envActive,
  envDown,
  nextCleaner,
  shortfall,
  stopsOnBreakdown,
} from "../game/environment";

/**
 * Rådene på Verket (B-064): det viktigste spilleren bør gjøre nå, med fanen rådet peker til. Brukes også til «!» på
 * Marked og Folk i menyen (B-202), så menyen og rådene alltid sier det samme.
 */
export type Anchor = "vedlikehold" | "mal" | "rensing";

export interface Hint {
  text: string;
  view?: View;
  /** Underfane i visningen, f.eks. lageret under Salg */
  sub?: string;
  /** Kort her på Verket som hintet ruller til: vedlikehold (under Anlegg) eller målkortet (B-064) */
  anchor?: Anchor;
  /** Noe i spillet ordner det selv (planleggeren bestiller skrap): vises på Verket, men gir ikke «!» i menyen (B-202) */
  handled?: boolean;
}

export function hints(g: GameState, stats: PlantStats): Hint[] {
  const out: Hint[] = [];
  const active = g.contracts.filter((c) => c.status === "aktiv");
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const waits = g.furnaces.map((f) => f.waitReason);
  if (!active.length && offers.length)
    out.push({ text: "Du har ingen kontrakter. Se på tilbudene under Salg.", view: "salg" });
  const plannerBuys = auto(g, "autoBuy") && plannerOrders(g) && !g.autoBuyNote;
  if (waits.includes("Mangler skrap til resepten"))
    out.push({
      text: `Skrapklasseren venter på skrap som passer resepten. ${scrapStopHelp(g)}`,
      view: "marked",
      sub: "skrap",
      handled: plannerBuys,
    });
  if (waits.includes("Tomt for skrap")) {
    // Med flere ovner: si hvilke som står (B-161)
    const empty = waits.flatMap((w, i) => (w === "Tomt for skrap" ? [String(i + 1)] : []));
    const who =
      waits.length === 1
        ? "Ovnen står"
        : `${empty.length === 1 ? "Ovn" : "Ovnene"} ${empty.slice(0, -1).join(", ")}${empty.length > 1 ? " og " : ""}${empty[empty.length - 1]} står`;
    out.push({
      text: `${who} fordi skraplageret er tomt. ${scrapStopHelp(g)}`,
      view: "marked",
      sub: "skrap",
      handled: plannerBuys,
    });
  }
  if (waits.includes("Mangler folk")) {
    const missing = Object.entries(stats.missing)
      .map(
        ([r, n]) => `${n} ${n === 1 ? ROLES[r as RoleId].name.toLowerCase() : ROLES[r as RoleId].plural.toLowerCase()}`,
      )
      .join(", ");
    out.push({ text: `Verket mangler folk for å gå: ${missing}.`, view: "folk" });
  }
  // Ovnene smelter mer enn støpingen tar unna (B-157): si hva som gir mer støpekapasitet
  if (g.stage >= 4 && stats.casting.continuous && stats.hours > 0 && stats.meltTph > stats.castTph * 1.15) {
    const more = upgradeOptions(g).find(
      (o) => !o.owned && (o.kind === "casting" || o.baseId === "streng2" || o.baseId === "streng3"),
    );
    out.push({
      text: `Ovnene smelter ca. ${fmtT(stats.meltTph)} i timen, men støpingen tar bare ${fmtT(stats.castTph)}, så ovnene venter på støping.${more ? ` Mer støpekapasitet: ${more.name}${more.reason && more.reason !== "For lite penger" ? ` (${more.reason.toLowerCase()})` : " under Anlegg → Støping og valsing"}.` : ""}`,
    });
  }
  // Utslipp (B-263): renseanlegget står, eller det er for lite for ovnene
  if (envActive(g)) {
    if (envDown(g))
      out.push({
        text: stopsOnBreakdown(g)
          ? "Renseanlegget står etter et havari. Ovnene som ikke får plass, venter til det er reparert."
          : "Renseanlegget står etter et havari, men ovnene går videre. Det blir dobbel bot i morgen.",
        anchor: "rensing",
      });
    else if (shortfall(g, stats) > 0.02) {
      const next = nextCleaner(g);
      const opt = next ? upgradeOptions(g).find((o) => o.id === next.id) : undefined;
      const buy = !next
        ? ""
        : opt?.available || opt?.reason === "For lite penger"
          ? ` Kjøp ${cleanerName(next.id).toLowerCase()} under Anlegg → Ovn.`
          : ` Neste: ${cleanerName(next.id).toLowerCase()}${opt?.reason ? ` (${opt.reason.toLowerCase()})` : ""}.`;
      out.push({
        text: `Renseanlegget renser ${fmtT(cleaner(g)!.tpd)} i døgnet, men ovnene smelter opptil ${fmtT(stats.meltTph * 24)}. Når ovnene smelter mer enn det, går resten urenset ut og gir bot.${buy}`,
        anchor: "rensing",
      });
    }
  }
  if (g.castWait === "Ferdigvarelageret er fullt")
    out.push({ text: "Ferdigvarelageret er fullt. Selg partier på spot under Salg.", view: "salg", sub: "lager" });
  if (stats.furnace.arc && g.furnaces.some((f) => f.spareProgress < 1) && !g.workers.some((w) => w.role === "murer"))
    out.push({
      text: "Reservepottene til lysbueovnene blir ikke murt opp. Ansett murere (to per ovn), ellers må foringen mures om inne i ovnen.",
      view: "folk",
    });
  if (g.furnaces.some((f) => f.wear > 0.8 && !f.relineRequested))
    out.push({
      text: "Foringen er nesten slitt gjennom. Trykk her og bytt den under Vedlikehold før den brenner gjennom.",
      anchor: "vedlikehold",
    });
  // Uten ordreplanlegging bytter ikke ovnen kvalitet selv (B-054)
  const first = currentOrder(g);
  if (
    first &&
    !auto(g, "followQueue") &&
    first.grade !== g.targetGrade &&
    g.furnaces.every((_, i) => furnaceGrade(g, i) !== first.grade)
  )
    out.push({
      text: `${first.customer} vil ha ${GRADES[first.grade].name.toLowerCase()}, men ovnen lager ${GRADES[g.targetGrade].name.toLowerCase()}. Velg kvalitet under «Produksjon nå» lenger ned.`,
    });
  // Kvaliteter ovnen lager eller har kontrakter på. Trengs det skrap som ikke er forsket fram, sies det (B-067)
  const inUse = gradesInUse(g);
  const needed = [...new Set([...inUse, ...g.contracts.filter((c) => c.status === "aktiv").map((c) => c.grade)])];
  for (const grade of needed) {
    const est = recipeEstimate(g, grade, stats, gradeRecipe(g, grade));
    if (est.grades.includes(grade)) continue;
    const missing = scrapResearchFor(g, grade, stats);
    if (missing) out.push({ text: scrapResearchHint(g, grade, missing), view: "forskning" });
    else if (inUse.includes(grade))
      out.push({
        text: `Resepten din holder ikke kravet til ${GRADES[grade].name.toLowerCase()}. Juster den under Verket → Resept.`,
        view: "verket",
        sub: "resept",
      });
  }
  const research = researchOptions(g).filter((r) => r.available);
  if (research.length)
    out.push({ text: `Du har fagpoeng nok til å forske på ${research[0].name.toLowerCase()}.`, view: "forskning" });
  const next = upgradeOptions(g).find((o) => o.kind === "stage");
  if (next?.available) out.push({ text: `Du kan flytte inn i ${next.name.toLowerCase()}! Trykk her.`, anchor: "mal" });
  // Står ny ovn eller støping fast på forskning, og fagpoengene mangler: vis veien videre (B-064)
  const key = keyUpgrade(g);
  const needs = key?.reason?.startsWith("Forsk fram") ? missingResearchFor(g, key.baseId) : undefined;
  if (needs && g.researchPoints < needs.cost) {
    const deal = fpDeal(g);
    const ways = [
      !deal.reason && "kjøp et forskningssamarbeid under Forskning",
      stats.furnace.arc && "kjør charger selv («Ta styringen»)",
      "lever kontrakter og ta quizene i fagboka",
    ].filter(Boolean);
    out.push({
      text: `Du mangler ${Math.ceil(needs.cost - g.researchPoints)} fagpoeng til «${needs.name}». Få flere: ${ways.join(", ")}.`,
      view: "forskning",
    });
  }
  {
    const away = g.workers.filter((w) => isAbsent(g, w)).length;
    const full = staffing(g, true).shifts;
    if (away && !tempsActive(g) && stats.shifts < full)
      out.push({
        text: `${away} ${away === 1 ? "ansatt er" : "ansatte er"} borte, og verket går ${stats.shifts} skift i stedet for ${full}. Lei inn vikarer under Folk, eller vent til de er tilbake.`,
        view: "folk",
        sub: "fravaer",
      });
  }
  // Lenge siden bonus (B-159): trivselen synker, si fra før folk begynner å slutte
  if (
    g.workers.length &&
    g.morale >= 40 &&
    g.morale < 70 &&
    bonusGap(g) >= 10 &&
    day(g) - g.lastBonusDay >= BONUS_COOLDOWN_DAYS
  )
    out.push({
      text: "Det er lenge siden de ansatte fikk bonus, og trivselen synker. Gi alle bonus under Folk.",
      view: "folk",
      sub: "ansatte",
    });
  if (g.workers.length && g.morale < 40)
    out.push({ text: "Trivselen blant de ansatte er lav, og noen kan si opp. Se Folk.", view: "folk", sub: "ansatte" });
  // Lav kundevurdering (B-161): si hva som gir bedre karakter
  const recentRating = g.ratings.length >= 5 ? avgRating(g, 5) : null;
  if (recentRating !== null && recentRating < 6)
    out.push({
      text: `Kundene gir deg lav karakter (${fmtNum(Math.floor(recentRating * 10) / 10, 1)} av 10). Lever tidligere, og velg en resept med mer margin til kravene. Se Salg → Ordrekø.`,
      view: "salg",
      sub: "ko",
    });
  {
    // Høy strømpris: råd om fastpris (B-105)
    const advice = fixedPriceAdvice(g, stats.hours);
    if (advice)
      out.push({
        text: `Strømprisen er høy (${fmtNum(advice.spot, 2)} kr/kWh på spot). Fastpris nå: ${fmtNum(advice.fixed, 2)} kr/kWh i 30 døgn. Trykk her for å se strømavtalene.`,
        view: "marked",
        sub: "strom",
      });
  }
  {
    // Ofte borte: råd om advarsel (B-101)
    // Med en skiftleder på jobb følges fraværet opp av seg selv (B-178)
    const often = shiftLeaderAtWork(g) ? undefined : g.workers.find((w) => canWarn(g, w));
    if (often)
      out.push({
        text:
          `${often.name} har vært syk ${sickSpells(g, often)} ganger på 60 døgn. Vurder en advarsel under Folk → Fravær.` +
          (g.stage >= 3 ? " En skiftleder følger opp fraværet for deg." : ""),
        view: "folk",
        sub: "fravaer",
      });
  }
  if (g.stage >= 1 && stats.staffCount === 0)
    out.push({ text: "Nå har du plass til ansatte. Med flere folk kan verket gå flere skift.", view: "folk" });
  return out.slice(0, 3);
}

/** Skraptypene resepten mangler til neste charge, som tekst (B-063) */
