import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Card, Chips, EmptyState, Fab, Loading, Screen, SearchInput } from '@/components/ui';
import { PURCHASE_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import { PURCHASE_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { PurchaseOrder, PurchaseStatus } from '@/types';

type Filter = 'tous' | PurchaseStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'tous', label: 'Tous' }, { value: 'brouillon', label: 'Brouillons' }, { value: 'commande', label: 'À réceptionner' },
  { value: 'recu', label: 'Reçus' }, { value: 'annule', label: 'Annulés' },
];

export default function PurchasesScreen() {
  const { can } = useAuth();
  const allowed = can('purchases.read');
  const { data: orders, loading } = useCollection<PurchaseOrder>('purchaseOrders', { enabled: allowed });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((o) => (filter === 'tous' || o.status === filter) && (!s || o.number.toLowerCase().includes(s) || o.supplierName.toLowerCase().includes(s)));
  }, [orders, search, filter]);

  if (!allowed) {
    return <Screen title="Achats" back><EmptyState icon="lock-closed-outline" title="Accès réservé" text="Votre rôle n'a pas accès aux achats." /></Screen>;
  }

  return (
    <Screen title="Achats" subtitle={`${orders.length} bon${orders.length > 1 ? 's' : ''} de commande`} back scroll={false} padded={false}>
      <View style={styles.filters}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Numéro ou fournisseur" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? <Loading /> : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={orders.length === 0
            ? <EmptyState icon="cart-outline" title="Aucun bon de commande" text="Créez un bon de commande pour commander auprès d'un fournisseur et alimenter le stock." />
            : <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre mot-clé ou changez de filtre." />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/purchases/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.number}>{item.number}</Text>
                <Badge label={PURCHASE_STATUS_LABELS[item.status]} tone={PURCHASE_TONES[item.status]} />
              </View>
              <Text style={styles.sub} numberOfLines={1}>{item.supplierName}{item.projectCode ? ` · ${item.projectCode}` : ''}</Text>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Text style={styles.sub}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.amount}>{formatMoney(item.total)}</Text>
              </View>
            </Card>
          )}
        />
      )}
      {can('purchases.write') ? <Fab label="Nouveau bon de commande" onPress={() => router.push('/purchases/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  number: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 4 },
  amount: { ...font.body, fontWeight: '700', color: colors.text },
});
