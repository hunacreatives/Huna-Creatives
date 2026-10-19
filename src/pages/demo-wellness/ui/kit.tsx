// Shared UI for the Salt & Stillness demo. Pages build from these so the guest
// site and the admin look like one product. Icons are Remix Icon classes.

import { ReactNode, useEffect, ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { initials } from '../lib/format';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const Icon = ({ name, className = '' }: { name: string; className?: string }) =>
  <i className={cx(name, 'leading-none', className)} aria-hidden="true" />;

/** Floating surface: nav bars, sticky cards, KPI tiles. Never nest glass in glass. */
export function Glass({ children, className = '', strong, as: As = 'div' }: { children: ReactNode; className?: string; strong?: boolean; as?: 'div' | 'section' | 'aside' | 'header' }) {
  return <As className={cx(strong ? 'glass-strong' : 'glass', 'rounded-[20px]', className)}>{children}</As>;
}

/** Near-solid white card for lists, tables, forms and long text. */
export function Panel({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cx('paper rounded-[20px]', pad && 'p-5 md:p-6', className)}>{children}</div>;
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type BtnSize = 'sm' | 'md' | 'lg';
const BTN_BASE = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap select-none';
const BTN_SIZE: Record<BtnSize, string> = { sm: 'h-9 px-3.5 text-[13.5px]', md: 'h-11 px-5 text-[14.5px]', lg: 'h-12 px-6 text-[15.5px]' };
const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[var(--teal)] text-white hover:bg-[var(--teal-2)] shadow-[0_6px_18px_rgba(7,80,86,0.22)]',
  secondary: 'bg-white text-[var(--ink)] border border-[var(--line-2)] hover:border-[var(--ink-3)]',
  ghost: 'text-[var(--ink-2)] hover:bg-[rgba(36,48,55,0.06)]',
  danger: 'bg-white text-[var(--bad)] border border-[rgba(179,55,43,0.3)] hover:bg-[rgba(179,55,43,0.05)]',
  quiet: 'bg-[var(--teal-soft)] text-[var(--teal)] hover:bg-[rgba(7,80,86,0.13)]',
};
export const btnClass = (variant: BtnVariant = 'primary', size: BtnSize = 'md', block?: boolean) =>
  cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], block && 'w-full');

export function Button({ variant = 'primary', size = 'md', block, icon, iconRight, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; block?: boolean; icon?: string; iconRight?: string }) {
  return (
    <button type="button" className={cx(btnClass(variant, size, block), className)} {...rest}>
      {icon && <Icon name={icon} className="text-[1.1em]" />}{children}{iconRight && <Icon name={iconRight} className="text-[1.1em]" />}
    </button>
  );
}

export function ButtonLink({ to, variant = 'primary', size = 'md', block, icon, iconRight, children, className = '' }:
  { to: string; variant?: BtnVariant; size?: BtnSize; block?: boolean; icon?: string; iconRight?: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cx(btnClass(variant, size, block), className)}>
      {icon && <Icon name={icon} className="text-[1.1em]" />}{children}{iconRight && <Icon name={iconRight} className="text-[1.1em]" />}
    </Link>
  );
}

/** Filter chip. Selected = teal fill. */
export function Chip({ active, onClick, children, icon, count }: { active?: boolean; onClick?: () => void; children: ReactNode; icon?: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx('inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] font-medium border transition-colors whitespace-nowrap',
        active ? 'bg-[var(--teal)] text-white border-[var(--teal)]' : 'bg-white/80 text-[var(--ink-2)] border-[var(--line-2)] hover:border-[var(--ink-3)]')}>
      {icon && <Icon name={icon} />}{children}
      {count !== undefined && <span className={cx('num text-[12px]', active ? 'text-white/75' : 'text-[var(--ink-3)]')}>{count}</span>}
    </button>
  );
}

export type Tone = 'teal' | 'green' | 'amber' | 'red' | 'gray' | 'blue';
const TONE: Record<Tone, [string, string]> = {
  teal: ['rgba(7,80,86,0.09)', '#075056'],
  green: ['rgba(47,122,79,0.10)', '#2f7a4f'],
  amber: ['rgba(176,120,20,0.12)', '#8a5d0c'],
  red: ['rgba(179,55,43,0.09)', '#b3372b'],
  gray: ['rgba(36,48,55,0.07)', '#4c5a61'],
  blue: ['rgba(40,98,160,0.10)', '#285f9a'],
};
/** Status chip: soft tint + dot. Keep to five statuses per screen. */
export function Badge({ tone = 'gray', children, dot = true, className = '' }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  const [bg, fg] = TONE[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap', className)} style={{ background: bg, color: fg }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: fg }} />}{children}
    </span>
  );
}

export function Avatar({ name, color, size = 36, src }: { name: string; color?: string; size?: number; src?: string }) {
  const tint = color ?? ['#5b7f6e', '#c96f4a', '#2f7d8c', '#8a6d3b', '#7a5c8e', '#4f6d8f'][name.length % 6];
  return src
    ? <img src={src} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
    : <span className="rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-white"
        style={{ width: size, height: size, background: tint, fontSize: size * 0.36 }}>{initials(name)}</span>;
}

/** Segmented tabs. */
export function Tabs<T extends string>({ value, onChange, options, className = '' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cx('inline-flex p-1 rounded-full bg-[rgba(36,48,55,0.06)] gap-1 max-w-full overflow-x-auto no-bar', className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('h-8 px-3.5 rounded-full text-[13.5px] font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5',
            value === o.value ? 'bg-white text-[var(--ink)] shadow-[0_1px_3px_rgba(36,48,55,0.12)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]')}>
          {o.label}{o.count !== undefined && <span className="num text-[12px] text-[var(--ink-3)]">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** KPI tile. Glass, one number, optional trend. */
export function Stat({ label, value, trend, hint, icon }: { label: string; value: ReactNode; trend?: { value: string; up: boolean }; hint?: string; icon?: string }) {
  return (
    <Glass className="p-4 md:p-5">
      <div className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">{icon && <Icon name={icon} className="text-[var(--teal)]" />}{label}</div>
      <div className="num mt-2 text-[26px] md:text-[28px] font-semibold tracking-tight">{value}</div>
      {(trend || hint) && (
        <div className="mt-1 text-[12.5px] text-[var(--ink-3)] flex items-center gap-1.5">
          {trend && <span className={trend.up ? 'text-[var(--ok)]' : 'text-[var(--bad)]'}><Icon name={trend.up ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} /> {trend.value}</span>}
          {hint}
        </div>
      )}
    </Glass>
  );
}

/** Booked / capacity bar. Turns amber near full, teal when full. */
export function FillBar({ booked, capacity, showLabel = true, className = '' }: { booked: number; capacity: number; showLabel?: boolean; className?: string }) {
  const p = Math.min(1, booked / capacity);
  const color = p >= 1 ? 'var(--teal)' : p >= 0.8 ? '#c48a1c' : '#5e9aa3';
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <div className="h-1.5 flex-1 min-w-[48px] rounded-full bg-[rgba(36,48,55,0.08)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: color }} />
      </div>
      {showLabel && <span className="num text-[12.5px] text-[var(--ink-2)] whitespace-nowrap">{booked}/{capacity}</span>}
    </div>
  );
}

/** Right drawer on desktop, bottom sheet on mobile. */
export function Sheet({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={cx('sheet glass-strong overflow-hidden', wide && 'wide')} style={{ background: 'rgba(255,255,255,0.92)' }}>
        <div className="flex items-start justify-between gap-4 px-5 md:px-6 pt-5 pb-4 border-b border-[var(--line)]">
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-snug">{title}</div>
            {subtitle && <div className="text-[13.5px] text-[var(--ink-2)] mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 -mr-1.5 rounded-full hover:bg-[rgba(36,48,55,0.07)] flex items-center justify-center flex-shrink-0">
            <Icon name="ri-close-line" className="text-[20px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5">{children}</div>
        {footer && <div className="px-5 md:px-6 py-4 border-t border-[var(--line)] bg-white/70">{footer}</div>}
      </div>
    </>
  );
}

/** Page heading. Serif on the guest site, sans in admin. */
export function PageTitle({ title, subtitle, actions, admin }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; admin?: boolean }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className={admin ? 'text-[24px] md:text-[26px] font-semibold tracking-tight' : 'serif text-[34px] md:text-[44px] leading-[1.08]'}>{title}</h1>
        {subtitle && <p className={cx('text-[var(--ink-2)] mt-1.5', admin ? 'text-[14px]' : 'text-[16px] max-w-[60ch]')}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className = '' }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 mb-3', className)}>
      <h2 className="text-[15.5px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12.5px] text-[var(--ink-3)] mt-1.5">{hint}</span>}
    </label>
  );
}

/** Radio card, e.g. payment choice or room choice. */
export function OptionCard({ selected, onSelect, title, meta, right, disabled }: { selected: boolean; onSelect: () => void; title: ReactNode; meta?: ReactNode; right?: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onSelect} disabled={disabled} aria-pressed={selected}
      className={cx('w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all bg-white',
        selected ? 'border-[var(--teal)] shadow-[0_0_0_3px_rgba(7,80,86,0.10)]' : 'border-[var(--line-2)] hover:border-[var(--ink-3)]',
        disabled && 'opacity-50 cursor-not-allowed')}>
      <span className={cx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', selected ? 'border-[var(--teal)]' : 'border-[var(--line-2)]')}>
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--teal)]" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-medium">{title}</span>
        {meta && <span className="block text-[13px] text-[var(--ink-2)] mt-0.5">{meta}</span>}
      </span>
      {right && <span className="num text-[14.5px] font-medium flex-shrink-0">{right}</span>}
    </button>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx('relative w-10 h-6 rounded-full transition-colors flex-shrink-0', on ? 'bg-[var(--teal)]' : 'bg-[rgba(36,48,55,0.18)]')}>
      <span className={cx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}

export function Empty({ icon = 'ri-leaf-line', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center mx-auto mb-3"><Icon name={icon} className="text-[22px]" /></div>
      <div className="font-medium">{title}</div>
      {children && <div className="text-[14px] text-[var(--ink-2)] mt-1">{children}</div>}
    </div>
  );
}

/** Key/value rows inside a drawer or summary. */
export function Rows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-[var(--line)]">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-[14px]">
          <dt className="text-[var(--ink-2)]">{k}</dt><dd className="text-right font-medium num">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Wide image with rounded corners. */
export const Photo = ({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) =>
  <img src={src} alt={alt} loading="lazy" className={cx('w-full h-full object-cover', className)} />;

export { cx };
