import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { AttachmentGrid } from '@/components/AttachmentPicker';
import { BudgetBar } from '@/components/charts';
import { Badge, Button, Card, EmptyState, IconButton, InfoRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { EXPENSE_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { dueOf, paidOf, payStateOf } from '@/lib/finance';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { deleteCashflow, deleteExpense } from '@/services/finance';
import { useCollection, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Cashflow, Expense } from '@/types';

const STATE_BADGE = { paye: { label: 'Payée', tone: 'success' }, partiel: { label: 'Partiellement payée', tone: 'warning' }, a_payer: { label: 'À payer', tone: 'danger' } } as const;

export default function ExpenseDetail() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { can } = useAuth();
  const { data: expense, loading } = useDocument<Expense>(`projects/${id}/expenses`, expenseId);
  const { data: payments } = useCollection<Cashflow>(`projects/${id}/cashflows`, { where: ['expenseId', '==', expenseId] });

  if (loading) return <Screen title="Dépense" back><Loading /></Screen>;
  if (!expense) {
    return <Screen title="Dépense" back><EmptyState icon="alert-circle-outline" title="Dépense introuvable" text="Elle a peut-être été supprimée." /></Screen>;
  }

  const state = STATE_BADGE[payStateOf(expense)];
  const due = dueOf(expense);
  const canDelete = can('expenses.delete');
  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));

  function removeExpense() {
    confirmAction('Supprimer cette dépense ?', `${expense!.label} · ${formatMoney(expense!.amount)}\nLes paiements rattachés seront supprimés aussi.`, 'Supprimer', async () => {
      try { await deleteExpense(id, expense!.id); router.back(); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }
  function removePayment(p: Cashflow) {
    confirmAction('Annuler ce paiement ?', `${formatMoney(p.amount)} · ${formatDate(p.date)}\nLa dépense redeviendra à payer.`, 'Annuler le paiement', async () => {
      try { await deleteCashflow(id, p); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }

  return (
    <Screen
      title="Dépense" subtitle={EXPENSE_LABELS[expense.category]} back
      right={can('expenses.write') ? <IconButton name="create-outline" color="#FFFFFF" label="Modifier la dépense" onPress={() => router.push(`/projects/${id}/expenses/${expense.id}/edit`)} /> : undefined}
    >
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>{expense.label}</Text>
          <Badge label={state.label} tone={state.tone} />
        </View>
        <Text style={styles.amount}>{formatMoney(expense.amount)}</Text>
        <View style={{ marginTop: spacing.md }}><BudgetBar spent={paidOf(expense)} budget={expense.amount} progress={100} /></View>
        <Text style={styles.small}>Payé {formatMoney(paidOf(expense))} · Reste {formatMoney(due)}</Text>
        <View style={{ marginTop: spacing.md }}>
          <InfoRow label="Date" value={formatDate(expense.date)} />
          <InfoRow label="Fournisseur" value={expense.supplierName} />
          {expense.quantity ? <InfoRow label="Quantité" value={`${formatNumber(expense.quantity)} ${expense.unit ?? ''}`} /> : null}
          {expense.unitPrice ? <InfoRow label="Prix unitaire" value={formatMoney(expense.unitPrice)} /> : null}
          <InfoRow label="N° de facture" value={expense.invoiceNumber} />
          <InfoRow label="Saisie par" value={expense.authorName} />
          {expense.notes ? <InfoRow label="Notes" value={expense.notes} /> : null}
        </View>
      </Card>

      {due > 0 && can('expenses.write') ? (
        <Button label={`Régler (reste ${formatMoney(due)})`} icon="cash-outline" onPress={() => router.push(`/projects/${id}/cashflows/new?type=decaissement&expenseId=${expense.id}`)} style={{ marginBottom: spacing.md }} />
      ) : null}

      <SectionTitle>Photos des articles</SectionTitle>
      {expense.articlePhotos?.length ? <AttachmentGrid items={expense.articlePhotos} /> : <Text style={styles.missing}>Aucune photo des articles.</Text>}

      <SectionTitle>Facture / reçu</SectionTitle>
      {expense.invoicePhotos?.length ? <AttachmentGrid items={expense.invoicePhotos} /> : (
        <Text style={styles.missing}>{expense.noInvoiceReason ? `Pas de facture : ${expense.noInvoiceReason}` : 'Aucune facture jointe.'}</Text>
      )}

      <SectionTitle>Paiements</SectionTitle>
      {sorted.length === 0 ? <Text style={styles.missing}>Aucun décaissement enregistré pour cette dépense.</Text> : sorted.map((p) => (
        <Card key={p.id} onPress={canDelete ? () => removePayment(p) : undefined}>
          <View style={styles.row}>
            <Text style={styles.strong}>{formatMoney(p.amount)}</Text>
            <Text style={styles.small}>{formatDate(p.date)}</Text>
          </View>
          <Text style={styles.small}>{PAYMENT_LABELS[p.method]}{p.reference ? ` · ${p.reference}` : ''}{p.authorName ? ` · ${p.authorName}` : ''}</Text>
          {p.proofPhotos?.length ? <View style={{ marginTop: spacing.sm }}><AttachmentGrid items={p.proofPhotos} /></View> : null}
        </Card>
      ))}

      {canDelete ? <Button label="Supprimer la dépense" icon="trash-outline" variant="danger" onPress={removeExpense} style={{ marginTop: spacing.lg }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  title: { ...font.heading, color: colors.text, flex: 1 },
  amount: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  small: { ...font.small, color: colors.muted, marginTop: 6 },
  strong: { ...font.body, fontWeight: '700', color: colors.text },
  missing: { ...font.body, color: colors.muted, marginBottom: spacing.md },
});
