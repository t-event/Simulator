/** Invitasjonen til det nye spillet i beta (B-519), på Verket → Oversikt */
import { BETA_INVITE, dismissBetaInvite, showBetaInvite } from "../game/invite";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { Button } from "./ds";

export function BetaInviteCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  if (!showBetaInvite(g)) return null;
  const close = () => act((s) => dismissBetaInvite(s));
  return (
    <Card title={<>Invitasjon: prøv {BETA_INVITE.name}</>} className="g-invite-card">
      <p>
        Den som lager Stålverket, lager nå et nytt spill: <strong>{BETA_INVITE.name}</strong>. Det er i beta, og du er
        invitert til å prøve det.
      </p>
      <p className="g-muted">
        Vi vil gjerne høre hva du synes – hva som er gøy, hva som er vanskelig, og hva som ikke virker. Skriv det gjerne
        i Skiftrapporten her i Stålverket.
      </p>
      <div className="g-row">
        <Button
          variant="primary"
          icon="rocket"
          onClick={() => {
            // Ny fane (eller nettleseren, fra hjemskjermen): Stålverket blir stående der spilleren var
            window.open(BETA_INVITE.url, "_blank", "noopener,noreferrer");
            close();
          }}
        >
          Prøv betaen
        </Button>
        <Button onClick={close}>Nei takk</Button>
      </div>
    </Card>
  );
}
