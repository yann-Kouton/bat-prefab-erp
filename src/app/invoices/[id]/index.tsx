import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, InfoRow, Loading, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { COUNTRIES, INVOICE_KIND_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { PAY_LABELS, PAY_TONES } from '@/lib/tones';
import { shareInvoicePdf } from '@/features/invoices/pdf';
import { deletePayment, payState, remaining } from '@/services/billing';
import { updateDocument, useCollection, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Invoice, Payment } from '@/types';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data: invoice, loading } = useDocument<Invoice>('invoices', id);
  const { data: payments } = useCollection<Payment>('payments', { where: ['invoiceId', '==', id] });
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <Screen title="Facture" back><Loading /></Screen>;
  if (!invoice) {
    return <Screen title="Facture" back><EmptyState icon="alert-circle-outline" title="Facture introuvable" text="Cette facture n'existe pas ou vous n'y avez pas accès." /></Screen>;
  }

  const canWrite = can('invoices.write');
  const state = payState(invoice);
  const left = remaining(invoice);
  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e) { notify('Action impossible', errorMessage(e)); } finally { setBusy(null); }
  }

  const cancel = () => confirmAction(
    'Annuler cette facture ?',
    `${invoice.number} sera annulée et ne comptera plus dans le facturé du devis. Une facture ne peut pas être supprimée.`,
    'Annuler la facture',
    () => { run('cancel', () => updateDocument('invoices', invoice.id, { status: 'annulee' })); },
  );
  const removePayment = (p: Payment) => confirmAction('Supprimer ce paiement ?', `${formatMoney(p.amount)} du ${formatDate(p.date)} sera retiré.`, 'Supprimer', () => {
    run('del' + p.id, () => deletePayment(p.id));
  });

  return (
    <Screen
      title={invoice.number}
      subtitle={invoice.clientName}
      back
      footer={<Button label="Générer le PDF" icon="document-attach-outline" variant="accent" loading={busy === 'pdf'} onPress={() => run('pdf', () => shareInvoicePdf(invoice, payments))} />}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title} numberOfLines={3}>{invoice.label}</Text>
          <Badge label={PAY_LABELS[state]} tone={PAY_TONES[state]} />
        </View>
        <InfoRow label="Type" value={INVOICE_KIND_LABELS[invoice.kind]} />
        <InfoRow label="Client" value={invoice.clientName} />
        <InfoRow label="Pays" value={COUNTRIES[invoice.country].label} />
        <InfoRow label="Émise le" value={formatDate(invoice.issueDate)} />
        <InfoRow label="Échéance" value={formatDate(invoice.dueDate)} />
        <InfoRow label="Devis" value={invoice.quoteNumber} />
      </Card>

      <Card>
        <Row label="Montant HT" value={formatMoney(invoice.netHT)} />
        <Row label={`TVA (${formatNumber(invoice.vatPct)} %)`} value={formatMoney(invoice.vatAmount)} />
        <Row label="Total TTC" value={formatMoney(invoice.totalTTC)} strong />
        <View style={{ marginVertical: spacing.md }}><ProgressBar value={invoice.totalTTC > 0 ? (invoice.paidAmount / invoice.totalTTC) * 100 : 0} /></View>
        <Row label="Réglé" value={formatMoney(invoice.paidAmount)} />
        <Row label="Reste à payer" value={formatMoney(left)} strong />
      </Card>

      <SectionTitle>Paiements</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState icon="wallet-outline" title="Aucun paiement" />
      ) : (
        sorted.map((p) => (
          <Card key={p.id} onPress={can('users.manage') ? () => removePayment(p) : undefined}>
            <View style={styles.rowBetween}>
              <Text style={styles.pay}>{formatMoney(p.amount)}</Text>
              <Text style={styles.sub}>{formatDate(p.date)}</Text>
            </View>
            <Text style={styles.sub}>{PAYMENT_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}</Text>
          </Card>
        ))
      )}

      {canWrite && invoice.status === 'emise' ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {left > 0 ? <Button label="Enregistrer un paiement" icon="cash-outline" onPress={() => router.push(`/invoices/${invoice.id}/pay`)} /> : null}
          {invoice.paidAmount === 0 ? <Button label="Annuler la facture" icon="close-circle-outline" variant="danger" onPress={cancel} loading={busy === 'cancel'} /> : null}
        </View>
      ) : null}
      {can('users.manage') && sorted.length > 0 ? <Text style={[styles.sub, { textAlign: 'center', marginTop: spacing.md }]}>Administrateur : touchez un paiement pour le supprimer.</Text> : null}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.rowBetween, { paddingVertical: 4 }]}>
      <Text style={{ ...font.body, color: strong ? colors.text : colors.muted, fontWeight: strong ? '700' : '400' }}>{label}</Text>
      <Text style={{ ...font.body, color: colors.text, fontWeight: strong ? '700' : '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  title: { ...font.heading, color: colors.text, flex: 1 },
  pay: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 3 },
});
