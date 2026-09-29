/**
 * Verdenskartet (B-333): «anleggsbildet» for konsernet. En oppdiktet verden med seks regioner rundt et hav, med alle
 * spilleres datterverk og de strategiske selskapene. Trykk på en region (på kartet eller i lista under) for å se hvem
 * som har hva der. Kartet viser andre spillere, så det krever konto (KONTO.md).
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { REGIONS, regionName } from "../game/regions";
import type { GameState, RegionId, SisterType } from "../game/types";
import { getSession, onSessionChange } from "../net/supabase";
import { fetchWorldMap, type MapPlayer, type MapRegion } from "../net/worldMap";
import { AccountFeaturesCard } from "./Account";
import { Card } from "./common";
import { Icon } from "./icons";

/** Formen på hver region i kartet (viewBox 400 × 240), og hvor navnet og merkene står */
const SHAPES: Record<RegionId, { d: string; x: number; y: number }> = {
  nord: { d: "M112 22 Q200 -2 288 22 Q300 50 262 62 Q200 76 140 62 Q100 48 112 22 Z", x: 200, y: 36 },
  jern: { d: "M302 30 Q360 24 386 60 Q392 102 352 112 Q312 104 296 72 Q286 46 302 30 Z", x: 342, y: 64 },
  ost: { d: "M320 126 Q374 116 390 150 Q392 196 350 206 Q310 202 304 166 Q300 136 320 126 Z", x: 348, y: 158 },
  sor: { d: "M122 186 Q200 162 290 186 Q300 216 250 232 Q190 240 142 230 Q102 216 122 186 Z", x: 206, y: 204 },
  vest: { d: "M16 70 Q60 56 96 80 Q112 120 96 160 Q60 180 26 166 Q4 120 16 70 Z", x: 56, y: 110 },
  oy: {
    d: "M176 110 Q198 98 216 112 Q212 130 194 132 Q174 128 176 110 Z M226 136 Q240 128 250 140 Q246 152 232 152 Q220 148 226 136 Z M152 136 Q164 130 174 140 Q170 152 158 152 Q148 148 152 136 Z",
    x: 200,
    y: 96,
  },
};

const TYPE_WORD: Record<SisterType, [string, string]> = {
  stalverk: ["stålverk", "stålverk"],
  storverk: ["storverk", "storverk"],
  kompleks: ["kompleks", "komplekser"],
};

function plantsOf(p: MapPlayer): number {
  return p.stalverk + p.storverk + p.kompleks;
}

/** «2 komplekser, 1 storverk» */
function countText(p: MapPlayer): string {
  const parts = (["kompleks", "storverk", "stalverk"] as SisterType[])
    .filter((t) => p[t] > 0)
    .map((t) => `${p[t]} ${TYPE_WORD[t][p[t] === 1 ? 0 : 1]}`);
  return parts.join(", ") + (p.building > 0 ? ` (${p.building} bygges)` : "");
}

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}

/** Merkene i en region: dine verk først, så de andres, høyst 10; et kompleks er et større merke */
function Markers({ r }: { r: MapRegion }) {
  const shape = SHAPES[r.id];
  const marks: { mine: boolean; big: boolean }[] = [];
  for (const p of r.players)
    for (const t of ["kompleks", "storverk", "stalverk"] as SisterType[])
      for (let i = 0; i < p[t]; i++) marks.push({ mine: p.mine, big: t === "kompleks" });
  const shown = marks.slice(0, 10);
  const rest = marks.length - shown.length;
  const y0 = shape.y + (r.id === "oy" ? 42 : 8);
  const w = shown.length * 9 + (rest > 0 ? 16 : 0);
  let x = shape.x - w / 2;
  return (
    <g aria-hidden="true">
      {r.companies.map((c, i) => (
        <rect
          key={c.id}
          className="g-map-company"
          x={shape.x - 4 + (i - (r.companies.length - 1) / 2) * 12}
          y={shape.y - 27}
          width={8}
          height={8}
          transform={`rotate(45 ${shape.x + (i - (r.companies.length - 1) / 2) * 12} ${shape.y - 23})`}
        />
      ))}
      {shown.map((m, i) => {
        const s = m.big ? 7 : 5;
        const el = (
          <rect
            key={i}
            className={m.mine ? "g-map-mine" : "g-map-other"}
            x={x}
            y={y0 + (7 - s)}
            width={s}
            height={s}
            rx={1}
          />
        );
        x += 9;
        return el;
      })}
      {rest > 0 && (
        <text className="g-map-more" x={x + 1} y={y0 + 7}>
          +{rest}
        </text>
      )}
    </g>
  );
}

function RegionDetail({ g, r }: { g: GameState; r: MapRegion }) {
  const region = REGIONS.find((x) => x.id === r.id)!;
  const mine = g.konsern.plants.filter((p) => p.region === r.id);
  return (
    <div className="g-map-detail">
      <h3 className="g-subhead">{region.name}</h3>
      <p className="g-muted g-small-text">{region.about}</p>
      {r.companies.length > 0 && (
        <ul className="g-map-list">
          {r.companies.map((c) => (
            <li key={c.id}>
              <Icon name="landmark" />
              <span>
                <strong>{c.name}</strong>{" "}
                <span className="g-muted">
                  {c.mine ? "– ditt" : c.owner ? `– eies av ${c.owner}` : "– ingen eier ennå"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {r.players.length === 0 ? (
        <p className="g-muted g-small-text">Ingen verk her ennå.</p>
      ) : (
        <ul className="g-map-list">
          {r.players.map((p) => (
            <li key={p.nick} className={p.mine ? "is-mine" : undefined}>
              <Icon name="factory" />
              <span>
                <strong>{p.mine ? `${p.nick} (deg)` : p.nick}</strong>
                {p.title && <span className="g-muted"> · {p.title}</span>}
                <span className="g-map-count">{countText(p)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {mine.length > 0 && <p className="g-muted g-small-text">Dine verk her: {mine.map((p) => p.name).join(", ")}.</p>}
    </div>
  );
}

/** Konsern → Kart */
export function WorldMapPanel({ g }: { g: GameState }) {
  const session = useSession();
  const user = session?.user.id ?? null;
  const [map, setMap] = useState<MapRegion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<RegionId | null>(null);

  const load = useCallback(
    () =>
      fetchWorldMap().then(
        (m) => {
          setMap(m);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [],
  );
  useEffect(() => {
    if (!user) return;
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [user, load]);

  if (!session)
    return (
      <div className="g-col-wide">
        <AccountFeaturesCard features={["verdenskart"]} />
      </div>
    );

  // Standard: regionen der du har flest verk
  const count = (r: MapRegion) => r.players.filter((p) => p.mine).reduce((a, p) => a + plantsOf(p), 0);
  const chosen = sel ?? (map ? [...map].sort((a, b) => count(b) - count(a))[0].id : "nord");
  const current = map?.find((r) => r.id === chosen) ?? null;

  return (
    <div className="g-col-wide g-worldmap-col">
      <Card title="Verden" className="g-worldmap-card">
        <p className="g-muted g-small-text">
          Alle konsernene i verden. Trykk på en region for å se hvem som har verk og selskaper der.
        </p>
        <div className="g-worldmap">
          <div className="g-worldmap-map">
            <svg viewBox="0 0 400 240" role="img" aria-label="Kart over verden med seks regioner">
              <rect className="g-map-sea" x={0} y={0} width={400} height={240} rx={12} />
              {REGIONS.map((r) => {
                const s = SHAPES[r.id];
                const data = map?.find((x) => x.id === r.id);
                return (
                  <g
                    key={r.id}
                    className={`g-map-region${chosen === r.id ? " is-on" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={regionName(r.id)}
                    aria-pressed={chosen === r.id}
                    onClick={() => setSel(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSel(r.id);
                      }
                    }}
                  >
                    <path className="g-map-land" d={s.d} />
                    <text className="g-map-label" x={s.x} y={r.id === "oy" ? s.y + 4 : s.y}>
                      {r.name}
                    </text>
                    {data && <Markers r={data} />}
                  </g>
                );
              })}
            </svg>
            <div className="g-map-legend g-small-text g-muted" aria-hidden="true">
              <span>
                <i className="g-map-key is-mine" /> Dine verk
              </span>
              <span>
                <i className="g-map-key is-other" /> Andres verk
              </span>
              <span>
                <i className="g-map-key is-company" /> Selskap
              </span>
            </div>
            <div className="g-map-regions">
              {REGIONS.map((r) => {
                const data = map?.find((x) => x.id === r.id);
                const n = data ? data.players.reduce((a, p) => a + plantsOf(p), 0) : 0;
                return (
                  <button
                    key={r.id}
                    className={chosen === r.id ? "is-on" : undefined}
                    aria-pressed={chosen === r.id}
                    onClick={() => setSel(r.id)}
                  >
                    <span>{r.name}</span>
                    <span className="g-muted">{data ? `${n} verk` : "…"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="g-worldmap-side">
            {current ? (
              <RegionDetail g={g} r={current} />
            ) : (
              <p className="g-muted g-small-text">
                {failed ? "Fikk ikke hentet kartet. Prøver igjen snart." : "Henter kartet …"}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
