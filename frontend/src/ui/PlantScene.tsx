/**
 * Anleggsbildet: garasjen som vokser til et storverk.
 *
 * Bildet tegnes ut fra spilltilstanden: bygningene kommer etter hvert som du
 * bygger ut, skrapdungen og ferdigvarelageret følger beholdningen, ovnene
 * gløder når de smelter, og himmelen følger klokka.
 */
import { has, hourOfDay, isOpen, type PlantStats } from "../game/plant";
import type { GameState } from "../game/types";

interface Props {
  g: GameState;
  stats: PlantStats;
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

export function PlantScene({ g, stats }: Props) {
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

      {/* Havn på storverket */}
      {stage >= 4 && (
        <g>
          <rect x={400} y={176} width={80} height={34} fill="#1d4466" />
          <path d="M410 170 L470 170 L462 180 L416 180 Z" fill="#6b3a2a" />
          <rect x={425} y={160} width={22} height={10} fill="#cfd6de" />
          <rect x={440} y={150} width={4} height={10} fill="#8a939e" />
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
          <rect x={190} y={128} width={96} height={50} fill="#8b8f96" />
          <path d="M184 130 L238 102 L292 130 Z" fill="#5a3f33" />
          <rect x={206} y={142} width={54} height={36} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={233} cy={166} r={16} fill="url(#glow)" />}
          <rect x={268} y={140} width={12} height={10} className={open ? "win-lit" : "win-dark"} />
          <rect x={272} y={96} width={6} height={20} fill="#555a61" />
          <Smoke x={275} y={92} active={melting} scale={0.7} />
        </g>
      )}

      {stage === 1 && (
        <g>
          <rect x={170} y={112} width={150} height={66} fill="#7d8791" />
          <path
            d="M170 112 L195 96 L195 112 L220 96 L220 112 L245 96 L245 112 L270 96 L270 112 L295 96 L295 112 L320 96 L320 112 Z"
            fill="#4c5560"
          />
          <rect x={186} y={140} width={40} height={38} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={206} cy={165} r={16} fill="url(#glow)" />}
          <Windows x={240} y={128} cols={6} lit={open} />
          <rect x={300} y={78} width={8} height={34} fill="#555a61" />
          <Smoke x={304} y={74} active={melting} scale={0.8} />
        </g>
      )}

      {stage === 2 && (
        <g>
          {/* Smeltehall og støpehall */}
          <rect x={120} y={100} width={130} height={78} fill="#7a838d" />
          <path d="M116 100 L185 80 L254 100 Z" fill="#4c5560" />
          <rect x={250} y={118} width={120} height={60} fill="#6d7680" />
          <path d="M250 118 L310 104 L370 118 Z" fill="#454d57" />
          <rect x={140} y={140} width={42} height={38} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={161} cy={164} r={18} fill="url(#glow)" />}
          {casting && <circle className="scene-glow" cx={300} cy={168} r={10} fill="url(#glow)" />}
          <Windows x={196} y={118} cols={4} lit={open} />
          <Windows x={262} y={132} cols={8} lit={open} />
          <rect x={226} y={58} width={10} height={42} fill="#555a61" />
          <Smoke x={231} y={54} active={melting} />
          {/* Kran over skrapet */}
          <g stroke="#e0b030" strokeWidth={2}>
            <line x1={20} y1={120} x2={20} y2={178} />
            <line x1={110} y1={120} x2={110} y2={178} />
            <line x1={16} y1={120} x2={114} y2={120} />
          </g>
          <line x1={60} y1={120} x2={60} y2={140} stroke="#999" />
        </g>
      )}

      {stage >= 3 && (
        <g>
          {/* Smelteverk */}
          <rect x={130} y={70} width={120} height={108} fill="#76808b" />
          <path d="M126 70 L190 50 L254 70 Z" fill="#48515c" />
          <rect x={150} y={132} width={46} height={46} fill="#1a1c20" />
          {melting && <circle className="scene-glow" cx={173} cy={158} r={22} fill="url(#glow)" />}
          <Windows x={204} y={90} cols={3} lit={open} />
          <Windows x={204} y={104} cols={3} lit={open} />
          {/* Pipe */}
          <rect x={236} y={16} width={12} height={54} fill="#8c949d" />
          <rect x={236} y={22} width={12} height={4} fill="#c0392b" />
          <rect x={236} y={34} width={12} height={4} fill="#c0392b" />
          <Smoke x={242} y={12} active={melting} scale={1.2} />
          {/* Røykgassrensing */}
          {has(g, "renseanlegg") && (
            <g>
              <rect x={96} y={112} width={34} height={66} fill="#5f6873" />
              <path d="M96 112 L113 100 L130 112 Z" fill="#48515c" />
            </g>
          )}
          {/* Støpehall */}
          <rect x={250} y={100} width={110} height={78} fill="#6a737d" />
          <path d="M250 100 L305 86 L360 100 Z" fill="#454d57" />
          {casting && <rect className="scene-glow" x={275} y={150} width={60} height={4} fill="#ff8a1e" />}
          <Windows x={262} y={118} cols={8} lit={open} />
          {/* Valseverk */}
          {has(g, "valseverk") && (
            <g>
              <rect x={360} y={128} width={stage >= 4 ? 40 : 110} height={50} fill="#5c656f" />
              <Windows x={366} y={140} cols={stage >= 4 ? 3 : 8} lit={open} />
            </g>
          )}
          {/* Ovn nummer to */}
          {g.furnaceCount > 1 && (
            <g>
              <rect x={254} y={36} width={10} height={64} fill="#8c949d" />
              <Smoke x={259} y={32} active={g.furnaces[1]?.heat != null} />
            </g>
          )}
          {/* Kran i skrapgården */}
          <g stroke="#e0b030" strokeWidth={2}>
            <line x1={14} y1={110} x2={14} y2={178} />
            <line x1={92} y1={110} x2={92} y2={178} />
            <line x1={10} y1={110} x2={96} y2={110} />
          </g>
          <line x1={52} y1={110} x2={52} y2={130} stroke="#999" />
        </g>
      )}

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
