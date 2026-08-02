// ---------------------------------------------------------------------------
// A colored-pill dropdown, like the status column in the community tracker
// spreadsheet. Thin wrapper over the custom Select; pill colors come from a
// CSS class per option (see the .st-* / .mt-* rules in styles.css).
// ---------------------------------------------------------------------------
import { Select, SelectOption } from './Select';

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
  allowEmpty,
  hideChevron
}: {
  value: string;
  options: PillOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Adds a gray "—" option representing "not set". */
  allowEmpty?: string;
  /** Hide the dropdown arrow (still clickable) — reads as a plain pill. */
  hideChevron?: boolean;
}) {
  const opts: SelectOption[] = [
    ...(allowEmpty !== undefined ? [{ value: '', label: allowEmpty, className: 'pill-empty' }] : []),
    ...options,
  ];
  return (
    <Select
      value={value}
      options={opts}
      onChange={onChange}
      disabled={disabled}
      placeholder={allowEmpty ?? '—'}
      className="dd-pill"
      hideChevron={hideChevron}
    />
  );
}
