/**
 * Tittelbildet på startskjermen (B-249): verket i kveldslys, samme motiv som app-ikonet (public/icon.svg), men bredt.
 * Røyken stiger og porten gløder; med redusert bevegelse står alt stille. Rent pynt, så skjermlesere hopper over det.
 */
export function TitleArt() {
  return (
    <svg className="g-title-art" viewBox="0 0 480 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="title-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#16233a" />
          <stop offset="0.6" stop-color="#3a2a2a" />
          <stop offset="1" stop-color="#8a4214" />
        </linearGradient>
        <linearGradient id="title-melt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff2a8" />
          <stop offset="0.45" stop-color="#ffb02e" />
          <stop offset="1" stop-color="#ff5a00" />
        </linearGradient>
        <radialGradient id="title-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ff8a1e" stop-opacity="0.8" />
          <stop offset="1" stop-color="#ff5a00" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="150" fill="url(#title-sky)" />
      {/* Stjerner */}
      <g fill="#e8eef5" opacity="0.7">
        {[
          [40, 22],
          [96, 44],
          [150, 16],
          [402, 28],
          [446, 58],
          [372, 12],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={1.2} />
        ))}
      </g>
      {/* Åsene bak */}
      <path d="M0 118 Q 90 84 190 108 T 360 100 T 480 110 L480 150 L0 150 Z" fill="#241c22" />
      {/* Røyk fra pipene */}
      <g className="title-smoke" fill="#c9d1da">
        <circle className="puff puff-1" cx={276} cy={34} r={7} />
        <circle className="puff puff-2" cx={276} cy={34} r={9} />
        <circle className="puff puff-3" cx={238} cy={48} r={6} />
      </g>
      {/* Verket i silhuett */}
      <g fill="#0e141c">
        <rect x={266} y={38} width={20} height={80} />
        <rect x={232} y={52} width={13} height={66} />
        <path d="M150 92 L200 66 L250 92 Z" />
        <rect x={150} y={91} width={100} height={59} />
        <path d="M250 108 L292 94 L334 108 Z" />
        <rect x={250} y={107} width={84} height={43} />
        <rect x={112} y={112} width={38} height={38} />
        <path d="M112 112 L131 102 L150 112 Z" />
        {/* Kran i skrapgården */}
        <rect x={40} y={104} width={3} height={46} />
        <rect x={92} y={104} width={3} height={46} />
        <rect x={36} y={102} width={63} height={4} />
        <rect x={0} y={140} width={480} height={10} />
      </g>
      <rect x={270} y={48} width={12} height={5} fill="#c0392b" />
      <rect x={270} y={60} width={12} height={5} fill="#c0392b" />
      {/* Porten til ovnshallen gløder */}
      <circle className="title-glow" cx={186} cy={134} r={40} fill="url(#title-glow)" />
      <rect x={172} y={112} width={30} height={28} fill="url(#title-melt)" />
      <g fill="#ffcf6b">
        {[160, 214, 228].map((x) => (
          <rect key={x} x={x} y={100} width={7} height={5} />
        ))}
        {[262, 276, 290, 304, 318].map((x) => (
          <rect key={x} x={x} y={118} width={7} height={5} />
        ))}
      </g>
    </svg>
  );
}
