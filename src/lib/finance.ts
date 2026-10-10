import { addDaysISO, todayISO } from '@/lib/format';
import type { Cashflow, Expense, ExpenseCategory, Project } from '@/types';

/** Catégories pour lesquelles une photo des articles achetés est exigée (modifiable ici). */
export const NEEDS_ARTICLE_PHOTOS: ExpenseCategory[] = ['materiaux'];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  materiaux: '#0B66E4', main_oeuvre: '#F8B608', sous_traitance: '#1F8A4C',
  transport: '#8A4FD6', location: '#E0662B', autre: '#7C8AA0',
};

/* ------------------------------------------------------------ Paiement & justificatifs */

export type PayState = 'paye' | 'partiel' | 'a_payer';

export const paidOf = (e: Pick<Expense, 'amount' | 'paidAmount'>) => Math.min(e.amount, e.paidAmount ?? e.amount);
export const dueOf = (e: Pick<Expense, 'amount' | 'paidAmount'>) => Math.max(0, e.amount - paidOf(e));
export function payStateOf(e: Pick<Expense, 'amount' | 'paidAmount'>): PayState {
  const paid = paidOf(e);
  return paid >= e.amount ? 'paye' : paid > 0 ? 'partiel' : 'a_payer';
}

export const lacksInvoice = (e: Expense) => !e.invoicePhotos?.length && !e.noInvoiceReason;
export const lacksArticlePhotos = (e: Expense) => NEEDS_ARTICLE_PHOTOS.includes(e.category) && !e.articlePhotos?.length;
export const isIncomplete = (e: Expense) => lacksInvoice(e) || lacksArticlePhotos(e);

/* ------------------------------------------------------------ Période */

export type Period = 'all' | 'month' | '30' | '90';
export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Tout' }, { value: 'month', label: 'Ce mois' },
  { value: '30', label: '30 jours' }, { value: '90', label: '90 jours' },
];

export function inPeriod(date: string, period: Period): boolean {
  if (period === 'all') return true;
  if (period === 'month') return date.slice(0, 7) === todayISO().slice(0, 7);
  return date >= addDaysISO(-Number(period));
}

/* ------------------------------------------------------------ Indicateurs */

export interface FinanceSummary {
  budget: number;
  spent: number; // dépenses engagées
  remaining: number; // budget - dépensé (négatif = dépassement)
  consumption: number; // % du budget consommé
  progress: number; // % d'avancement des travaux
  cpi: number | null; // indice de coût : valeur acquise / dépensé (≥ 1 = on est dans les clous)
  forecast: number | null; // coût estimé à terminaison, au rythme actuel
  forecastGap: number | null; // budget - projection (négatif = dépassement attendu)
  paid: number; // total décaissé
  due: number; // reste à payer sur les dépenses
  income: number; // entrées d'argent
  treasury: number; // entrées - décaissements
  incomplete: number; // dépenses sans justificatif complet
}

export function summarize(project: Pick<Project, 'budget' | 'progress'>, expenses: Expense[], cashflows: Cashflow[]): FinanceSummary {
  const budget = Number(project.budget) || 0;
  const progress = Number(project.progress) || 0;
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  // Décaissé = ce qui a été payé sur les dépenses + les décaissements libres (non rattachés à une dépense)
  const paid = expenses.reduce((s, e) => s + paidOf(e), 0)
    + cashflows.filter((c) => c.type === 'decaissement' && !c.expenseId).reduce((s, c) => s + c.amount, 0);
  const income = cashflows.filter((c) => c.type === 'entree').reduce((s, c) => s + c.amount, 0);
  const earned = (budget * progress) / 100;
  const forecast = progress > 0 && spent > 0 ? spent / (progress / 100) : null;
  return {
    budget, spent, progress,
    remaining: budget - spent,
    consumption: budget > 0 ? (spent / budget) * 100 : 0,
    cpi: spent > 0 && progress > 0 && budget > 0 ? earned / spent : null,
    forecast,
    forecastGap: forecast !== null && budget > 0 ? budget - forecast : null,
    paid,
    due: expenses.reduce((s, e) => s + dueOf(e), 0),
    income,
    treasury: income - paid,
    incomplete: expenses.filter(isIncomplete).length,
  };
}

export function byCategory(expenses: Expense[]): { category: ExpenseCategory; amount: number }[] {
  const map = new Map<ExpenseCategory, number>();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function bySupplier(expenses: Expense[], limit = 5): { name: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const name = e.supplierName?.trim() || 'Non renseigné';
    map.set(name, (map.get(name) ?? 0) + e.amount);
  }
  return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, limit);
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;

export function byMonth(expenses: Expense[], cashflows: Cashflow[], count = 6): { key: string; label: string; expenses: number; income: number }[] {
  const map = new Map<string, { expenses: number; income: number }>();
  const slot = (date: string) => {
    const key = date.slice(0, 7);
    if (!map.has(key)) map.set(key, { expenses: 0, income: 0 });
    return map.get(key)!;
  };
  for (const e of expenses) slot(e.date).expenses += e.amount;
  for (const c of cashflows) if (c.type === 'entree') slot(c.date).income += c.amount;
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-count)
    .map(([key, v]) => ({ key, label: monthLabel(key), ...v }));
}
