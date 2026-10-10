import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, Chips, EmptyState, Field, InfoRow, Loading, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { INVOICE_KIND_LABELS, INVOICE_KIND_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { addDaysISO, formatMoney, formatNumber, isISODate, parseNumber, todayISO } from '@/lib/format';
import { createDocument, nextNumber, useCollection, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Invoice, InvoiceKind, Quote } from '@/types';

/** Création d'une facture à partir d'un devis accepté : acompte, situation de travaux, solde ou facture complète. */
export default function NewInvoice() {
  const { quoteId } = useLocalSearchParams<{ quoteId: string }>();
  const { can } = useAuth();
  const { data: quote, loading } = useDocument<Quote>('quotes', quoteId);
  const { data: existing } = useCollection<Invoice>('invoices', { where: ['quoteId', '==', quoteId ?? ''], enabled: !!quoteId });

  const [kind, setKind] = useState<InvoiceKind>('acompte');
  const [pct, setPct] = useState('30');
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState(addDaysISO(30));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const invoicedHT = useMemo(() => existing.filter((i) => i.status !== 'annulee').reduce((s, i) => s + i.netHT, 0), [existing]);
  const leftHT = quote ? Math.max(0, quote.netHT - invoicedHT) : 0;

  const amountHT = useMemo(() => {
    if (!quote) return 0;
    if (kind === 'solde') return leftHT;
    if (kind === 'complete') return quote.netHT;
    return Math.round((quote.netHT * parseNumber(pct)) / 100);
  }, [quote, kind, pct, leftHT]);

  if (loading) return <Screen title="Nouvelle facture" back><Loading /></Screen>;
  if (!quote || !can('invoices.write')) {
    return <Screen title="Nouvelle facture" back><EmptyState icon="lock-closed-outline" title="Action impossible" text="Devis introuvable ou droits insuffisants." /></Screen>;
  }
  if (quote.status !== 'accepte') {
    return <Screen title="Nouvelle facture" back><EmptyState icon="alert-circle-outline" title="Devis non accepté" text="On ne facture que les devis acceptés par le client." /></Screen>;
  }

  const vatAmount = Math.round((amountHT * quote.vatPct) / 100);
  const totalTTC = amountHT + vatAmount;
  const situationNo = existing.filter((i) => i.kind === 'situation' && i.status !== 'annulee').length + 1;
  const defaultLabel =
    kind === 'acompte' ? `Acompte ${formatNumber(parseNumber(pct))} % – ${quote.projectTitle}`
    : kind === 'situation' ? `Situation de travaux n°${situationNo} – ${quote.projectTitle}`
    : kind === 'solde' ? `Solde – ${quote.projectTitle}`
    : quote.projectTitle;

  async function save() {
    if (amountHT <= 0) return setError(kind === 'solde' ? 'Le devis est déjà entièrement facturé.' : 'Le montant à facturer doit être supérieur à 0.');
    if (kind === 'complete' && invoicedHT > 0) return setError('Une facture complète n’est possible que si rien n’a encore été facturé. Choisissez « Solde ».');
    if (amountHT > leftHT) return setError(`Ce montant dépasse le reste à facturer (${formatMoney(leftHT)} HT).`);
    if (!isISODate(dueDate)) return setError("Échéance : format attendu AAAA-MM-JJ.");
    setError(undefined);
    setSaving(true);
    try {
      const number = await nextNumber('FAC');
      const id = await createDocument('invoices', {
        number, kind, label: (label.trim() || defaultLabel),
        quoteId: quote!.id, quoteNumber: quote!.number, projectId: quote!.projectId ?? null,
        clientId: quote!.clientId, clientName: quote!.clientName, country: quote!.country, currency: quote!.currency,
        netHT: amountHT, vatPct: quote!.vatPct, vatAmount, totalTTC, paidAmount: 0,
        issueDate: todayISO(), dueDate: dueDate.trim(), status: 'emise', notes: notes.trim(),
      });
      router.replace(`/invoices/${id}`);
    } catch (e) {
      notify('Création impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Nouvelle facture"
      subtitle={`${quote.number} · ${quote.clientName}`}
      back
      footer={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ ...font.small, color: colors.muted }}>Total TTC</Text>
            <Text style={{ ...font.heading, color: colors.text }}>{formatMoney(totalTTC)}</Text>
          </View>
          <Button label="Émettre la facture" onPress={save} loading={saving} />
        </View>
      }
    >
      <Card>
        <InfoRow label="Devis (net HT)" value={formatMoney(quote.netHT)} />
        <InfoRow label="Déjà facturé (HT)" value={formatMoney(invoicedHT)} />
        <InfoRow label="Reste à facturer (HT)" value={formatMoney(leftHT)} />
      </Card>

      <Chips label="Type de facture" options={INVOICE_KIND_OPTIONS} value={kind} onChange={(k) => { setKind(k); setError(undefined); }} />
      {kind === 'acompte' || kind === 'situation' ? (
        <Field label={kind === 'acompte' ? "Pourcentage du devis (%)" : "Part du devis réalisée sur cette période (%)"} value={pct} onChangeText={setPct} keyboardType="decimal-pad" error={error} />
      ) : (
        <Text style={{ ...font.small, color: error ? colors.danger : colors.muted, marginBottom: spacing.lg }}>
          {error ?? (kind === 'solde' ? `Facture le reste du devis : ${formatMoney(leftHT)} HT.` : 'Facture la totalité du devis.')}
        </Text>
      )}
      <Card>
        <InfoRow label="Montant HT" value={formatMoney(amountHT)} />
        <InfoRow label={`TVA (${formatNumber(quote.vatPct)} %)`} value={formatMoney(vatAmount)} />
        <InfoRow label="Total TTC" value={formatMoney(totalTTC)} />
      </Card>
      <Field label="Libellé" value={label} onChangeText={setLabel} placeholder={defaultLabel} hint={`Type : ${INVOICE_KIND_LABELS[kind]}. Laissez vide pour utiliser le libellé proposé.`} multiline />
      <DateField label="Échéance de paiement" value={dueDate} onChange={setDueDate} />
      <Field label="Remarques (visibles sur la facture)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
