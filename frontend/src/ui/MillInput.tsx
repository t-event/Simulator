import { millText } from "./amount";

/**
 * Felt for et beløp i millioner. Vanlig tekstfelt med desimaltastatur: på iPhone gir tastaturet komma, og et tallfelt
 * (`type="number"`) leser ikke «0,1» – da kunne ingen by under 1 mill.
 */
export function MillInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: number;
  label: string;
}) {
  return (
    <label className="g-amount">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={millText(placeholder)}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s,.]/g, ""))}
        aria-label={label}
      />
      <span>mill. kr</span>
    </label>
  );
}
