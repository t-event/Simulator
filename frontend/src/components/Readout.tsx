interface ReadoutProps {
  label: string;
  value: string;
  unit?: string;
  status?: "normal" | "warning" | "critical";
}

export function Readout({ label, value, unit, status = "normal" }: ReadoutProps) {
  return (
    <div className={`readout readout-${status}`}>
      <div className="readout-label">{label}</div>
      <div className="readout-value">
        {value}
        {unit && <span className="readout-unit">{unit}</span>}
      </div>
    </div>
  );
}
