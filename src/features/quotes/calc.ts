import type { QuoteItem } from '@/types';

const round = (n: number) => Math.round(n);

export function lineTotal(item: Pick<QuoteItem, 'quantity' | 'unitPrice'>): number {
  return round(item.quantity * item.unitPrice);
}

/** Totaux d'un devis, arrondis au FCFA. Remise appliquée avant TVA. */
export function computeTotals(items: Pick<QuoteItem, 'quantity' | 'unitPrice'>[], discountPct: number, vatPct: number) {
  const subtotal = round(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const discountAmount = round((subtotal * discountPct) / 100);
  const netHT = subtotal - discountAmount;
  const vatAmount = round((netHT * vatPct) / 100);
  return { subtotal, discountAmount, netHT, vatAmount, totalTTC: netHT + vatAmount };
}
