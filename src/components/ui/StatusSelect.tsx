/**
 * Status select whose closed-text colour (and option colours) follow the chosen
 * value — green (Negative/Low/Low Risk), amber (Pending/Medium/Medium Risk),
 * red (Positive/High/High Risk). Used in sections 03/04/06 and the RBA select.
 */
import type { CSSProperties } from 'react';

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** Maps a value to its colour. */
  colorOf: (value: string) => string;
  /** Larger sizing for the RBA "Overall Risk Classification" select. */
  big?: boolean;
  'aria-label'?: string;
}

export function StatusSelect({
  value,
  onChange,
  options,
  colorOf,
  big,
  'aria-label': ariaLabel,
}: StatusSelectProps) {
  const sizing: CSSProperties = big
    ? { padding: '11px 13px', fontSize: 14, borderRadius: 10 }
    : { padding: '8px 10px', fontSize: 13, borderRadius: 9 };

  const style = { ...sizing, ['--status-color']: colorOf(value) } as CSSProperties;

  return (
    <select
      className="hk-select hk-select--status"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o} value={o} style={{ color: colorOf(o) }}>
          {o}
        </option>
      ))}
    </select>
  );
}
