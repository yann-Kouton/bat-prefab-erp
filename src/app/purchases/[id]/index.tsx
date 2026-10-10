import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, IconButton, InfoRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { COUNTRIES, PURCHASE_STATUS_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { PURCHASE_TONES } from '@/lib/tones';
import { removeDocument, updateDocument, useDocument } from '@/services/firestore';
import { receivePurchaseOrder } from '@/services/stock';
import { colors, font, spacing } from '@/theme';
import type { PurchaseOrder } from '@/types';

export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, profile } = useAuth();
  const { data: order, loading } = useDocument<PurchaseOrder>('purchaseOrders', id);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <Screen title="Bon de commande" back><Loading /></Screen>;
  if (!order) {
    return <Screen title="Bon de commande" back><EmptyState icon="alert-circle-outline" title="Bon introuvable" text="Ce bon de commande a peut-être été supprimé." /></Screen>;
  }

  const canWrite = can('purchases.write');
  const canApprove = can('purchases.approve'); // validation de l'engagement de dépense
  const stockLines = order.items.filter((i) => i.productId).length;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e) { notify('Action impossible', errorMessage(e)); } finally { setBusy(null); }
  }

  const place = () => run('commande', () => updateDocument('purchaseOrders', order.id, { status: 'commande', orderedAt: serverTimestamp() }));
  const cancel = () => confirmAction('Annuler ce bon de commande ?', `${order.number} sera marqué comme annulé.`, 'Annuler le bon', () => { run('annule', () => updateDocument('purchaseOrders', order.id, { status: 'annule' })); });
  const receive = () => confirmAction(
    'Réceptionner la commande ?',
    stockLines > 0 ? `${stockLines} ligne(s) du catalogue seront ajoutées au stock. Cette action ne peut pas être répétée.` : 'Aucune ligne n’est liée au catalogue : le stock ne sera pas modifié.',
    'Réceptionner',
    () => { run('recu', () => receivePurchaseOrder(order.id, profile?.displayName ?? '')); },
  );
  const remove = () => confirmAction('Supprimer ce brouillon ?', `${order.number} sera supprimé définitivement.`, 'Supprimer', async () => {
    try { await removeDocument('purchaseOrders', order.id); router.back(); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
  });

  return (
    <Screen
      title={order.number}
      subtitle={order.supplierName}
      back
      right={canWrite && order.status === 'brouillon' ? <IconButton name="create-outline" color="#FFFFFF" label="Modifier le bon" onPress={() => router.push(`/purchases/${order.id}/edit`)} /> : undefined}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{order.supplierName}</Text>
          <Badge label={PURCHASE_STATUS_LABELS[order.status]} tone={PURCHASE_TONES[order.status]} />
        </View>
        <InfoRow label="Chantier" value={order.projectCode} />
        <InfoRow label="Pays" value={COUNTRIES[order.country].label} />
        <InfoRow label="Créé le" value={formatDate(order.createdAt)} />
        <InfoRow label="Livraison souhaitée" value={order.expectedDate ? formatDate(order.expectedDate) : undefined} />
        {order.status === 'recu' ? <InfoRow label="Reçu le" value={formatDate(order.receivedAt)} /> : null}
      </Card>

      <SectionTitle>Lignes</SectionTitle>
      <Card>
        {order.items.map((item, i) => (
          <View key={item.id} style={[styles.item, i > 0 && styles.itemBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.description}</Text>
              <Text style={styles.itemSub}>{formatNumber(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}{item.productId ? ' · catalogue' : ''}</Text>
            </View>
            <Text style={styles.itemTotal}>{formatMoney(item.quantity * item.unitPrice)}</Text>
          </View>
        ))}
        <View style={[styles.rowBetween, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total HT</Text>
          <Text style={styles.totalValue}>{formatMoney(order.total)}</Text>
        </View>
      </Card>
      {order.notes ? <Card><Text style={styles.noteTitle}>Remarques</Text><Text style={styles.note}>{order.notes}</Text></Card> : null}

      {canWrite ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {order.status === 'brouillon' && canApprove ? <Button label="Valider la commande" icon="send-outline" onPress={place} loading={busy === 'commande'} /> : null}
          {order.status === 'brouillon' && !canApprove ? <Text style={styles.hint}>Un administrateur ou la direction doit valider ce bon avant l'envoi au fournisseur.</Text> : null}
          {order.status === 'commande' ? <Button label="Réceptionner la livraison" icon="download-outline" variant="accent" onPress={receive} loading={busy === 'recu'} /> : null}
          {(order.status === 'brouillon' || order.status === 'commande') && canApprove ? <Button label="Annuler le bon" icon="close-circle-outline" variant="secondary" onPress={cancel} loading={busy === 'annule'} /> : null}
          {order.status === 'brouillon' && canApprove ? <Button label="Supprimer le brouillon" icon="trash-outline" variant="danger" onPress={remove} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  title: { ...font.heading, color: colors.text, flex: 1 },
  item: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.neutralSoft },
  itemTitle: { ...font.body, color: colors.text, fontWeight: '600' },
  itemSub: { ...font.small, color: colors.muted, marginTop: 2 },
  itemTotal: { ...font.body, fontWeight: '700', color: colors.text },
  totalRow: { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  totalLabel: { ...font.body, fontWeight: '700', color: colors.text },
  totalValue: { ...font.heading, color: colors.text },
  noteTitle: { ...font.small, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  note: { ...font.body, color: colors.text, lineHeight: 22 },
  hint: { ...font.small, color: colors.muted, textAlign: 'center' },
});
