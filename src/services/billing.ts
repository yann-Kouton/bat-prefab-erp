import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { todayISO } from '@/lib/format';
import type { Invoice, Payment, PaymentMethod } from '@/types';

export type InvoicePayState = 'annulee' | 'payee' | 'partielle' | 'en_retard' | 'a_payer';

/** État de règlement d'une facture, calculé (jamais stocké : il dépend de la date du jour). */
export function payState(inv: Pick<Invoice, 'status' | 'totalTTC' | 'paidAmount' | 'dueDate'>): InvoicePayState {
  if (inv.status === 'annulee') return 'annulee';
  if (inv.paidAmount >= inv.totalTTC) return 'payee';
  if (inv.dueDate && inv.dueDate < todayISO()) return 'en_retard';
  return inv.paidAmount > 0 ? 'partielle' : 'a_payer';
}

export const remaining = (inv: Pick<Invoice, 'totalTTC' | 'paidAmount'>) => Math.max(0, inv.totalTTC - inv.paidAmount);

interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  date: string;
  reference?: string;
}

/** Encaissement : crée le paiement et met à jour `paidAmount` dans la même transaction. */
export async function recordPayment(invoiceId: string, input: PaymentInput): Promise<void> {
  await runTransaction(db, async (tx) => {
    const invRef = doc(db, 'invoices', invoiceId);
    const snap = await tx.get(invRef);
    if (!snap.exists()) throw new Error('Facture introuvable.');
    const inv = snap.data() as Invoice;
    if (inv.status === 'annulee') throw new Error('Cette facture est annulée.');
    const left = remaining(inv);
    if (input.amount <= 0) throw new Error('Le montant doit être supérieur à 0.');
    if (input.amount > left) throw new Error(`Le montant dépasse le reste à payer (${left} FCFA).`);

    tx.update(invRef, { paidAmount: inv.paidAmount + input.amount, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, 'payments')), {
      invoiceId,
      invoiceNumber: inv.number,
      amount: input.amount,
      method: input.method,
      date: input.date,
      reference: input.reference ?? '',
      createdBy: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  });
}

/** Annule un encaissement saisi par erreur (réservé aux administrateurs). */
export async function deletePayment(paymentId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const payRef = doc(db, 'payments', paymentId);
    const paySnap = await tx.get(payRef);
    if (!paySnap.exists()) return;
    const pay = paySnap.data() as Payment;
    const invRef = doc(db, 'invoices', pay.invoiceId);
    const invSnap = await tx.get(invRef);
    if (invSnap.exists()) {
      const inv = invSnap.data() as Invoice;
      tx.update(invRef, { paidAmount: Math.max(0, inv.paidAmount - pay.amount), updatedAt: serverTimestamp() });
    }
    tx.delete(payRef);
  });
}
