import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, IconButton, InfoRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { isLow } from '@/features/stock/utils';
import { MOVEMENT_LABELS } from '@/lib/constants';
import { formatDate, formatMoney, formatNumber, toDate } from '@/lib/format';
import { useCollection, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Product, StockMovement } from '@/types';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data: product, loading } = useDocument<Product>('products', id);
  const { data: movements } = useCollection<StockMovement>('stockMovements', { where: ['productId', '==', id] });
  const sorted = useMemo(
    () => [...movements].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)),
    [movements],
  );

  if (loading) return <Screen title="Article" back><Loading /></Screen>;
  if (!product) {
    return <Screen title="Article" back><EmptyState icon="alert-circle-outline" title="Article introuvable" text="Cet article a peut-être été supprimé." /></Screen>;
  }
  const canWrite = can('stock.write');

  return (
    <Screen
      title={product.name}
      subtitle={product.category}
      back
      right={canWrite ? <IconButton name="create-outline" color="#FFFFFF" label="Modifier l'article" onPress={() => router.push(`/stock/${product.id}/edit`)} /> : undefined}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.qty}>{formatNumber(product.qty)} {product.unit}</Text>
          {isLow(product) ? <Badge label={product.qty <= 0 ? 'Rupture' : 'Stock bas'} tone="danger" /> : <Badge label="Stock correct" tone="success" />}
        </View>
        <InfoRow label="Référence" value={product.sku} />
        <InfoRow label="Seuil d'alerte" value={`${formatNumber(product.minQty)} ${product.unit}`} />
        {can('purchases.read') ? <InfoRow label="Dernier prix d'achat" value={product.lastCost ? formatMoney(product.lastCost) : '—'} /> : null}
      </Card>

      {canWrite ? (
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Entrée" icon="arrow-down-circle-outline" style={{ flex: 1 }} onPress={() => router.push(`/stock/${product.id}/move?type=entree`)} />
            <Button label="Sortie" icon="arrow-up-circle-outline" variant="accent" style={{ flex: 1 }} onPress={() => router.push(`/stock/${product.id}/move?type=sortie`)} />
          </View>
          <Button label="Inventaire (recaler la quantité)" icon="clipboard-outline" variant="secondary" onPress={() => router.push(`/stock/${product.id}/move?type=ajustement`)} />
        </View>
      ) : null}

      <SectionTitle>Historique des mouvements</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState icon="swap-vertical-outline" title="Aucun mouvement" />
      ) : (
        sorted.slice(0, 30).map((m) => (
          <Card key={m.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.mv}>{MOVEMENT_LABELS[m.type]}</Text>
              <Text style={[styles.delta, { color: m.delta >= 0 ? colors.success : colors.danger }]}>{m.delta >= 0 ? '+' : ''}{formatNumber(m.delta)} {product.unit}</Text>
            </View>
            <Text style={styles.sub}>
              {formatDate(m.createdAt)} · solde {formatNumber(m.balanceAfter)}{m.projectCode ? ` · ${m.projectCode}` : ''}{m.authorName ? ` · ${m.authorName}` : ''}
            </Text>
            {m.reason ? <Text style={styles.sub}>{m.reason}</Text> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  qty: { fontSize: 28, fontWeight: '800', color: colors.text },
  mv: { ...font.body, fontWeight: '700', color: colors.text },
  delta: { ...font.body, fontWeight: '800' },
  sub: { ...font.small, color: colors.muted, marginTop: 3 },
});
