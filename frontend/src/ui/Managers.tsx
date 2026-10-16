/**
 * Verksjefene på Konsern → Oversikt (B-488): én verksjef per datterverk, med et mandat, og samtalene («Verksjefen
 * ringer»). Serveren avgjør alt (supabase/152_verksjefer.sql); kortet viser bare det serveren svarer. Vises når bryteren
 * er på og spilleren har et ferdig verk – før det finnes det ikke (B-180).
 */
import { useEffect, useState } from "react";
import { realNow } from "../game/clock";
import {
  bestMandate,
  CALL_CARD_BY_ID,
  effectDays,
  LOYALTY,
  loyaltyWord,
  MANAGERS,
  MANDATE_ABOUT,
  MANDATE_NAME,
  MANDATES,
  modFactors,
  netShare,
  salaryShare,
  traitChoice,
  TRAIT_ABOUT,
  TRAIT_NAME,
  type CallOption,
  type Mandate,
  type ManagerStats,
} from "../game/managers";
import { modCost } from "../game/konsernWorld";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import {
  answerCall,
  dismissManager,
  hireManager,
  MANAGER_REFUSAL_TEXT,
  openCall,
  setManagerMandate,
  type ManagerCall,
  type ManagerCandidate,
  type ManagerResult,
  type ManagerStatus,
  type PlantManager,
} from "../net/managers";
import { Card } from "./common";
import { Button, Callout, SheetHead } from "./ds";
import { fmtKr } from "./format";
import { Icon } from "./icons";
import { Portal } from "./Portal";
import { isMine } from "./claims";
import { userId } from "../net/supabase";

type Act = GameApi["act"];

/** Tid som gjenstår, grovt: «31 t», «40 min» */
function fmtHours(ms: number): string {
  const min = Math.max(0, Math.ceil(ms / 60_000));
  return min >= 60 ? `${Math.floor(min / 60)} t` : `${min} min`;
}

const signed = (kr: number) => `${kr >= 0 ? "+" : "−"}${fmtKr(Math.abs(Math.round(kr)))}`;
const pct = (x: number) => `${(x * 100).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} %`;

function Stars({ n, label }: { n: number; label: string }) {
  return (
    <span className="g-manager-stat">
      <span className="g-small-text">{label}</span>
      <span className="g-stars" aria-label={`${label} ${n} av 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" className={i < n ? "is-on" : ""} />
        ))}
      </span>
    </span>
  );
}

function StatsLine({ s }: { s: ManagerStats }) {
  return (
    <div className="g-manager-stats">
      <Stars n={s.drift} label="Drift" />
      <Stars n={s.okonomi} label="Økonomi" />
      <Stars n={s.folk} label="Folk" />
    </div>
  );
}

/** Hva mandatet gjør med moderniseringen av verket, i kroner per trinn */
function modText(m: Mandate, s: ManagerStats, modBase: number): string {
  const f = modFactors(m, s);
  if (f.cost === 1) return "";
  const diff = Math.round(modBase * (1 - f.cost));
  return f.cost < 1
    ? `, modernisering ${Math.round((1 - f.cost) * 100)} % billigere (${fmtKr(diff)} spart per trinn) og ${Math.round((1 - f.time) * 100)} % raskere`
    : `, modernisering ${Math.round((f.cost - 1) * 100)} % dyrere (${fmtKr(-diff)} mer per trinn)`;
}

/** Skriver svaret fra serveren som en beskjed i spillet */
function report(act: Act, r: ManagerResult, okText: string, count?: { key: string; uid: string | null }): boolean {
  act((g) => {
    // Tellerne til prestasjonene (B-497): bare det serveren sa ja til, og bare i spillet til kontoen som spurte (B-426)
    if (r.ok && count && isMine(g, count.uid)) g.counters[count.key] = (g.counters[count.key] ?? 0) + 1;
    return r.ok ? { ok: true, message: okText } : { ok: false, message: MANAGER_REFUSAL_TEXT[r.reason] };
  });
  return r.ok;
}

/** Hva et valg i en samtale betyr i kroner for verket */
function optionKr(o: CallOption, daily: number, mandate: Mandate | null): string {
  if (o.special === "raise") return `${signed(-LOYALTY.raise * daily)} per dag i lønn`;
  if (o.special === "leave") return "Ingen kostnad";
  const parts: string[] = [];
  const sure = o.sure ?? {};
  if (sure.cash) parts.push(`${signed(sure.cash * daily)} nå`);
  if (sure.days && sure.factor && sure.factor !== 1)
    parts.push(`${signed(sure.days * (sure.factor - 1) * daily)} over ${sure.days} dager`);
  if (o.risk) {
    const chance = mandate === "stabilitet" ? o.risk.chance * MANAGERS.stabilityRisk : o.risk.chance;
    parts.push(`${Math.round(chance * 100)} % sjanse for ${signed(effectDays(o.risk.effect) * daily)}`);
  }
  return parts.length ? parts.join(", ") : "Ingen kostnad";
}

function CallBox({
  call,
  status,
  plantName,
  act,
}: {
  call: ManagerCall;
  status: ManagerStatus;
  plantName: (id: number) => string;
  act: Act;
}) {
  const [busy, setBusy] = useState(false);
  const card = CALL_CARD_BY_ID[call.card];
  const m = status.managers.find((x) => x.plant === call.plant) ?? null;
  const daily = status.plants.find((p) => p.plant === call.plant)?.daily ?? 0;
  if (!card) return null;
  const answer = async (choice: 0 | 1) => {
    setBusy(true);
    const uid = userId();
    const r = await answerCall(call.id, choice);
    setBusy(false);
    const o = card.options[choice];
    const who = call.manager ?? "Verksjefen";
    report(
      act,
      r,
      r.ok && r.special === "raise"
        ? `${who} blir, med lønnstillegg.`
        : r.ok && r.special === "leave"
          ? `${who} har sluttet. Du kan ansette en ny med én gang.`
          : r.ok && r.outcome === "uhell"
            ? `${card.title}: det gikk dårlig denne gangen.`
            : `${card.title}: «${o.label}». Verksjefen setter det i gang.`,
      { key: "samtale_besvart", uid },
    );
  };
  // Verksjefens råd er det verksjefen selv ville valgt (B-489): følger du det, trives verksjefen bedre
  const advice = m && !card.special ? traitChoice(card, m.trait, m.mandate) : null;
  return (
    <Callout tone="heat">
      <strong>
        {call.manager ?? "Verksjefen"} ringer fra {plantName(call.plant)}: {card.title}
      </strong>
      <div className="g-small-text">{card.text}</div>
      <div className="g-manager-options">
        {card.options.map((o, i) => (
          <div key={o.label} className="g-manager-option">
            <Button variant="secondary" disabled={busy} onClick={() => void answer(i as 0 | 1)}>
              {o.label}
            </Button>
            <span className="g-small-text">
              {advice === i && <strong>Verksjefen anbefaler dette. </strong>}
              {o.about}
            </span>
            <span className="g-muted g-small-text">{optionKr(o, daily, m?.mandate ?? null)}</span>
          </div>
        ))}
      </div>
      <div className="g-muted g-small-text">
        Svar innen {fmtHours(call.deadline - realNow())}. Ellers bestemmer verksjefen selv
        {m ? ` – ${m.name.split(" ")[0]} ${TRAIT_ABOUT[m.trait]}` : ""}.
        {advice != null && " Følger du rådet, trives verksjefen bedre."}
      </div>
    </Callout>
  );
}

/** Det som er avgjort siste uka, kort */
function CallHistory({ status, plantName }: { status: ManagerStatus; plantName: (id: number) => string }) {
  const done = status.calls.filter((c) => c.resolvedAt != null).slice(0, 3);
  if (!done.length) return null;
  return (
    <ul className="g-manager-history g-small-text">
      {done.map((c) => {
        const card = CALL_CARD_BY_ID[c.card];
        const o = c.choice != null ? card?.options[c.choice] : null;
        return (
          <li key={c.id}>
            {plantName(c.plant)}: {card?.title ?? "Sak"} – «{o?.label ?? "?"}»
            {c.manager && card?.special ? ` (${c.manager})` : ""}
            {c.chosenBy === "verksjef" ? " (verksjefen valgte)" : ""}
            {c.outcome === "uhell" ? ", gikk dårlig" : ""}
            {c.cash ? ` (${signed(c.cash)})` : ""}
          </li>
        );
      })}
    </ul>
  );
}

function HireSheet({
  plant,
  name,
  daily,
  modBase,
  candidates,
  act,
  onClose,
}: {
  plant: number;
  name: string;
  daily: number;
  /** Prisen på et trinn modernisering uten verksjef */
  modBase: number;
  candidates: ManagerCandidate[];
  act: Act;
  onClose: () => void;
}) {
  const [mandate, setMandate] = useState<Mandate>("lonnsomhet");
  const [busy, setBusy] = useState(false);
  const hire = async (c: ManagerCandidate) => {
    setBusy(true);
    const uid = userId();
    const r = await hireManager(plant, c.slot, mandate);
    setBusy(false);
    if (
      report(act, r, `${c.name} er ny verksjef på ${name} (${MANDATE_NAME[mandate].toLowerCase()}).`, {
        key: "verksjef_ansatt",
        uid,
      })
    )
      onClose();
  };
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Ansett verksjef" onClick={onClose}>
        <div className="g-modal-card g-manager-sheet" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={`Verksjef på ${name}`} icon="hard-hat" onClose={onClose} />
          <p className="g-small-text">
            Velg mandatet først – det er det verksjefen skal jobbe for. Verket gir nå {fmtKr(daily)} per ekte dag i
            utbytte.
          </p>
          <div className="g-manager-mandates" role="radiogroup" aria-label="Mandat">
            {MANDATES.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mandate === m}
                className={`g-manager-mandate${mandate === m ? " is-on" : ""}`}
                onClick={() => setMandate(m)}
              >
                <strong>{MANDATE_NAME[m]}</strong>
                <span className="g-small-text">{MANDATE_ABOUT[m]}</span>
              </button>
            ))}
          </div>
          <h3 className="g-subhead">Dagens kandidater</h3>
          {candidates.length === 0 && (
            <p className="g-muted g-small-text">Ingen flere kandidater i dag. Nye kommer i morgen.</p>
          )}
          <ul className="g-manager-list">
            {candidates.map((c) => {
              const net = netShare(mandate, c) * daily;
              return (
                <li key={c.slot} className="g-manager-cand">
                  <div className="g-manager-cand-head">
                    <strong>{c.name}</strong>
                    <span className="g-small-text">
                      {TRAIT_NAME[c.trait]}: {TRAIT_ABOUT[c.trait]}
                    </span>
                  </div>
                  <StatsLine s={c} />
                  <p className="g-small-text">
                    Passer best til <strong>{MANDATE_NAME[bestMandate(c)].toLowerCase()}</strong>. Lønn{" "}
                    {pct(salaryShare(c))} av utbyttet ({fmtKr(Math.round(salaryShare(c) * daily))} per dag). Med{" "}
                    {MANDATE_NAME[mandate].toLowerCase()}: <strong>{signed(net)} per dag</strong> etter lønnen
                    {modText(mandate, c, modBase)}.
                  </p>
                  <Button disabled={busy} icon="user-plus" onClick={() => void hire(c)}>
                    Ansett
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="g-muted g-small-text">
            Drift og Økonomi gir mer med Lønnsomhet, Drift gjør moderniseringen billigere med Vekst, og Folk hjelper med
            Stabilitet. Ingen er flinke i alt. Verksjefen trives best med et mandat som passer det hen er flink til, og
            begynner å telle fra i morgen.
          </p>
        </div>
      </div>
    </Portal>
  );
}

function ManagerSheet({
  m,
  name,
  daily,
  modBase,
  act,
  onClose,
}: {
  m: PlantManager;
  name: string;
  daily: number;
  modBase: number;
  act: Act;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const canSwitch = realNow() >= m.mandateFrom;
  const severance = Math.round(MANAGERS.severanceDays * m.salary * daily);
  const change = async (to: Mandate) => {
    setBusy(true);
    const r = await setManagerMandate(m.plant, to);
    setBusy(false);
    report(act, r, `${m.name} jobber nå for ${MANDATE_NAME[to].toLowerCase()}.`);
  };
  const dismiss = async () => {
    setBusy(true);
    const r = await dismissManager(m.plant);
    setBusy(false);
    if (report(act, r, `${m.name} har sluttet. Sluttpakken var ${fmtKr(r.ok ? (r.cost ?? 0) : 0)}.`)) onClose();
  };
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Verksjef" onClick={onClose}>
        <div className="g-modal-card g-manager-sheet" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={m.name} icon="hard-hat" onClose={onClose} />
          <p className="g-small-text">
            Verksjef på <strong>{name}</strong>. {TRAIT_NAME[m.trait]}: {TRAIT_ABOUT[m.trait]}.
          </p>
          <StatsLine s={m} />
          <p className="g-small-text">
            <strong>Verksjefen {loyaltyWord(m.loyalty)}.</strong> Hen trives når mandatet passer det hen er flink til
            (best: {MANDATE_NAME[bestMandate(m)].toLowerCase()}), og når du følger rådene i samtalene. Et nytt mandat
            eller svar mot rådet gjør hen mindre fornøyd, og en misfornøyd verksjef kan få tilbud fra en konkurrent.
          </p>
          <p className="g-small-text">
            Lønn {pct(m.salary)} av verkets utbytte. Med {MANDATE_NAME[m.mandate].toLowerCase()} gir verksjefen{" "}
            <strong>{signed(netShare(m.mandate, m) * daily)} per dag</strong> etter lønnen
            {modText(m.mandate, m, modBase)}.
          </p>
          <h3 className="g-subhead">Mandat</h3>
          {!canSwitch && (
            <p className="g-muted g-small-text">
              Kan byttes igjen om {fmtHours(m.mandateFrom - realNow())} (én gang i uka).
            </p>
          )}
          <div className="g-manager-mandates" role="radiogroup" aria-label="Mandat">
            {MANDATES.map((x) => (
              <button
                key={x}
                role="radio"
                aria-checked={m.mandate === x}
                disabled={busy || (!canSwitch && m.mandate !== x)}
                className={`g-manager-mandate${m.mandate === x ? " is-on" : ""}`}
                onClick={() => m.mandate !== x && void change(x)}
              >
                <strong>{MANDATE_NAME[x]}</strong>
                <span className="g-small-text">
                  {MANDATE_ABOUT[x]} {signed(netShare(x, m) * daily)} per dag.
                </span>
              </button>
            ))}
          </div>
          <h3 className="g-subhead">Avslutt</h3>
          {!confirm ? (
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(true)}>
              Avslutt verksjefen
            </Button>
          ) : (
            <>
              <p className="g-small-text">
                Sluttpakken er {fmtKr(severance)} fra konsernkassa, og verket kan ikke få en ny verksjef de neste{" "}
                {MANAGERS.quarantineDays} dagene.
              </p>
              <Button variant="danger" disabled={busy} onClick={() => void dismiss()}>
                Avslutt og betal {fmtKr(severance)}
              </Button>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

/** Kortet på Konsern → Oversikt */
export function ManagersCard({ g, act, status }: { g: GameState; act: Act; status: ManagerStatus | null }) {
  const [sheet, setSheet] = useState<{ kind: "hire" | "manager"; plant: number } | null>(null);
  // Prestasjonene (B-497): verksjefer ansatt før tellerne kom, og en som trives godt, telles fra statusen fra serveren
  const hired = status?.enabled ? status.managers.length : 0;
  const happy = status?.enabled ? status.managers.some((m) => m.loyalty >= 75) : false;
  useEffect(() => {
    const behind = hired > (g.counters.verksjef_ansatt ?? 0);
    const newHappy = happy && !g.counters.verksjef_trives;
    if (!behind && !newHappy) return;
    act((gg) => {
      // Statusen gjelder kontoen som er innlogget nå – bare inn i dens spill (B-426)
      if (!isMine(gg, userId())) return;
      if (behind) gg.counters.verksjef_ansatt = Math.max(gg.counters.verksjef_ansatt ?? 0, hired);
      if (newHappy) gg.counters.verksjef_trives = 1;
    });
  }, [hired, happy, g.counters.verksjef_ansatt, g.counters.verksjef_trives, act]);
  if (!status?.enabled) return null;
  const modBase = (id: number) => {
    const p = g.konsern.plants.find((x) => x.id === id);
    return p ? modCost(p.type, g.researched) : 0;
  };
  const plantName = (id: number) => g.konsern.plants.find((p) => p.id === id)?.name ?? "verket";
  const call = openCall(status);
  const last = status.days[0];
  const hiredCount = status.managers.length;
  const sheetPlant = sheet ? status.plants.find((p) => p.plant === sheet.plant) : null;
  const sheetManager = sheet?.kind === "manager" ? status.managers.find((m) => m.plant === sheet.plant) : null;
  return (
    <div className="g-col-wide g-konsern-managers-col">
      <Card title="Verksjefene" className="g-konsern-managers">
        {call && <CallBox call={call} status={status} plantName={plantName} act={act} />}
        {hiredCount === 0 ? (
          <p className="g-small-text">
            Hvert datterverk kan få en verksjef. Du gir verksjefen et mandat – mer utbytte, billigere modernisering
            eller jevn drift – og 2–3 ganger i uka ringer en av dem og ber deg ta en avgjørelse.
          </p>
        ) : (
          last && (
            <p className="g-small-text">
              Verksjefene ga {signed(last.amount)} til konsernkassa sist utbyttet ble betalt (etter lønnen).
            </p>
          )
        )}
        <ul className="g-manager-plants">
          {status.plants.map((p) => {
            const m = status.managers.find((x) => x.plant === p.plant);
            const q = status.quarantine.find((x) => x.plant === p.plant);
            return (
              <li key={p.plant} className="g-manager-plant">
                <span className="g-manager-plant-name">
                  <strong>{plantName(p.plant)}</strong>
                  <span className="g-muted g-small-text">
                    {m
                      ? `${m.name} · ${MANDATE_NAME[m.mandate]} · ${loyaltyWord(m.loyalty)}`
                      : q
                        ? `Ny verksjef om ${fmtHours(q.until - realNow())}`
                        : "Ingen verksjef"}
                  </span>
                </span>
                {m ? (
                  <Button variant="secondary" onClick={() => setSheet({ kind: "manager", plant: p.plant })}>
                    Mandat
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    icon="user-plus"
                    disabled={!!q}
                    onClick={() => setSheet({ kind: "hire", plant: p.plant })}
                  >
                    Ansett
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <CallHistory status={status} plantName={plantName} />
      </Card>
      {sheet?.kind === "hire" && sheetPlant && (
        <HireSheet
          plant={sheet.plant}
          name={plantName(sheet.plant)}
          daily={sheetPlant.daily}
          modBase={modBase(sheet.plant)}
          candidates={status.candidates}
          act={act}
          onClose={() => setSheet(null)}
        />
      )}
      {sheetManager && sheetPlant && (
        <ManagerSheet
          m={sheetManager}
          name={plantName(sheetManager.plant)}
          daily={sheetPlant.daily}
          modBase={modBase(sheetManager.plant)}
          act={act}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
