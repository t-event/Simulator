/**
 * Anleggsbildet: garasjen som vokser til et storverk.
 *
 * Bildet tegnes ut fra spilltilstanden: bygningene kommer etter hvert som du
 * bygger ut, skrapdungen og ferdigvarelageret følger beholdningen, ovnene
 * gløder når de smelter, og himmelen følger klokka.
 */
import type { KeyboardEvent } from "react";
import { has, hourOfDay, isOpen, rollingActive, type PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import { cosmeticOn, facadeColors } from "../game/cosmetics";
import { STATION_NAMES, type Station } from "./stations";

interface Props {
  g: GameState;
  stats: PlantStats;
  /** Stedene i bildet kan trykkes og åpner utstyret der (UI-4d, B-242). Uten den er bildet bare et bilde */
  onStation?: (s: Station) => void;
}

/** Område i bildet som åpner et sted (B-242): usynlig flate med ramme ved pek og fokus */
function Hit({
  station,
  x,
  y,
  w,
  h,
  onStation,
}: {
  station: Station;
  x: number;
  y: number;
  w: number;
  h: number;
  onStation?: (s: Station) => void;
}) {
  if (!onStation) return null;
  const open = () => onStation(station);
  const key = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  return (
    <g
      className="scene-hit"
      role="button"
      tabIndex={0}
      aria-label={`${STATION_NAMES[station]} – åpne utstyret`}
      onClick={open}
      onKeyDown={key}
    >
      <rect x={x} y={y} width={w} height={h} rx={3} />
    </g>
  );
}

/** Skraptrucken som kjører forbi når verket går (B-242). «end» er hvor veien slutter (havna på storverket) */
function Truck({ end }: { end: number }) {
  return (
    <g className="scene-truck" style={{ ["--truck-end" as string]: `${end}px` }}>
      <rect x={0} y={183} width={22} height={9} rx={1} fill="#c9892e" />
      <path d="M2 183 L6 178 L18 178 L21 183 Z" fill="#7a6250" />
      <rect x={22} y={185} width={9} height={7} rx={1} fill="#d8a13a" />
      <rect x={25} y={186} width={4} height={3} fill="#9fc3e0" />
      <circle cx={6} cy={193} r={2.4} fill="#1b1d21" />
      <circle cx={17} cy={193} r={2.4} fill="#1b1d21" />
      <circle cx={27} cy={193} r={2.4} fill="#1b1d21" />
    </g>
  );
}

/** Kranløperen med magneten som går fram og tilbake over skrapgården når verket går (B-242) */
function Trolley({ x, y, span, moving }: { x: number; y: number; span: number; moving: boolean }) {
  return (
    <g className={moving ? "scene-trolley is-moving" : "scene-trolley"} style={{ ["--span" as string]: `${span}px` }}>
      <rect x={x - 4} y={y - 2} width={8} height={4} fill="#c79a22" />
      <line x1={x} y1={y + 2} x2={x} y2={y + 20} stroke="#999" />
      <rect x={x - 4} y={y + 20} width={8} height={3} rx={1} fill="#50565e" />
    </g>
  );
}

function skyColors(hour: number): [string, string] {
  if (hour < 5 || hour >= 22) return ["#0b1324", "#18233a"];
  if (hour < 7) return ["#29324f", "#b0705a"];
  if (hour < 18) return ["#3d6c9e", "#8fb7d9"];
  if (hour < 20) return ["#3b4f7a", "#d08a5c"];
  return ["#162038", "#39405e"];
}

function Smoke({ x, y, active, scale = 1 }: { x: number; y: number; active: boolean; scale?: number }) {
  if (!active) return null;
  return (
    <g className="scene-smoke" transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle className="puff puff-1" cx={0} cy={0} r={5} />
      <circle className="puff puff-2" cx={0} cy={0} r={6} />
      <circle className="puff puff-3" cx={0} cy={0} r={7} />
    </g>
  );
}

function Windows({ x, y, cols, lit }: { x: number; y: number; cols: number; lit: boolean }) {
  return (
    <g>
      {Array.from({ length: cols }, (_, i) => (
        <rect key={i} x={x + i * 12} y={y} width={7} height={6} className={lit ? "win-lit" : "win-dark"} />
      ))}
    </g>
  );
}

function Person({ x, color = "#e8c07a" }: { x: number; color?: string }) {
  return (
    <g transform={`translate(${x} 178)`}>
      <circle cx={0} cy={-13} r={2.4} fill="#f0d0b0" />
      <rect x={-2.2} y={-10.5} width={4.4} height={6.5} rx={1} fill={color} />
      <rect x={-2} y={-4} width={1.6} height={4} fill="#334" />
      <rect x={0.4} y={-4} width={1.6} height={4} fill="#334" />
    </g>
  );
}

/** Mønet på hovedhallen og taklinja per nivå – der flagget og lyslenka henges (B-151) */
const ROOF: { apex: [number, number]; line: [number, number][] }[] = [
  {
    apex: [238, 102],
    line: [
      [184, 130],
      [238, 102],
      [292, 130],
    ],
  },
  {
    apex: [195, 96],
    line: [
      [170, 112],
      [195, 96],
      [220, 112],
      [245, 96],
      [270, 112],
      [295, 96],
      [320, 112],
    ],
  },
  {
    apex: [185, 80],
    line: [
      [116, 100],
      [185, 80],
      [254, 100],
      [250, 118],
      [310, 104],
      [370, 118],
    ],
  },
  {
    apex: [190, 50],
    line: [
      [126, 70],
      [190, 50],
      [254, 70],
      [250, 100],
      [305, 86],
      [360, 100],
    ],
  },
];

function Flag({ x, y, color = "#d23b3b" }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 22} stroke="#d8dde3" strokeWidth={1.2} />
      <path className="scene-flag" d={`M${x} ${y - 22} q 7 -3 14 0 t 0 9 q -7 3 -14 0 Z`} fill={color} />
    </g>
  );
}

/** Stjerna over verket (sesongstigen, B-173) */
function Star({ x, y }: { x: number; y: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 3 : 7.5;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return <polygon className="scene-star" points={pts} fill="#ffd24a" stroke="#fff3c0" strokeWidth={0.6} />;
}

/** Sesongpokalen foran verket (sesongstigen, B-173) */
function Trophy({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 178)`}>
      <rect x={-6} y={-4} width={12} height={4} fill="#6b5a2a" />
      <rect x={-1.5} y={-10} width={3} height={6} fill="#d4af37" />
      <path d="M -7 -22 h 14 v 4 q 0 8 -7 8 q -7 0 -7 -8 Z" fill="#e6c34a" />
      <path d="M -7 -20 q -4 0 -4 4 q 0 3 4 3" fill="none" stroke="#e6c34a" strokeWidth={1.2} />
      <path d="M 7 -20 q 4 0 4 4 q 0 3 -4 3" fill="none" stroke="#e6c34a" strokeWidth={1.2} />
    </g>
  );
}

const LIGHT_COLORS = ["#ff5a5a", "#ffd24a", "#5ad1ff", "#7dff7a"];

function Lights({ line, night }: { line: [number, number][]; night: boolean }) {
  const dots: [number, number][] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [x1, y1] = line[i];
    const [x2, y2] = line[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 9));
    for (let k = 0; k < n; k++) dots.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
  }
  return (
    <g className={night ? "scene-lights is-night" : "scene-lights"}>
      <polyline points={line.map((p) => p.join(",")).join(" ")} fill="none" stroke="#333a44" strokeWidth={0.6} />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y + 1.5} r={1.6} fill={LIGHT_COLORS[i % LIGHT_COLORS.length]} />
      ))}
    </g>
  );
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 178) scale(${s})`}>
      <rect x={-1.5} y={-8} width={3} height={8} fill="#5a3d28" />
      <circle cx={0} cy={-14} r={7} fill="#2f7d3a" />
      <circle cx={-4} cy={-10} r={5} fill="#2a6f34" />
      <circle cx={4} cy={-11} r={5} fill="#358a41" />
    </g>
  );
}

function SolarPanels({ from, to }: { from: [number, number]; to: [number, number] }) {
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.floor((len - 8) / 11);
  return (
    <g transform={`translate(${from[0]} ${from[1]}) rotate(${angle})`}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={5 + i * 11} y={-4} width={9} height={3.4} fill="#1f3f7a" stroke="#8fb0e0" strokeWidth={0.4} />
      ))}
    </g>
  );
}

function WindTurbine({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 1.6} ${y} L${x - 0.8} ${y - 42} L${x + 0.8} ${y - 42} L${x + 1.6} ${y} Z`} fill="#e3e7ec" />
      <g className="scene-rotor" style={{ transformOrigin: `${x}px ${y - 42}px` }}>
        {[0, 120, 240].map((a) => (
          <path
            key={a}
            d={`M${x} ${y - 42} L${x - 1.4} ${y - 60} L${x} ${y - 63} L${x + 1.2} ${y - 60} Z`}
            fill="#f2f4f6"
            transform={`rotate(${a} ${x} ${y - 42})`}
          />
        ))}
      </g>
      <circle cx={x} cy={y - 42} r={1.6} fill="#c8ced6" />
    </g>
  );
}

function Statue({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 178)`}>
      <rect x={-7} y={-6} width={14} height={6} fill="#8a8f96" />
      <rect x={-5} y={-9} width={10} height={3} fill="#a1a7ae" />
      <circle cx={0} cy={-22} r={2.8} fill="#b8c2cc" />
      <rect x={-2.6} y={-19} width={5.2} height={8} rx={1} fill="#b8c2cc" />
      <line x1={2.6} y1={-18} x2={6} y2={-24} stroke="#b8c2cc" strokeWidth={1.8} />
      <rect x={-2.4} y={-11} width={1.8} height={2} fill="#b8c2cc" />
      <rect x={0.6} y={-11} width={1.8} height={2} fill="#b8c2cc" />
    </g>
  );
}

function Fireworks() {
  const bursts: [number, number, string, number][] = [
    [90, 38, "#ff6b6b", 0],
    [330, 28, "#ffd24a", 0.9],
    [420, 52, "#6bd6ff", 1.7],
  ];
  return (
    <g>
      {bursts.map(([x, y, c, d]) => (
        <g key={x} className="scene-firework" style={{ animationDelay: `${d}s`, transformOrigin: `${x}px ${y}px` }}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={x + Math.cos(a) * 3}
                y1={y + Math.sin(a) * 3}
                x2={x + Math.cos(a) * 11}
                y2={y + Math.sin(a) * 11}
                stroke={c}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

export function PlantScene({ g, stats, onStation }: Props) {
  const hour = hourOfDay(g);
  const [skyTop, skyBottom] = skyColors(hour);
  const open = isOpen(g, stats.hours);
  const melting = g.furnaces.some((f) => f.heat);
  const casting = g.castQueue.length > 0;
  const stage = g.stage;
  const yardFill = stats.yardT > 0 ? Math.min(1, stats.yardUsed / stats.yardT) : 0;
  const storeFill = stats.storeT > 0 ? Math.min(1, stats.storeUsed / stats.storeT) : 0;
  const people = Math.min(14, g.workers.length + (stats.ownerWorks ? 1 : 0));
  const night = hour < 6 || hour >= 20;
  // Pynten (B-151)
  const roof = ROOF[Math.min(stage, 3)];
  const facade = facadeColors(g);
  const wallA = (base: string) => facade?.[0] ?? base;
  const wallB = (base: string) => facade?.[1] ?? base;
  const pipeFill = (base: string) => (cosmeticOn(g, "gullpipe") ? "#d4af37" : base);
  const groundEnd = stage >= 4 ? 395 : 470;
  // Ovnene som smelter nå, hver med sin pipe på stålverket og storverket (B-242)
  const heats = g.furnaces.map((f) => !!f.heat);
  const rolling = rollingActive(g) && open && stage >= 3;

  return (
    <svg className="plant-scene" viewBox="0 0 480 210" role="img" aria-label={`Anlegget: ${stats.stage.name}`}>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.5" stopColor="#ff8a1e" />
          <stop offset="1" stopColor="#ff5a00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={480} height={210} fill="url(#sky)" />
      {night && (
        <g fill="#fff" opacity={0.7}>
          <circle cx={40} cy={20} r={0.8} />
          <circle cx={120} cy={35} r={0.6} />
          <circle cx={260} cy={15} r={0.8} />
          <circle cx={400} cy={28} r={0.7} />
          <circle cx={450} cy={12} r={0.6} />
        </g>
      )}
      {/* Åsene bak */}
      <path d="M0 150 Q 80 110 170 140 T 330 130 T 480 140 L480 180 L0 180 Z" fill="#23303f" opacity={0.8} />
      {cosmeticOn(g, "fyrverkeri") && night && <Fireworks />}
      {cosmeticOn(g, "vind") && <WindTurbine x={70} y={128} />}
      {cosmeticOn(g, "traer") && (
        <g>
          {[36, 104, 330, 372, 452]
            .filter((x) => x < groundEnd)
            .map((x, i) => (
              <Tree key={x} x={x} s={i % 2 ? 0.85 : 1} />
            ))}
        </g>
      )}

      {/* Havn på storverket */}
      {stage >= 4 && (
        <g>
          <rect x={400} y={176} width={80} height={34} fill="#1d4466" />
          <g className="scene-ship">
            <path d="M410 170 L470 170 L462 180 L416 180 Z" fill="#6b3a2a" />
            <rect x={425} y={160} width={22} height={10} fill="#cfd6de" />
            <rect x={440} y={150} width={4} height={10} fill="#8a939e" />
          </g>
          {/* Kaikran som laster skipet (B-242) */}
          <g stroke="#e0b030" strokeWidth={1.6}>
            <line x1={404} y1={178} x2={404} y2={128} />
            <line x1={398} y1={130} x2={452} y2={130} />
          </g>
          <line x1={432} y1={130} x2={432} y2={152} stroke="#999" />
        </g>
      )}

      {/* Bakken */}
      <rect x={0} y={178} width={stage >= 4 ? 400 : 480} height={32} fill="#2b2f36" />
      {stage >= 3 && (
        <g stroke="#6d6f74" strokeWidth={1.2}>
          <line x1={0} y1={196} x2={stage >= 4 ? 400 : 480} y2={196} />
          <line x1={0} y1={200} x2={stage >= 4 ? 400 : 480} y2={200} />
        </g>
      )}

      {/* Skrapdunge */}
      {yardFill > 0.001 && (
        <path
          d={`M${stage >= 2 ? 18 : 128} 178 L${(stage >= 2 ? 18 : 128) + 30 + 50 * yardFill} ${178 - (8 + 36 * yardFill) * (stage >= 2 ? 1 : 0.5)} L${(stage >= 2 ? 18 : 128) + 60 + 100 * yardFill} 178 Z`}
          fill="#6b5b4b"
          stroke="#8a735a"
          strokeWidth={0.8}
        />
      )}

      {stage === 0 && (
        <g>
          {/* Garasjen */}
          <rect x={190} y={128} width={96} height={50} fill={wallA("#8b8f96")} />
          <path d="M184 130 L238 102 L292 130 Z" fill="#5a3f33" />
          <rect x={206} y={142} width={54} height={36} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={233} cy={166} r={16} fill="url(#glow)" />}
          <rect x={268} y={140} width={12} height={10} className={open ? "win-lit" : "win-dark"} />
          <rect x={272} y={96} width={6} height={20} fill={pipeFill("#555a61")} />
          <Smoke x={275} y={92} active={melting} scale={0.7} />
        </g>
      )}

      {stage === 1 && (
        <g>
          <rect x={170} y={112} width={150} height={66} fill={wallA("#7d8791")} />
          <path
            d="M170 112 L195 96 L195 112 L220 96 L220 112 L245 96 L245 112 L270 96 L270 112 L295 96 L295 112 L320 96 L320 112 Z"
            fill="#4c5560"
          />
          <rect x={186} y={140} width={40} height={38} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={206} cy={165} r={16} fill="url(#glow)" />}
          <Windows x={240} y={128} cols={6} lit={open} />
          <rect x={300} y={78} width={8} height={34} fill={pipeFill("#555a61")} />
          <Smoke x={304} y={74} active={melting} scale={0.8} />
        </g>
      )}

      {stage === 2 && (
        <g>
          {/* Smeltehall og støpehall */}
          <rect x={120} y={100} width={130} height={78} fill={wallA("#7a838d")} />
          <path d="M116 100 L185 80 L254 100 Z" fill="#4c5560" />
          <rect x={250} y={118} width={120} height={60} fill={wallB("#6d7680")} />
          <path d="M250 118 L310 104 L370 118 Z" fill="#454d57" />
          <rect x={140} y={140} width={42} height={38} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={161} cy={164} r={18} fill="url(#glow)" />}
          {casting && <circle className="scene-glow" cx={300} cy={168} r={10} fill="url(#glow)" />}
          <Windows x={196} y={118} cols={4} lit={open} />
          <Windows x={262} y={132} cols={8} lit={open} />
          <rect x={226} y={58} width={10} height={42} fill={pipeFill("#555a61")} />
          <Smoke x={231} y={54} active={melting} />
          {/* Kran over skrapet */}
          <g stroke="#e0b030" strokeWidth={2}>
            <line x1={20} y1={120} x2={20} y2={178} />
            <line x1={110} y1={120} x2={110} y2={178} />
            <line x1={16} y1={120} x2={114} y2={120} />
          </g>
          <Trolley x={30} y={120} span={70} moving={open} />
        </g>
      )}

      {stage >= 3 && (
        <g>
          {/* Smelteverk */}
          <rect x={130} y={70} width={120} height={108} fill={wallA("#76808b")} />
          <path d="M126 70 L190 50 L254 70 Z" fill="#48515c" />
          <rect x={150} y={132} width={46} height={46} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={173} cy={158} r={22} fill="url(#glow)" />}
          <Windows x={204} y={90} cols={3} lit={open} />
          <Windows x={204} y={104} cols={3} lit={open} />
          {/* Pipe */}
          <rect x={236} y={16} width={12} height={54} fill={pipeFill("#8c949d")} />
          <rect x={236} y={22} width={12} height={4} fill="#c0392b" />
          <rect x={236} y={34} width={12} height={4} fill="#c0392b" />
          <Smoke x={242} y={12} active={heats[0] ?? melting} scale={1.2} />
          {/* Ovn 3 og 4 får hver sin pipe på smeltehallen (B-242) */}
          {heats.slice(2, 4).map((on, i) => (
            <g key={i}>
              <rect x={214 - i * 20} y={28 + i * 6} width={9} height={42 - i * 6} fill={pipeFill("#8c949d")} />
              <Smoke x={218 - i * 20} y={24 + i * 6} active={on} scale={0.9} />
            </g>
          ))}
          {/* Røykgassrensing */}
          {has(g, "renseanlegg") && (
            <g>
              <rect x={96} y={112} width={34} height={66} fill="#5f6873" />
              <path d="M96 112 L113 100 L130 112 Z" fill="#48515c" />
            </g>
          )}
          {/* Støpehall */}
          <rect x={250} y={100} width={110} height={78} fill={wallB("#6a737d")} />
          <path d="M250 100 L305 86 L360 100 Z" fill="#454d57" />
          {casting && <rect className="scene-glow" x={275} y={150} width={60} height={4} fill="#ff8a1e" />}
          <Windows x={262} y={118} cols={8} lit={open} />
          {/* Valseverk */}
          {has(g, "valseverk") && (
            <g>
              <rect x={360} y={128} width={stage >= 4 ? 40 : 110} height={50} fill="#5c656f" />
              <Windows x={366} y={140} cols={stage >= 4 ? 3 : 8} lit={open} />
              {/* Glødende stål som løper gjennom valseverket når det valser (B-242) */}
              <rect x={362} y={166} width={stage >= 4 ? 36 : 106} height={2} fill="#3a3f46" />
              {rolling && (
                <rect
                  className="scene-roll"
                  x={362}
                  y={164}
                  width={14}
                  height={4}
                  rx={1}
                  fill="#ff8a1e"
                  style={{ ["--roll" as string]: `${stage >= 4 ? 22 : 92}px` }}
                />
              )}
            </g>
          )}
          {/* Ovn nummer to */}
          {g.furnaceCount > 1 && (
            <g>
              <rect x={254} y={36} width={10} height={64} fill="#8c949d" />
              <Smoke x={259} y={32} active={heats[1] ?? false} />
            </g>
          )}
          {/* Kran i skrapgården */}
          <g stroke="#e0b030" strokeWidth={2}>
            <line x1={14} y1={110} x2={14} y2={178} />
            <line x1={92} y1={110} x2={92} y2={178} />
            <line x1={10} y1={110} x2={96} y2={110} />
          </g>
          <Trolley x={24} y={110} span={60} moving={open} />
        </g>
      )}

      {/* Pynt på taket og foran verket (B-151) */}
      {cosmeticOn(g, "sol") && <SolarPanels from={roof.line[0]} to={roof.apex} />}
      {cosmeticOn(g, "lys") && <Lights line={roof.line} night={night} />}
      {(cosmeticOn(g, "flagg") || cosmeticOn(g, "sesongflagg")) && (
        <Flag x={roof.apex[0]} y={roof.apex[1]} color={cosmeticOn(g, "sesongflagg") ? "#e0b030" : undefined} />
      )}
      {cosmeticOn(g, "stjerne") && <Star x={roof.apex[0]} y={Math.max(14, roof.apex[1] - 38)} />}
      {cosmeticOn(g, "pokal") && <Trophy x={stage === 0 ? 180 : 355} />}
      {cosmeticOn(g, "statue") && <Statue x={stage === 0 ? 150 : 385} />}

      {/* Ferdigvarelager */}
      {storeFill > 0.001 && (
        <g>
          {Array.from({ length: Math.max(1, Math.round(storeFill * 8)) }, (_, i) => (
            <rect
              key={i}
              x={(stage >= 3 ? 300 : 330) + (i % 4) * 9}
              y={172 - Math.floor(i / 4) * 5}
              width={8}
              height={5}
              fill="#9aa3ad"
              stroke="#5c646d"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* Skraptrucken kjører når verket går (B-242) */}
      {open && stage >= 1 && <Truck end={stage >= 4 ? 380 : 480} />}

      {/* Stedene kan trykkes (B-242): skrapgården, ovnshallen, støpehallen og ferdigvarelageret */}
      {stage === 0 && (
        <>
          <Hit station="skrap" x={118} y={146} w={70} h={34} onStation={onStation} />
          <Hit station="ovn" x={186} y={96} w={104} h={84} onStation={onStation} />
        </>
      )}
      {stage === 1 && (
        <>
          <Hit station="skrap" x={118} y={146} w={50} h={34} onStation={onStation} />
          <Hit station="ovn" x={170} y={74} w={150} h={106} onStation={onStation} />
        </>
      )}
      {stage === 2 && (
        <>
          <Hit station="skrap" x={12} y={116} w={104} h={64} onStation={onStation} />
          <Hit station="ovn" x={116} y={56} w={134} h={124} onStation={onStation} />
          <Hit station="stoping" x={250} y={102} w={120} h={78} onStation={onStation} />
        </>
      )}
      {stage >= 3 && (
        <>
          <Hit station="skrap" x={8} y={106} w={90} h={74} onStation={onStation} />
          <Hit station="ovn" x={124} y={12} w={130} h={168} onStation={onStation} />
          <Hit station="stoping" x={250} y={84} w={110} h={96} onStation={onStation} />
        </>
      )}
      {storeFill > 0.001 && (
        <Hit station="lager" x={(stage >= 3 ? 300 : 330) - 3} y={160} w={42} h={20} onStation={onStation} />
      )}

      {/* Folk */}
      {Array.from({ length: people }, (_, i) => (
        <Person
          key={i}
          x={(stage === 0 ? 300 : 110) + ((i * 37) % (stage === 0 ? 40 : 280))}
          color={i === 0 && stats.ownerWorks ? "#4fc3f7" : "#e8c07a"}
        />
      ))}
    </svg>
  );
}
