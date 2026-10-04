import { BONUS_COOLDOWN_DAYS, fpDeal, keyUpgrade, upgradeOptions } from "../game/actions";
import { auto, missingResearchFor, researchOptions } from "../game/research";
import { scrapResearchFor, scrapResearchHint } from "../game/recipe";
import { BANKRUPTCY_DAYS, GRADES, ROLES } from "../game/data";
import { CREDIT_HELP, creditLimit, currentOrder, recipeEstimate, scrapStopHelp } from "../game/engine";
import { summerStart, summerStop, yearOf } from "../game/calendar";
import { hasMoulds, MOULD, mouldCost, mouldWear } from "../game/mould";
import { pensionSoon } from "../game/pension";
import { neighborHintDue } from "../game/building";
import { hasUpkeep, renewCost, repairerRenews, UPKEEP, upkeepWear } from "../game/upkeep";
import {
  bonusGap,
  day,
  fireImpact,
  furnaceGrade,
  gradeRecipe,
  gradesInUse,
  isAbsent,
  staffing,
  plantRestartMin,
  presentWorkers,
  tempsActive,
  fixedPriceAdvice,
  plannerOrders,
  type PlantStats,
} from "../game/plant";
import type { GameState, RoleId } from "../game/types";
import { fmtNum, fmtT, fmtKr } from "./format";
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
export type Anchor = "vedlikehold" | "mal" | "rensing" | "bygg";

export interface Hint {
  text: string;
  view?: View;
  /** Underfane i visningen, f.eks. lageret under Salg */
  sub?: string;
  /** Kort her på Verket som hintet ruller til: vedlikehold (under Anlegg) eller målkortet (B-064) */
  anchor?: Anchor;
  /** Noe i spillet ordner det selv (planleggeren bestiller skrap): vises på Verket, men gir ikke «!» i menyen (B-202) */
  handled?: boolean;
  /**
   * Hvor alvorlig (B-406): `critical` = konkursfare, `heat` = noe står eller går tapt nå (skrap, folk, lager, foring).
   * Uten er det et råd. Rådsraden på Verket får fargen, og de alvorligste rådene står først.
   */
  tone?: "heat" | "critical";
}

export function hints(g: GameState, stats: PlantStats): Hint[] {
  const out: Hint[] = [];
  // Kassa under kredittgrensen (B-349): det viktigste rådet, med hva man kan gjøre – før sto det bare i loggen
  if (g.cash < -creditLimit(g, stats)) {
    const left = BANKRUPTCY_DAYS - g.negativeDays;
    out.push({
      tone: "critical",
      text: `Kassa er under kredittgrensen. ${summerStop(g) ? `Banken venter til sommerstansen er over, men da er det konkurs om ${left} døgn` : `Blir den der, er det konkurs om ${left} døgn`}. ${CREDIT_HELP}`,
      view: "marked",
      sub: "skrap",
    });
  } else {
    // Før sommerstansen (B-349): tre uker uten salg. Står kassa i minus, er det nå det må ordnes
    const today = day(g);
    const start = summerStart(today);
    const startsIn = start - today;
    if (g.summer?.choice === "stans" && g.summer.year === yearOf(start) && startsIn > 0 && startsIn <= 7 && g.cash < 0)
      out.push({
        tone: "heat",
        text: `Sommerstans om ${startsIn} døgn: ingen salg i tre uker, men faste kostnader og renter går. Kassa er i minus – kjøp ikke mer skrap enn ovnene bruker før ferien, og selg det du ikke trenger.`,
        view: "marked",
        sub: "skrap",
      });
  }
  const active = g.contracts.filter((c) => c.status === "aktiv");
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const waits = g.furnaces.map((f) => f.waitReason);
  if (!active.length && offers.length)
    out.push({ text: "Du har ingen kontrakter. Se på tilbudene under Salg.", view: "salg" });
  // Forespørsler som passet verket, gikk ut uten svar (B-292): i en gjennomgang gikk fire ut på ett døgn uten et ord
  const missed = (g.missedOffers ?? []).filter((m) => m > g.minute - 24 * 60).length;
  if (missed >= 2 && !g.konsern?.director?.active)
    out.push({
      text: `${missed} forespørsler som passet verket, gikk ut uten svar det siste døgnet. Svar på dem under Salg – tallet på Salg-knappen viser hvor mange som venter.${g.konsern?.unlocked ? " Salgsdirektøren i konsernet kan svare for deg." : ""}`,
      view: "salg",
      sub: "tilbud",
    });
  const plannerBuys = auto(g, "autoBuy") && plannerOrders(g) && !g.autoBuyNote;
  if (waits.includes("Mangler skrap til resepten"))
    out.push({
      text: `Skrapklasseren venter på skrap som passer resepten. ${scrapStopHelp(g)}`,
      view: "marked",
      sub: "skrap",
      handled: plannerBuys,
      tone: plannerBuys ? undefined : "heat",
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
      tone: plannerBuys ? undefined : "heat",
    });
  }
  // «Bare én ovn smelter om gangen» (Strøm) på et verk med flere ovner: verket lager en brøkdel (B-312: en spiller med
  // tre 420-tonnere fikk 11 000 t i døgnet av 35 000 og trodde salgsdirektøren ikke virket)
  if (waits.includes("Venter: bare én ovn smelter om gangen") && g.furnaces.length > 1)
    out.push({
      text: `Bare én ovn smelter om gangen (valgt under Strøm), så verket lager omtrent ${g.furnaces.length === 2 ? "halvparten" : g.furnaces.length === 3 ? "en tredel" : g.furnaces.length === 4 ? "en firedel" : `1/${g.furnaces.length}`} av det det kan. Effekttariffen blir lavere, men produksjonen mye mindre – slå det av under Marked → Strøm hvis ordrene venter.`,
      view: "marked",
      sub: "strom",
    });
  if (waits.includes("Mangler folk")) {
    const missing = Object.entries(stats.missing)
      .map(
        ([r, n]) => `${n} ${n === 1 ? ROLES[r as RoleId].name.toLowerCase() : ROLES[r as RoleId].plural.toLowerCase()}`,
      )
      .join(", ");
    out.push({ text: `Verket mangler folk for å gå: ${missing}.`, view: "folk", tone: "heat" });
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
        tone: "heat",
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
    out.push({
      // Knappen og utbyggingen fra B-274 (B-275)
      text: "Ferdigvarelageret er fullt. Trykk «Selg alt ledig stål» under Salg → Lager, eller bygg ut lageret under Anlegg → Lager og salg.",
      view: "salg",
      sub: "lager",
      tone: "heat",
    });
  if (stats.furnace.arc && g.furnaces.some((f) => f.spareProgress < 1) && !g.workers.some((w) => w.role === "murer"))
    out.push({
      text: "Reservepottene til lysbueovnene blir ikke murt opp. Ansett murere (to per ovn), ellers må foringen mures om inne i ovnen.",
      view: "folk",
    });
  if (g.furnaces.some((f) => f.wear > 0.8 && !f.relineRequested))
    out.push({
      text: "Foringen (mursteinene inni ovnen) er nesten slitt gjennom. Trykk her og så «Bytt foring» før den brenner gjennom.",
      anchor: "vedlikehold",
      tone: "heat",
    });
  // Kokillene (B-351): reparatøren bytter dem hvis han bytter foringen; ellers må spilleren
  const repairerSwaps = auto(g, "autoReline") && presentWorkers(g).some((w) => w.role === "vedlikehold");
  if (hasMoulds(g) && mouldWear(g) >= MOULD.warnAt && !repairerSwaps)
    out.push({
      text: `Kokillene i strengstøpingen er ${Math.floor(mouldWear(g) * 100)} % slitt, og strengen bryter lettere gjennom. Trykk her og så «Bytt kokiller» (${fmtKr(mouldCost(g))}).`,
      anchor: "vedlikehold",
    });
  // Slitasjen på storverket (B-455): reparatøren fornyer selv hvis han bytter foringen; ellers må spilleren
  if (hasUpkeep(g) && upkeepWear(g) >= UPKEEP.warnAt && !repairerRenews(g))
    out.push({
      text: `Storverket er ${Math.floor(upkeepWear(g) * 100)} % slitt, og ovnene havarerer oftere. Trykk her og så «Forny anlegget» (${fmtKr(renewCost(g))}).`,
      anchor: "vedlikehold",
      ...(upkeepWear(g) >= 1 ? { tone: "heat" as const } : {}),
    });
  // Havari (B-281): reparasjonen skjer av seg selv, men spillerne trodde de måtte trykke på noe
  const broken = g.furnaces.findIndex((f) => g.minute < f.downUntilMin && /^Havari/.test(f.downReason ?? ""));
  if (broken >= 0) {
    const f = g.furnaces[broken];
    const h = Math.max(1, Math.ceil((f.downUntilMin - g.minute) / 60));
    out.push({
      text: `${g.furnaces.length > 1 ? `Ovn ${broken + 1}` : "Ovnen"} repareres etter havari og er i gang igjen om ca. ${h} t. Det skjer av seg selv – du trenger ikke trykke på noe.`,
      anchor: "vedlikehold",
      handled: true,
    });
  }
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
        tone: "heat",
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
    // Står hele verket, trengs ingen vikarer ennå (B-346)
    if (away && !tempsActive(g) && stats.shifts < full && plantRestartMin(g) === null)
      out.push({
        text: `${away} ${away === 1 ? "ansatt er" : "ansatte er"} borte, og verket går ${stats.shifts} skift i stedet for ${full}. Lei inn vikarer under Folk, eller vent til de er tilbake.`,
        view: "folk",
        sub: "fravaer",
      });
  }
  {
    // Pensjon snart (B-357): si fra når skiftene faller uten den som går av, så det er tid til å ansette en ny
    const today = day(g);
    const leaving = g.workers
      .filter((w) => pensionSoon(w, today) !== null)
      .find((w) => fireImpact(g, w.id).after < fireImpact(g, w.id).before);
    if (leaving) {
      const left = pensionSoon(leaving, today) ?? 0;
      out.push({
        text: `${leaving.name} går av med pensjon ${left <= 0 ? "i dag" : `om ${left} døgn`}, og da mangler det en ${ROLES[leaving.role].name.toLowerCase()} på skiftene. Ansett en ny under Folk.`,
        view: "folk",
        sub: "ansett",
      });
    }
  }
  // Lenge siden bonus (B-159): trivselen synker, si fra før folk begynner å slutte
  // Gir skiftlederen bonus (B-271), trengs ikke rådet
  const leaderGives = !!g.settings.leaderBonus && shiftLeaderAtWork(g);
  if (
    !leaderGives &&
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
    out.push({
      text: "Trivselen blant de ansatte er lav, og noen kan si opp. Se Folk.",
      view: "folk",
      sub: "ansatte",
      tone: "heat",
    });
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
  // Nabolaget (B-455): store verk hadde milliarder i kassa uten å vite at byggene fantes – til kortet er sett én gang
  const nb = neighborHintDue(g);
  if (nb)
    out.push({
      text: `Kassa holder til ${nb.project.name.toLowerCase()} (${fmtKr(nb.price)}) – store bygg i byen gir en liten fordel for alltid og står i bildet av verket. Trykk her.`,
      anchor: "bygg",
    });
  // Det alvorligste først (B-406); ellers samme rekkefølge som over
  const rank = (h: Hint) => (h.tone === "critical" ? 0 : h.tone === "heat" ? 1 : 2);
  return out
    .map((h, i) => ({ h, i }))
    .sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i)
    .map((x) => x.h)
    .slice(0, 3);
}

/** Skraptypene resepten mangler til neste charge, som tekst (B-063) */
