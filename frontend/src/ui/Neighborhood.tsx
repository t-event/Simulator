/**
 * Byggeprosjekter på storverket (B-336): det store kjøpet som bygges nå (byggetid og innkjøring), og nabolaget –
 * store, synlige bygg i byen for pengene hjemme. Vises når det betyr noe: et bygg pågår, noe er bygget, eller kassa
 * nærmer seg prisen på det neste (gradvis synlighet).
 */
import { useEffect, useRef } from "react";
import {
  bigBuildDaysLeft,
  foundationPrice,
  foundationTier,
  foundationTitle,
  NEIGHBOR_PROJECTS,
  neighborhoodDone,
  neighborLevel,
  neighborStep,
  nextNeighborStep,
} from "../game/building";
import { buildNeighbor, donateFoundation } from "../game/actions";
import { MIN_PER_DAY } from "../game/data";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtKr } from "./format";
import { Icon } from "./icons";

function progress(startMin: number, readyMin: number, now: number): number {
  return Math.min(1, Math.max(0, (now - startMin) / Math.max(1, readyMin - startMin)));
}

export function BuildCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const b = g.bigBuild;
  const n = g.neighborhood;
  const next = nextNeighborStep(g);
  const building = n.building ? NEIGHBOR_PROJECTS.find((p) => p.id === n.building!.id) : null;
  const buildingStep = building && n.building ? neighborStep(building, n.building.level ?? 1) : null;
  const done = neighborhoodDone(g);
  const tier = foundationTier(g);
  const gift = foundationPrice(tier + 1);
  // Kortet er sett (B-455): rådet og «!» om nabolaget kommer ikke igjen. Først når kortet faktisk er på skjermen
  // (B-472) – på mobil ligger det lenger ned, og rådet forsvant da bare siden ble åpnet
  const seen = !!g.buildSeen;
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (seen) return;
    const el = marker.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      act((gg) => void (gg.buildSeen = true));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      act((gg) => void (gg.buildSeen = true));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, act]);
  return (
    <Card title="Byggeprosjekter" className="g-build-card">
      <span ref={marker} className="g-build-seen" aria-hidden="true" />
      {b && (
        <div className="g-build-now">
          <p className="g-small-text">
            <Icon name="hard-hat" /> <strong>{b.name}</strong> bygges – ferdig om {bigBuildDaysLeft(g)} døgn. Store kjøp
            bygges ett om gangen og kjøres inn over noen døgn.
          </p>
          <Bar value={progress(b.startMin, b.readyMin, g.minute)} tone="accent" label="Bygget" />
        </div>
      )}
      <h3 className="g-subhead">Nabolaget</h3>
      <p className="g-muted g-small-text">
        {done
          ? "Byggene i byen kan utvides to ganger. Utvidelsen gir ingen ny fordel – byggene blir større i bildet av verket."
          : "Store bygg i byen rundt verket. Hvert gir en liten fordel for alltid, og står i bildet av verket."}
      </p>
      {n.built.length > 0 && (
        <ul className="g-build-list">
          {NEIGHBOR_PROJECTS.filter((p) => neighborLevel(g, p.id) > 0).map((p) => (
            <li key={p.id}>
              <Icon name="check" /> <strong>{p.name}</strong>{" "}
              {neighborLevel(g, p.id) > 1 && <span className="g-chip">trinn {neighborLevel(g, p.id)}</span>}{" "}
              <span className="g-muted">– {p.gives}</span>
            </li>
          ))}
        </ul>
      )}
      {buildingStep && n.building ? (
        <div className="g-build-now">
          <p className="g-small-text">
            <strong>{buildingStep.project.name}</strong>{" "}
            {buildingStep.level > 1 ? `utvides til trinn ${buildingStep.level}` : "bygges"} – ferdig om{" "}
            {Math.max(0, Math.ceil((n.building.readyMin - g.minute) / MIN_PER_DAY))} døgn.
          </p>
          <Bar
            value={progress(n.building.readyMin - buildingStep.days * MIN_PER_DAY, n.building.readyMin, g.minute)}
            tone="accent"
            label="Bygget"
          />
        </div>
      ) : next ? (
        <div className="g-build-next">
          <p className="g-small-text">
            {next.level > 1 ? (
              <>
                Neste: utvid <strong>{next.project.name.toLowerCase()}</strong> til trinn {next.level}. Tar {next.days}{" "}
                døgn.
              </>
            ) : (
              <>
                Neste: <strong>{next.project.name}</strong> – {next.project.gives} Tar {next.days} døgn.
              </>
            )}
          </p>
          <button className="g-primary" disabled={g.cash < next.price} onClick={() => act((gg) => buildNeighbor(gg))}>
            {next.level > 1 ? "Utvid" : "Bygg"} ({fmtKr(next.price)})
          </button>
          {g.cash < next.price && (
            <p className="g-muted g-small-text">Du mangler {fmtKr(Math.ceil(next.price - Math.max(0, g.cash)))}.</p>
          )}
        </div>
      ) : (
        <p className="g-small-text">Alt i nabolaget er bygget og utvidet. Byen er stolt av verket.</p>
      )}
      {/* Verkets stiftelse (B-455): når hele nabolaget står – bare ære, ingen effekt på drift eller andre spillere */}
      {done && (
        <>
          <h3 className="g-subhead">Verkets stiftelse</h3>
          <p className="g-muted g-small-text">
            Gi penger til byen. Hver gave gir en ny tittel og noe nytt i bildet av verket – bare ære, ingen fordel i
            driften.
          </p>
          {tier > 0 && (
            <p className="g-small-text">
              <Icon name="award" /> Du er <strong>{foundationTitle(tier)}</strong> – gitt{" "}
              {fmtKr(g.foundation?.given ?? 0)} til byen.
            </p>
          )}
          <div className="g-build-next">
            <p className="g-small-text">Neste tittel: «{foundationTitle(tier + 1)}».</p>
            <button className="g-primary" disabled={g.cash < gift} onClick={() => act((gg) => donateFoundation(gg))}>
              Gi {fmtKr(gift)} til byen
            </button>
            {g.cash < gift && (
              <p className="g-muted g-small-text">Du mangler {fmtKr(Math.ceil(gift - Math.max(0, g.cash)))}.</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
