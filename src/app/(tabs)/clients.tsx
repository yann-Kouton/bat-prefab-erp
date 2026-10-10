import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, Fab, Loading, Screen, SearchInput, Chips } from '@/components/ui';
import { CLIENT_STATUS_LABELS, COUNTRIES } from '@/lib/constants';
import { CLIENT_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Client, ClientStatus } from '@/types';

type Filter = 'tous' | ClientStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'client', label: 'Clients' },
  { value: 'inactif', label: 'Inactifs' },
];

export default function ClientsTab() {
  const { can } = useAuth();
  const { data: clients, loading, error } = useCollection<Client>('clients');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return clients.filter(
      (c) =>
        (filter === 'tous' || c.status === filter) &&
        (!s || c.name.toLowerCase().includes(s) || (c.contactName ?? '').toLowerCase().includes(s) || (c.phone ?? '').includes(s)),
    );
  }, [clients, search, filter]);

  const canCreate = can('clients.write');

  return (
    <Screen title="Clients" subtitle={`${clients.length} fiche${clients.length > 1 ? 's' : ''}`} scroll={false} padded={false}>
      <View style={styles.filters}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un client ou un contact" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-circle-outline" title="Chargement impossible" text={error} />
            ) : clients.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="Aucun client"
                text="Ajoutez vos premiers clients et prospects pour pouvoir leur adresser des devis."
                action={canCreate ? <Button label="Ajouter un client" icon="add" onPress={() => router.push('/clients/new')} /> : undefined}
              />
            ) : (
              <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre nom ou changez de filtre." />
            )
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/clients/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Badge label={CLIENT_STATUS_LABELS[item.status]} tone={CLIENT_TONES[item.status]} />
              </View>
              {item.contactName ? <Text style={styles.sub} numberOfLines={1}>{item.contactName}</Text> : null}
              <Text style={styles.sub} numberOfLines={1}>
                {[item.phone, COUNTRIES[item.country]?.label].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          )}
        />
      )}
      {canCreate ? <Fab label="Nouveau client" onPress={() => router.push('/clients/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { ...font.body, fontWeight: '700', color: colors.text, flex: 1 },
  sub: { ...font.small, color: colors.muted, marginTop: 4 },
});
