import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button, Chips, EmptyState, Field, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { PAYMENT_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { dueOf } from '@/lib/finance';
import { formatMoney, isISODate, parseNumber, todayISO } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { payExpense, recordFreeCashflow } from '@/services/finance';
import { useCollection } from '@/services/firestore';
import type { Attachment, CashflowType, Expense, PaymentMethod } from '@/types';

const schema = z.object({
  date: z.string().trim().refine(isISODate, 'Format attendu : AAAA-MM-JJ.'),
  amount: z.number().positive('Le montant doit être supérieur à 0.'),
});

/** Entrée d'argent, ou décaissement (libre ou rattaché à une dépense à payer). */
export default function NewCashflow() {
  const { id, type: typeParam, expenseId: expenseParam } = useLocalSearchParams<{ id: string; type?: string; expenseId?: string }>();
  const type: CashflowType = typeParam === 'entree' ? 'entree' : 'decaissement';
  const { can, profile } = useAuth();
  const { data: expenses } = useCollection<Expense>(`projects/${id}/expenses`, { orderField: 'date' });
  const unpaid = expenses.filter((e) => dueOf(e) > 0);

  const [expenseId, setExpenseId] = useState<string>(expenseParam ?? '');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>(type === 'entree' ? 'virement' : 'especes');
  const [reference, setReference] = useState('');
  const [proofs, setProofs] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const allowed = type === 'entree' ? can('finance.income') : can('expenses.write');
  const title = type === 'entree' ? 'Nouvelle entrée' : 'Nouveau décaissement';
  if (!allowed) {
    return <Screen title={title} back><EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas cette opération." /></Screen>;
  }

  const target = unpaid.find((e) => e.id === expenseId);
  const options = [{ value: '', label: 'Aucune (libre)' }, ...unpaid.map((e) => ({ value: e.id, label: `${e.label} · ${formatMoney(dueOf(e))}` }))];

  function pickExpense(value: string) {
    setExpenseId(value);
    const e = unpaid.find((x) => x.id === value);
    if (e) setAmount(String(dueOf(e)));
  }

  async function save() {
    const value = parseNumber(amount);
    const result = validate(schema, { date, amount: value });
    const next: FieldErrors = { ...result.errors };
    if (!target && label.trim().length < 2) next.label = type === 'entree' ? "Indiquez l'origine de l'entrée." : "Indiquez l'objet du décaissement.";
    if (target && value > dueOf(target)) next.amount = `Dépasse le reste à payer (${formatMoney(dueOf(target))}).`;
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const input = { amount: value, method, date: date.trim(), label: label.trim(), reference: reference.trim(), proofPhotos: proofs, authorName: profile?.displayName ?? '' };
    setSaving(true);
    try {
      if (type === 'decaissement' && target) await payExpense(id, target.id, input);
      else await recordFreeCashflow(id, type, input);
      router.back();
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={title} back footer={<Button label="Enregistrer" onPress={save} loading={saving} disabled={uploading} />}>
      {type === 'decaissement' ? (
        <Chips label="Dépense à régler (facultatif)" scroll options={options} value={expenseId} onChange={pickExpense} />
      ) : null}
      {!target ? (
        <Field
          label={type === 'entree' ? 'Origine (acompte client, avance, apport…)' : 'Objet (avance chef d\'équipe, petite caisse…)'}
          value={label} onChangeText={setLabel} error={errors.label}
        />
      ) : null}
      <Field label="Montant (FCFA)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} />
      <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
      <Chips label="Moyen" options={PAYMENT_OPTIONS} value={method} onChange={setMethod} />
      <Field label="Référence (n° de chèque, de transaction… facultatif)" value={reference} onChangeText={setReference} autoCapitalize="characters" />
      <AttachmentPicker
        label="Preuve (reçu, bordereau, capture Mobile Money)" value={proofs} onChange={setProofs}
        folder={`bat-prefab/projets/${id}/tresorerie`} onBusyChange={setUploading}
      />
    </Screen>
  );
}
