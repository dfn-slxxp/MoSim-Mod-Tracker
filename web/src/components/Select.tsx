// ---------------------------------------------------------------------------
// Fully custom dropdown replacing native <select> everywhere: the native
// popup list is OS-drawn (square, unthemable), so we render our own rounded
// menu in a portal. Closes on outside click, Escape, page scroll, or resize —
// but not when scrolling inside the menu itself.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  /** Extra class on the option row AND the trigger when selected (pill colors). */
  className?: string;
  /** Options with the same group string render under a shared header. */
  group?: string;
}

const MENU_MAX_H = 280;

export function Select({
  value,
  options,
  onChange,
  disabled,
  placeholder = '—',
  className = '',
  title,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const openMenu = () => {
    if (disabled || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const up = r.bottom + MENU_MAX_H + 12 > window.innerHeight && r.top > MENU_MAX_H;
    setPos({
      top: up ? r.top - 6 : r.bottom + 6,
      left: Math.max(6, Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 6)),
      width: r.width,
      up,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onResize = () => setOpen(false);
    const onScroll = (e: Event) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Scroll the selected option into view when the menu opens.
  useEffect(() => {
    if (open) menuRef.current?.querySelector('.dd-option.selected')?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  const rows: React.ReactNode[] = [];
  let lastGroup: string | undefined;
  for (const o of options) {
    if (o.group !== lastGroup) {
      lastGroup = o.group;
      if (o.group) rows.push(<div key={`g-${o.group}`} className="dd-group">{o.group}</div>);
    }
    rows.push(
      <button
        key={o.value || '(empty)'}
        type="button"
        className={`dd-option ${o.value === value ? 'selected' : ''} ${o.className ?? ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
          if (o.value !== value) onChange(o.value);
        }}
      >
        <span className="dd-option-label">{o.label}</span>
        {o.value === value && <span className="dd-tick">✓</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`dd-trigger ${open ? 'open' : ''} ${selected?.className ?? ''} ${className}`}
        disabled={disabled}
        title={title}
        onClick={(e) => {
          e.stopPropagation(); // keep row-level click handlers from firing
          open ? setOpen(false) : openMenu();
        }}
      >
        <span className="dd-label">{selected?.label ?? placeholder}</span>
        <span className="dd-chev" aria-hidden>▾</span>
      </button>
      {open && pos &&
        createPortal(
          // Anchor holds the fixed position (incl. the up-flip translate); the
          // inner menu owns the scale/opacity entrance so the two don't fight.
          <div
            className="dd-anchor"
            style={{ top: pos.top, left: pos.left, transform: pos.up ? 'translateY(-100%)' : undefined }}
          >
            <div
              ref={menuRef}
              className={`dd-menu ${pos.up ? 'up' : 'down'}`}
              style={{ minWidth: Math.max(pos.width, 140) }}
            >
              {rows}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
