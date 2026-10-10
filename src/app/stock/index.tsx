import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Card, Chips, EmptyState, Fab, Loading, Screen, SearchInput } from '@/components/ui';
import { isLow } from '@/features/stock/utils';
import { formatNumber } from '@/lib/format';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Product } from '@/types';

type Filter = 'tous' | 'bas';
const FILTERS: { value: Filter; label: string }[] = [{ value: 'tous', label: 'Tous' }, { value: 'bas', label: 'Stock bas' }];

export default function StockScreen() {
  const { can } = useAuth();
  const allowed = can('stock.read');
  const { data: products, loading } = useCollection<Product>('products', { enabled: allowed, orderField: null });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');

  const lowCount = useMemo(() => products.filter(isLow).length, [products]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products
      .filter((p) => (filter === 'tous' || isLow(p)) && (!s || p.name.toLowerCase().includes(s) || (p.sku ?? '').toLowerCase().includes(s) || p.category.toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, filter]);

  if (!allowed) {
    return <Screen title="Stock" back><EmptyState icon="lock-closed-outline" title="Accès réservé" text="Votre rôle n'a pas accès au stock." /></Screen>;
  }

  return (
    <Screen title="Stock" subtitle={lowCount > 0 ? `${products.length} articles · ${lowCount} à réapprovisionner` : `${products.length} article${products.length > 1 ? 's' : ''}`} back scroll={false} padded={false}>
      <View style={styles.filters}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Article, référence ou catégorie" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? <Loading /> : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            products.length === 0
              ? <EmptyState icon="cube-outline" title="Catalogue vide" text="Ajoutez vos matériaux (acier, panneaux, quincaillerie…) pour suivre les quantités." />
              : <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre mot-clé ou changez de filtre." />
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/stock/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {isLow(item) ? <Badge label={item.qty <= 0 ? 'Rupture' : 'Stock bas'} tone="danger" /> : null}
              </View>
              <Text style={styles.sub}>{item.category}{item.sku ? ` · ${item.sku}` : ''}</Text>
              <Text style={styles.qty}>{formatNumber(item.qty)} {item.unit}</Text>
            </Card>
          )}
        />
      )}
      {can('stock.write') ? <Fab label="Nouvel article" onPress={() => router.push('/stock/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { ...font.body, fontWeight: '700', color: colors.text, flex: 1 },
  sub: { ...font.small, color: colors.muted, marginTop: 3 },
  qty: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
});
