/** Labeled text input + labeled plain select (the form's two basic fields). */
import type { CSSProperties } from 'react';

interface LabeledTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  /** Smaller 9px label (person cards). */
  labelSm?: boolean;
  type?: string;
  /** Per-use size overrides (font-size / radius / padding). */
  inputStyle?: CSSProperties;
}

export function LabeledText({
  label,
  value,
  onChange,
  placeholder,
  mono,
  labelSm,
  type = 'text',
  inputStyle,
}: LabeledTextProps) {
  return (
    <div>
      <label className={labelSm ? 'hk-label hk-label--sm' : 'hk-label'}>{label}</label>
      <input
        type={type}
        className={mono ? 'hk-input hk-input--mono' : 'hk-input'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

interface PlainInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  inputStyle?: CSSProperties;
  'aria-label'?: string;
}

/** Bare input (no label) — used inside the table-style rows. */
export function PlainInput({
  value,
  onChange,
  placeholder,
  mono,
  inputStyle,
  'aria-label': ariaLabel,
}: PlainInputProps) {
  return (
    <input
      className={mono ? 'hk-input hk-input--mono' : 'hk-input'}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labelSm?: boolean;
  inputStyle?: CSSProperties;
}

export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  labelSm,
  inputStyle,
}: LabeledSelectProps) {
  return (
    <div>
      <label className={labelSm ? 'hk-label hk-label--sm' : 'hk-label'}>{label}</label>
      <select
        className="hk-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
