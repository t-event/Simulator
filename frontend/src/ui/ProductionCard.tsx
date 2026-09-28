/**
 * «Produksjonen» på Verket → Anlegg (B-196, B-235): én kort rad per sted i kjeden – skrap, hver ovn, støping, valsing og
 * lager – med ikon, status, en tynn stolpe og én linje. Trykk på raden for utstyret. Før var hvert sted en stor boks med
 * egen «Utstyr»-knapp, og foringen sto både her og i vedlikeholdskortet ved siden av.
 */
import { PRODUCTS } from "../game/data";
import { castingType, hasGrader, rollingActive, unitType, type PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import { Bar, Card } from "./common";
import { Callout, StatusLine, type Status } from "./ds";
import { fmtPct, fmtT } from "./format";
import { Icon, type IconName } from "./icons";
import { furnaceState, statusOf } from "./plantStatus";
import { stationOptions, type Station } from "./stations";
import type { View } from "./views";

interface Row {
  key: string;
  station: Station | null;
  icon: IconName;
  name: string;
  detail: string;
  status?: { status: Status; label?: string };
  bar?: { value: number; tone: "accent" | "ok" | "warning" | "critical" };
}

function ProdRow({ g, row, onStation }: { g: GameState; row: Row; onStation: (s: Station) => void }) {
  const options = row.station ? stationOptions(g, row.station) : [];
  const open = options.some((o) => !o.locked);
  const ready = options.filter((o) => o.available).length;
  const body = (
    <>
      <span className="g-prod-icon" aria-hidden="true">
        <Icon name={row.icon} />
      </span>
      <span className="g-prod-main">
        <span className="g-prod-top">
          <strong>{row.name}</strong>
          {row.status && <StatusLine status={row.status.status} label={row.status.label} />}
        </span>
        <span className="g-prod-detail">{row.detail}</span>
        {row.bar && <Bar value={row.bar.value} tone={row.bar.tone} />}
      </span>
      {open && (
        <span className="g-prod-end">
          {ready > 0 && (
            <span className="g-badge" aria-label={`${ready} ting å kjøpe`}>
              {ready}
            </span>
          )}
          <Icon name="chevron-right" />
        </span>
      )}
    </>
  );
  return (
    <li>
      {open ? (
        <button
          className="g-prod-row"
          onClick={() => onStation(row.station!)}
          aria-label={`${row.name}: ${row.detail}. Åpne utstyret`}
        >
          {body}
        </button>
      ) : (
        <div className="g-prod-row">{body}</div>
      )}
    </li>
  );
}

export function ProductionCard({
  g,
  stats,
  missingNow,
  go,
  onStation,
}: {
  g: GameState;
  stats: PlantStats;
  /** Skraptypene som mangler til neste charge, eller null */
  missingNow: string | null;
  go: (v: View, sub?: string) => void;
  onStation: (s: Station) => void;
}) {
  const casting = castingType(g);
  const castHead = g.castQueue[0];
  const storeFull = stats.storeUsed >= stats.storeT * 0.999;
  const storeHigh = stats.storeUsed > stats.storeT * 0.9;
  const rows: Row[] = [
    {
      key: "skrap",
      station: "skrap",
      icon: "rake",
      name: "Skraplager",
      detail: `${fmtT(stats.yardUsed)} av ${fmtT(stats.yardT)}`,
      status: missingNow
        ? { status: "tomt", label: "Mangler skrap" }
        : stats.yardUsed <= 0
          ? { status: "tomt" }
          : undefined,
      bar: { value: stats.yardUsed / stats.yardT, tone: stats.yardUsed < stats.sizeT ? "critical" : "accent" },
    },
    ...g.furnaces.map((f, i): Row => {
      const st = furnaceState(g, i);
      const many = g.furnaces.length > 1;
      return {
        key: `ovn-${i}`,
        station: "ovn",
        icon: "flame",
        name: many ? `Ovn ${i + 1}` : "Ovn",
        detail: `${st.text}${st.progress !== null ? ` · ${fmtPct(st.progress)}` : ""}${many ? "" : ` · ${unitType(g, i).name.toLowerCase()}`}`,
        status: f.heat ? { status: "kjorer", label: "Smelter" } : { status: statusOf(st.text) },
        bar: st.progress !== null ? { value: st.progress, tone: "warning" } : undefined,
      };
    }),
    {
      key: "stoping",
      station: "stoping",
      icon: "droplet",
      // Maskintypen står i utstyrsarket; her holder «Støping», så raden ikke blir to linjer
      name: "Støping",
      detail:
        g.castWait ??
        (castHead
          ? `Støper ${fmtT(castHead.t)}${g.castQueue.length > 1 ? ` (+${g.castQueue.length - 1} i kø)` : ""} · ${PRODUCTS[casting.product].name.toLowerCase()}`
          : `Venter på stål · ${PRODUCTS[casting.product].name.toLowerCase()}`),
      status: g.castWait
        ? { status: statusOf(g.castWait) }
        : castHead
          ? { status: "kjorer", label: "Støper" }
          : { status: "venter" },
      bar: castHead ? { value: g.castProgressT / castHead.t, tone: "ok" } : undefined,
    },
    ...(rollingActive(g)
      ? [
          {
            key: "valse",
            station: null,
            icon: "refresh",
            name: "Valseverk",
            detail: "Valser emner til armeringsstål",
            status: { status: "kjorer", label: "I drift" },
          } satisfies Row,
        ]
      : []),
    {
      key: "lager",
      station: "lager",
      icon: "package",
      name: "Ferdigvarelager",
      detail: `${fmtT(stats.storeUsed)} av ${fmtT(stats.storeT)}`,
      status: storeFull ? { status: "fullt" } : storeHigh ? { status: "fullt", label: "Nesten fullt" } : undefined,
      bar: { value: stats.storeUsed / stats.storeT, tone: storeHigh ? "critical" : "accent" },
    },
  ];

  return (
    <Card title="Produksjonen">
      {missingNow && (
        <Callout tone="heat">
          Resepten mangler {missingNow} til neste charge.{" "}
          {hasGrader(g)
            ? "Skrapklasseren venter til det kommer, så ovnen står."
            : "Uten skrapklasser fylles chargen opp med annet skrap, og analysen kan bomme."}
        </Callout>
      )}
      <ol className="g-prod-list">
        {rows.map((row) => (
          <ProdRow key={row.key} g={g} row={row} onStation={onStation} />
        ))}
      </ol>
      <div className="g-row g-prod-actions">
        <button className={missingNow ? "g-primary" : undefined} onClick={() => go("marked", "skrap")}>
          Kjøp skrap{missingNow && <span className="g-badge">!</span>}
        </button>
        <button className={storeHigh ? "g-primary" : undefined} onClick={() => go("salg", "lager")}>
          Til salg
        </button>
      </div>
      <p className="g-muted g-small-text">Trykk på et sted for utstyret der.</p>
    </Card>
  );
}
