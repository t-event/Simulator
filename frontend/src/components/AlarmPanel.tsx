import type { Alarm } from "../types";

interface Props {
  alarms: Alarm[];
  onAck: (id: number) => void;
}

export function AlarmPanel({ alarms, onAck }: Props) {
  const sorted = [...alarms].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    if (a.active !== b.active) return a.active ? -1 : 1;
    return order[a.severity] - order[b.severity] || b.raised_at_s - a.raised_at_s;
  });

  return (
    <div className="alarm-panel">
      <div className="panel-title">Alarmer</div>
      {sorted.length === 0 && <div className="alarm-empty">Ingen aktive alarmer</div>}
      <ul className="alarm-list">
        {sorted.map((a) => (
          <li key={a.id} className={`alarm-item alarm-${a.severity} ${a.active ? "" : "alarm-cleared"}`}>
            <span className="alarm-message">{a.message}</span>
            <span className="alarm-time">t={Math.round(a.raised_at_s)}s</span>
            {!a.ack && (
              <button className="alarm-ack-btn" onClick={() => onAck(a.id)}>
                Kvitter
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
