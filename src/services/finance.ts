import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { dueOf } from '@/lib/finance';
import type { Attachment, Cashflow, Expense, PaymentMethod } from '@/types';

const stamp = () => ({ createdBy: auth.currentUser?.uid ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
/** Firestore refuse les valeurs `undefined`. */
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  date: string;
  label?: string;
  reference?: string;
  proofPhotos?: Attachment[];
  authorName?: string;
}

const expensesPath = (projectId: string) => `projects/${projectId}/expenses`;
const cashflowsPath = (projectId: string) => `projects/${projectId}/cashflows`;

/** Crée une dépense et, si elle est (en partie) payée à la saisie, le décaissement correspondant : tout ou rien. */
export async function createExpense(projectId: string, data: Record<string, unknown> & { label: string }, pay?: PaymentInput): Promise<string> {
  const batch = writeBatch(db);
  const expenseRef = doc(collection(db, expensesPath(projectId)));
  batch.set(expenseRef, clean({ ...data, paidAmount: pay?.amount ?? 0, ...stamp() }));
  if (pay && pay.amount > 0) {
    batch.set(doc(collection(db, cashflowsPath(projectId))), clean({
      type: 'decaissement', date: pay.date, amount: pay.amount, method: pay.method, label: data.label,
      reference: pay.reference, expenseId: expenseRef.id, expenseLabel: data.label,
      proofPhotos: pay.proofPhotos ?? [], authorName: pay.authorName, ...stamp(),
    }));
  }
  await batch.commit();
  return expenseRef.id;
}

/** Règle (en tout ou partie) une dépense : crée le décaissement et met à jour `paidAmount` dans la même transaction. */
export async function payExpense(projectId: string, expenseId: string, input: PaymentInput): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, expensesPath(projectId), expenseId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Dépense introuvable.');
    const expense = snap.data() as Expense;
    const due = dueOf(expense);
    if (input.amount <= 0) throw new Error('Le montant doit être supérieur à 0.');
    if (input.amount > due) throw new Error(`Le montant dépasse le reste à payer (${due} FCFA).`);
    tx.update(ref, { paidAmount: (expense.paidAmount ?? expense.amount) + input.amount, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, cashflowsPath(projectId))), clean({
      type: 'decaissement', date: input.date, amount: input.amount, method: input.method,
      label: input.label || expense.label, reference: input.reference, expenseId, expenseLabel: expense.label,
      proofPhotos: input.proofPhotos ?? [], authorName: input.authorName, ...stamp(),
    }));
  });
}

/** Entrée d'argent, ou décaissement libre (avance, petite caisse… non rattaché à une dépense). */
export async function recordFreeCashflow(projectId: string, type: 'entree' | 'decaissement', input: PaymentInput): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, cashflowsPath(projectId))), clean({
    type, date: input.date, amount: input.amount, method: input.method, label: input.label ?? '',
    reference: input.reference, proofPhotos: input.proofPhotos ?? [], authorName: input.authorName, ...stamp(),
  }));
  await batch.commit();
}

/** Supprime un mouvement ; s'il réglait une dépense, la dépense redevient à payer à hauteur du montant. */
export async function deleteCashflow(projectId: string, flow: Cashflow): Promise<void> {
  await runTransaction(db, async (tx) => {
    const flowRef = doc(db, cashflowsPath(projectId), flow.id);
    if (flow.expenseId) {
      const expRef = doc(db, expensesPath(projectId), flow.expenseId);
      const snap = await tx.get(expRef);
      if (snap.exists()) {
        const e = snap.data() as Expense;
        tx.update(expRef, { paidAmount: Math.max(0, (e.paidAmount ?? e.amount) - flow.amount), updatedAt: serverTimestamp() });
      }
    }
    tx.delete(flowRef);
  });
}

/** Supprime une dépense avec les décaissements qui lui sont rattachés. */
export async function deleteExpense(projectId: string, expenseId: string): Promise<void> {
  const linked = await getDocs(query(collection(db, cashflowsPath(projectId)), where('expenseId', '==', expenseId)));
  const batch = writeBatch(db);
  linked.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, expensesPath(projectId), expenseId));
  await batch.commit();
}
