/**
 * Verdenskartet (B-333, ny tegning B-405): «anleggsbildet» for konsernet. En oppdiktet verden med seks regioner rundt
 * et hav, med alle spilleres datterverk og de strategiske selskapene: kystlinjer, sjøkartrutenett, skipsleder,
 * regionnavn med undertekst, tetthet som fyllfarge, merker i fast rutenett (dine først, «bygges» stiplet), filter
 * Alle/Dine/Selskaper, og et sidepanel med tre tall og «Bygg neste verk i …» som setter regionen under Utvid.
 * Kartet viser andre spillere, så det krever konto (KONTO.md).
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { REGIONS, regionName } from "../game/regions";
import type { GameState, RegionId, SisterType } from "../game/types";
import { getSession, onSessionChange } from "../net/supabase";
import { fetchWorldMap, type MapPlayer, type MapRegion } from "../net/worldMap";
import { AccountFeaturesCard } from "./Account";
import { Card } from "./common";
import { Icon } from "./icons";
import { setBuildRegion } from "./konsernRun";
import { PlayerName } from "./Profile";

/** Formen på hver region (viewBox 400 × 300): kystlinje, navnets plass (lx, ly) og ankeret for merkene (mx, my) */
const SHAPES: Record<RegionId, { d: string; lx: number; ly: number; mx: number; my: number }> = {
  nord: {
    d: "M96 28 L130 16 L158 24 L172 12 L196 20 L214 10 L240 22 L262 14 L290 26 L298 46 L284 58 L256 54 L236 66 L212 58 L186 70 L160 60 L138 68 L110 58 L94 44 Z",
    lx: 196,
    ly: 30,
    mx: 150,
    my: 48,
  },
  jern: {
    d: "M306 40 L336 30 L364 38 L388 56 L394 90 L384 118 L360 128 L330 120 L310 100 L300 70 Z",
    lx: 347,
    ly: 66,
    mx: 318,
    my: 104,
  },
  ost: {
    d: "M312 136 L346 130 L378 138 L394 160 L392 196 L376 216 L348 222 L320 212 L304 188 L302 160 Z",
    lx: 347,
    ly: 148,
    mx: 318,
    my: 170,
  },
  sor: {
    d: "M118 226 L150 212 L190 220 L230 210 L270 220 L300 232 L296 262 L268 282 L224 290 L178 288 L136 278 L112 254 Z",
    lx: 206,
    ly: 240,
    mx: 206,
    my: 254,
  },
  vest: {
    d: "M10 86 L40 72 L72 78 L96 96 L104 124 L92 150 L98 176 L80 198 L48 206 L18 190 L6 156 L12 120 Z",
    lx: 54,
    ly: 96,
    mx: 30,
    my: 150,
  },
  oy: {
    d: "M176 104 L198 94 L220 106 L214 126 L190 130 L172 118 Z M226 138 L244 132 L254 146 L240 158 L222 152 Z M148 138 L166 132 L178 146 L164 160 L146 152 Z",
    lx: 200,
    ly: 176,
    mx: 188,
    my: 108,
  },
};

const TYPE_WORD: Record<SisterType, [string, string]> = {
  stalverk: ["stålverk", "stålverk"],
  storverk: ["storverk", "storverk"],
  kompleks: ["kompleks", "komplekser"],
};

type Filter = "alle" | "dine" | "selskap";

function plantsOf(p: MapPlayer): number {
  return p.stalverk + p.storverk + p.kompleks;
}

function countText(p: MapPlayer): string {
  const parts = (["kompleks", "storverk", "stalverk"] as SisterType[])
    .filter((t) => p[t] > 0)
    .map((t) => `${p[t]} ${TYPE_WORD[t][p[t] === 1 ? 0 : 1]}`);
  return parts.join(", ") + (p.building > 0 ? ` · ${p.building} bygges` : "");
}

/** Kubene i lista: ett per verk, største først; de som bygges (alt talt med i typen), stiplet til slutt */
function cubesOf(p: MapPlayer): string[] {
  const cubes = [
    ...Array<string>(p.kompleks).fill("is-kompleks"),
    ...Array<string>(p.storverk).fill("is-storverk"),
    ...Array<string>(p.stalverk).fill(""),
  ];
  for (let i = 0; i < Math.min(p.building, cubes.length); i++)
    cubes[cubes.length - 1 - i] = `${cubes[cubes.length - 1 - i]} is-building`.trim();
  return cubes.slice(0, 12);
}

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}

/** Merkene i en region i et fast rutenett (5 per rad, to rader): dine først, så andres, så selskapene, så «+N» */
function Markers({ r, filter }: { r: MapRegion; filter: Filter }) {
  const s = SHAPES[r.id];
  const items: { kind: SisterType | "selskap"; mine: boolean; building: boolean }[] = [];
  const sorted = [...r.players].sort((a, b) => Number(b.mine) - Number(a.mine));
  if (filter !== "selskap")
    for (const p of sorted) {
      if (filter === "dine" && !p.mine) continue;
      // Verk som bygges, er alt talt med i typen sin (world_map): de siste merkene til spilleren blir stiplet
      const own: typeof items = [];
      for (const t of ["kompleks", "storverk", "stalverk"] as SisterType[])
        for (let i = 0; i < p[t]; i++) own.push({ kind: t, mine: p.mine, building: false });
      for (let i = 0; i < Math.min(p.building, own.length); i++) own[own.length - 1 - i].building = true;
      items.push(...own);
    }
  if (filter !== "dine") for (const c of r.companies) items.push({ kind: "selskap", mine: c.mine, building: false });
  const shown = items.slice(0, 10);
  const rest = items.length - shown.length;
  const pitch = 10;
  return (
    <g aria-hidden="true">
      {shown.map((it, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const size = it.kind === "kompleks" ? 8 : it.kind === "storverk" ? 7 : 6;
        const x = s.mx + col * pitch;
        const y = s.my + row * pitch + (8 - size);
        if (it.kind === "selskap")
          return (
            <rect
              key={i}
              className={`g-map-company${it.mine ? " is-mine" : ""}`}
              x={x + 1}
              y={y - 1}
              width={6}
              height={6}
              transform={`rotate(45 ${x + 4} ${y + 2})`}
            />
          );
        return (
          <rect
            key={i}
            className={`g-map-plant${it.mine ? " is-mine" : ""}${it.building ? " is-building" : ""}`}
            x={x}
            y={y}
            width={size}
            height={size}
            rx={1.5}
          />
        );
      })}
      {rest > 0 && (
        <text className="g-map-more" x={s.mx + 5 * pitch + 2} y={s.my + 7}>
          +{rest}
        </text>
      )}
    </g>
  );
}

function RegionDetail({ g, r, onBuildHere }: { g: GameState; r: MapRegion; onBuildHere: () => void }) {
  const region = REGIONS.find((x) => x.id === r.id)!;
  const mine = r.players.filter((p) => p.mine).reduce((a, p) => a + plantsOf(p), 0);
  const plants = r.players.reduce((a, p) => a + plantsOf(p), 0);
  const players = [...r.players].sort((a, b) => Number(b.mine) - Number(a.mine) || plantsOf(b) - plantsOf(a));
  return (
    <section className="g-map-detail">
      <header className="g-map-detail-head">
        <div>
          <h2 className="ds-display g-map-detail-title">{region.name}</h2>
          <p className="g-muted g-small-text">{region.about}</p>
        </div>
        <span className={`ds-status ${mine ? "is-info" : ""}`}>
          <Icon name="factory" />
          {mine ? `${mine} ${mine === 1 ? "ditt verk" : "dine verk"}` : "Ingen verk her"}
        </span>
      </header>
      <dl className="g-map-stats">
        <div>
          <dt>Verk</dt>
          <dd className="ds-display">{plants}</dd>
        </div>
        <div>
          <dt>Konsern</dt>
          <dd className="ds-display">{r.players.length}</dd>
        </div>
        <div>
          <dt>Selskaper</dt>
          <dd className="ds-display">{r.companies.length}</dd>
        </div>
      </dl>
      {r.companies.length > 0 && (
        <div className="g-map-group">
          <h3 className="g-map-group-head">Selskaper i regionen</h3>
          {r.companies.map((c) => (
            <div key={c.id} className="g-map-row is-company">
              <span className="g-map-avatar is-company">
                <Icon name="landmark" />
              </span>
              <span className="g-map-row-main">
                <strong>{c.name}</strong>
                <span className="g-muted g-small-text">
                  {c.mine ? (
                    "Ditt selskap"
                  ) : c.owner ? (
                    <>
                      Eies av <PlayerName nick={c.owner} />
                    </>
                  ) : (
                    "Ingen eier ennå – anbud åpent"
                  )}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="g-map-group">
        <h3 className="g-map-group-head">Konsern med verk her{r.players.length ? ` (${r.players.length})` : ""}</h3>
        {players.length === 0 ? (
          <p className="g-map-empty">Ingen verk her ennå.</p>
        ) : (
          players.map((p) => (
            <div key={p.nick} className={`g-map-row${p.mine ? " is-mine" : ""}`}>
              <span className="g-map-avatar ds-display">{p.nick[0]}</span>
              <span className="g-map-row-main">
                <span className="g-map-row-name">
                  <strong>{p.mine ? `${p.nick} (deg)` : <PlayerName nick={p.nick} />}</strong>
                  {p.title && <span className="g-muted g-small-text">{p.title}</span>}
                </span>
                <span className="g-muted g-small-text">{countText(p)}</span>
              </span>
              <span className="g-map-cubes" aria-hidden="true">
                {cubesOf(p).map((c, i) => (
                  <i key={i} className={c || undefined} />
                ))}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="g-map-actions">
        <button className="g-primary" onClick={onBuildHere}>
          Bygg neste verk i {region.name}
        </button>
      </div>
      <p className="g-muted g-small-text">
        Verk i samme region som et selskap du eier, gir mer Kontroll over det.
        {g.konsern.plants.some((p) => p.region === r.id) &&
          ` Dine verk her: ${g.konsern.plants
            .filter((p) => p.region === r.id)
            .map((p) => p.name)
            .join(", ")}.`}
      </p>
    </section>
  );
}

/** Konsern → Kart */
export function WorldMapPanel({ g, onBuild }: { g: GameState; onBuild?: () => void }) {
  const session = useSession();
  const user = session?.user.id ?? null;
  const [map, setMap] = useState<MapRegion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<RegionId | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");

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

  const mineIn = (r: MapRegion) => r.players.filter((p) => p.mine).reduce((a, p) => a + plantsOf(p), 0);
  const chosen = sel ?? (map ? [...map].sort((a, b) => mineIn(b) - mineIn(a))[0].id : "nord");
  const current = map?.find((r) => r.id === chosen) ?? null;
  const buildHere = () => {
    setBuildRegion(chosen);
    onBuild?.();
  };

  return (
    <div className="g-col-wide g-worldmap-col">
      <Card
        title="Verden"
        className="g-worldmap-card"
        right={
          <div className="g-map-filters" role="group" aria-label="Vis">
            {(
              [
                ["alle", "Alle"],
                ["dine", "Dine"],
                ["selskap", "Selskaper"],
              ] as [Filter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={`g-map-filter is-${id}${filter === id ? " is-on" : ""}`}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                <i aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="g-worldmap">
          <div className="g-worldmap-map">
            <svg viewBox="0 0 400 300" role="img" aria-label="Kart over verden med seks regioner">
              <defs>
                <pattern id="g-map-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M25 0H0V25" className="g-map-gridline" />
                </pattern>
                <radialGradient id="g-map-sea" cx="50%" cy="48%" r="70%">
                  <stop offset="0" className="g-map-sea-in" />
                  <stop offset="1" className="g-map-sea-out" />
                </radialGradient>
                <filter id="g-map-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              <rect width={400} height={300} fill="url(#g-map-sea)" />
              <rect width={400} height={300} fill="url(#g-map-grid)" />
              <g className="g-map-routes">
                <path d="M70 150 Q130 120 180 150 T300 170" />
                <path d="M200 70 Q215 110 205 125" />
                <path d="M225 160 Q270 200 320 180" />
              </g>
              <g className="g-map-compass" transform="translate(372 272)">
                <circle r={11} />
                <path d="M0 -9 L3 0 L0 9 L-3 0 Z" className="g-map-compass-needle" />
                <path d="M0 -9 L3 0 L-3 0 Z" className="g-map-compass-north" />
                <text y={-14}>N</text>
              </g>
              {REGIONS.map((r) => {
                const s = SHAPES[r.id];
                const data = map?.find((x) => x.id === r.id);
                const plants = data ? data.players.reduce((a, p) => a + plantsOf(p), 0) : 0;
                const dens = Math.min(4, Math.ceil(plants / 2));
                const on = chosen === r.id;
                return (
                  <g
                    key={r.id}
                    className={`g-map-region dens-${dens}${on ? " is-on" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${regionName(r.id)}: ${plants} verk`}
                    aria-pressed={on}
                    onClick={() => setSel(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSel(r.id);
                      }
                    }}
                  >
                    <path className="g-map-halo" d={s.d} filter="url(#g-map-glow)" />
                    <path className="g-map-land" d={s.d} />
                    <path className="g-map-rim" d={s.d} transform="translate(-1 -1)" />
                    <text className="g-map-label ds-display" x={s.lx} y={s.ly}>
                      {r.name.toUpperCase()}
                    </text>
                    <text className="g-map-sub" x={s.lx} y={s.ly + 10}>
                      {!data ? "…" : plants === 0 ? "ubebygd" : `${plants} verk · ${data.players.length} konsern`}
                    </text>
                    {data && <Markers r={data} filter={filter} />}
                  </g>
                );
              })}
              {/* Terreng: fjell i Jernåsen, skog i Østskogen, åkre på Sørsletta, kai i Vestbukta */}
              <g className="g-map-terrain">
                <path d="M318 92 L326 78 L334 92 M336 96 L343 84 L350 96 M352 100 L358 90 L364 100" />
                <path d="M150 262 H190 M156 270 H196 M150 278 H184" />
                <circle cx={330} cy={196} r={2.2} />
                <circle cx={340} cy={203} r={2.2} />
                <circle cx={350} cy={195} r={2.2} />
                <circle cx={362} cy={202} r={2.2} />
                <circle cx={372} cy={192} r={2.2} />
                <rect x={88} y={126} width={14} height={3} />
                <rect x={94} y={121} width={2} height={5} />
              </g>
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
              <span>
                <i className="g-map-key is-building" /> Bygges
              </span>
            </div>
          </div>
          <div className="g-worldmap-side">
            <div className="g-map-regions" role="tablist" aria-label="Regioner">
              {REGIONS.map((r) => {
                const data = map?.find((x) => x.id === r.id);
                const n = data ? data.players.reduce((a, p) => a + plantsOf(p), 0) : 0;
                const mine = data ? mineIn(data) : 0;
                return (
                  <button
                    key={r.id}
                    role="tab"
                    className={chosen === r.id ? "is-on" : undefined}
                    aria-selected={chosen === r.id}
                    onClick={() => setSel(r.id)}
                  >
                    <span>{r.name}</span>
                    <span className="g-muted">
                      {!data ? "…" : n === 0 ? "Ingen verk" : `${n} verk${mine ? ` · ${mine} dine` : ""}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {current ? (
              <RegionDetail g={g} r={current} onBuildHere={buildHere} />
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
