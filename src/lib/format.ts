const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** 1250000 -> "1 250 000 FCFA" (XOF et XAF s'affichent tous deux en FCFA). */
export function formatMoney(value: number | undefined | null): string {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  return sign + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + ' FCFA';
}

export function formatNumber(value: number | undefined | null): string {
  const n = Number(value) || 0;
  const [int, dec] = n.toString().split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + (dec ? ',' + dec : '');
}

/** Accepte "12,5", "1 200", "1200.50" -> nombre (0 si invalide). */
export function parseNumber(input: string | number | undefined | null): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  const cleaned = input.replace(/[\s\u202F]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  if (typeof value === 'string') {
    const d = new Date(value.length === 10 ? value + 'T00:00:00' : value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00').getTime());

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
