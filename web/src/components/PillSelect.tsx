// ---------------------------------------------------------------------------
// A <select> styled as a colored pill, like the status dropdowns in the
// community tracker spreadsheet. The pill's color comes from a CSS class per
// option (see the .st-* / .mt-* rules in styles.css).
// ---------------------------------------------------------------------------
export interface PillOption {
  value: string;
  label: string;
  className: string;
}

export function PillSelect({
  value,
  options,
  onChange,
  disabled,
  allowEmpty
}: {
  value: string;
  options: PillOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Adds a gray "—" option representing "not set". */
  allowEmpty?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <select
      className={`pill ${current?.className ?? 'pill-empty'}`}
      value={value}
      disabled={disabled}
      // Prevent row-level click handlers (open robot page) from firing.
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
