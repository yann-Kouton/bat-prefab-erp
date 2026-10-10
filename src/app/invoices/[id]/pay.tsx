import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { PAYMENT_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { formatMoney, isISODate, parseNumber, todayISO } from '@/lib/format';
import { recordPayment, remaining } from '@/services/billing';
import { useDocument } from '@/services/firestore';
import type { Invoice, PaymentMethod } from '@/types';

export default function RecordPayment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data: invoice, loading } = useDocument<Invoice>('invoices', id);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('virement');
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  if (loading) return <Screen title="Encaissement" back><Loading /></Screen>;
  if (!invoice || !can('invoices.write') || invoice.status === 'annulee') {
    return <Screen title="Encaissement" back><EmptyState icon="alert-circle-outline" title="Action impossible" text="Facture introuvable, annulée, ou droits insuffisants." /></Screen>;
  }
  const left = remaining(invoice);

  async function save() {
    const n = parseNumber(amount);
    if (n <= 0) return setError('Le montant doit être supérieur à 0.');
    if (n > left) return setError(`Le montant dépasse le reste à payer (${formatMoney(left)}).`);
    if (!isISODate(date)) return setError('Date : format attendu AAAA-MM-JJ.');
    setError(undefined);
    setSaving(true);
    try {
      await recordPayment(invoice!.id, { amount: n, method, date: date.trim(), reference: reference.trim() });
      router.back();
    } catch (e) {
      notify('Encaissement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Encaissement" subtitle={`${invoice.number} · reste ${formatMoney(left)}`} back footer={<Button label="Enregistrer le paiement" onPress={save} loading={saving} />}>
      <Field label="Montant reçu (FCFA)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={error} autoFocus />
      <Button label={`Solder (${formatMoney(left)})`} variant="secondary" onPress={() => setAmount(String(left))} style={{ marginBottom: 16 }} />
      <Chips label="Moyen de paiement" options={PAYMENT_OPTIONS} value={method} onChange={setMethod} />
      <DateField label="Date du paiement" value={date} onChange={setDate} />
      <Field label="Référence (n° de virement, de chèque…)" value={reference} onChangeText={setReference} autoCapitalize="characters" />
    </Screen>
  );
}
