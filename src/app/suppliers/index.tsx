import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Card, EmptyState, Fab, Loading, Screen, SearchInput } from '@/components/ui';
import { COUNTRIES } from '@/lib/constants';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Supplier } from '@/types';

export default function SuppliersScreen() {
  const { can } = useAuth();
  const allowed = can('purchases.read');
  const { data: suppliers, loading } = useCollection<Supplier>('suppliers', { enabled: allowed, orderField: null });
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? suppliers.filter((x) => x.name.toLowerCase().includes(s) || (x.contactName ?? '').toLowerCase().includes(s)) : suppliers;
  }, [suppliers, search]);

  if (!allowed) {
    return <Screen title="Fournisseurs" back><EmptyState icon="lock-closed-outline" title="Accès réservé" text="Votre rôle n'a pas accès aux fournisseurs." /></Screen>;
  }

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen title="Fournisseurs" subtitle={`${suppliers.length} fiche${suppliers.length > 1 ? 's' : ''}`} back scroll={false} padded={false}>
      <FlatList
        data={sorted}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ListHeaderComponent={<SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un fournisseur" />}
        ListHeaderComponentStyle={{ marginBottom: spacing.md }}
        ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="business-outline" title="Aucun fournisseur" text="Ajoutez vos fournisseurs pour établir des bons de commande." />}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/suppliers/${item.id}`)}>
            <Text style={styles.name}>{item.name}</Text>
            {item.contactName ? <Text style={styles.sub}>{item.contactName}</Text> : null}
            <Text style={styles.sub}>{[item.phone, COUNTRIES[item.country]?.label].filter(Boolean).join(' · ')}</Text>
          </Card>
        )}
      />
      {can('purchases.write') ? <Fab label="Nouveau fournisseur" onPress={() => router.push('/suppliers/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 4 },
});
