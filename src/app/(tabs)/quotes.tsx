import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, Chips, EmptyState, Fab, Loading, Screen, SearchInput } from '@/components/ui';
import { QUOTE_STATUS_LABELS } from '@/lib/constants';
import { formatDate, formatMoney, toDate } from '@/lib/format';
import { QUOTE_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Quote, QuoteStatus } from '@/types';

type Filter = 'tous' | QuoteStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'envoye', label: 'Envoyés' },
  { value: 'accepte', label: 'Acceptés' },
  { value: 'refuse', label: 'Refusés' },
];

export default function QuotesTab() {
  const { can } = useAuth();
  const { data: quotes, loading, error } = useCollection<Quote>('quotes');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return quotes.filter(
      (q) =>
        (filter === 'tous' || q.status === filter) &&
        (!s || q.number.toLowerCase().includes(s) || q.clientName.toLowerCase().includes(s) || q.projectTitle.toLowerCase().includes(s)),
    );
  }, [quotes, search, filter]);

  const canCreate = can('quotes.write');

  return (
    <Screen title="Devis" subtitle={`${quotes.length} devis`} scroll={false} padded={false}>
      <View style={styles.filters}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Numéro, client ou intitulé" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(q) => q.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-circle-outline" title="Chargement impossible" text={error} />
            ) : quotes.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="Aucun devis"
                text="Créez un devis pour un client : vous pourrez ensuite le partager en PDF."
                action={canCreate ? <Button label="Créer un devis" icon="add" onPress={() => router.push('/quotes/new')} /> : undefined}
              />
            ) : (
              <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre mot-clé ou changez de filtre." />
            )
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/quotes/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.number}>{item.number}</Text>
                <Badge label={QUOTE_STATUS_LABELS[item.status]} tone={QUOTE_TONES[item.status]} />
              </View>
              <Text style={styles.title} numberOfLines={1}>{item.projectTitle}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.clientName} · {formatDate(toDate(item.createdAt))}</Text>
              <Text style={styles.amount}>{formatMoney(item.totalTTC)}</Text>
            </Card>
          )}
        />
      )}
      {canCreate ? <Fab label="Nouveau devis" onPress={() => router.push('/quotes/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  number: { ...font.small, fontWeight: '700', color: colors.muted },
  title: { ...font.body, fontWeight: '700', color: colors.text, marginTop: 6 },
  sub: { ...font.small, color: colors.muted, marginTop: 3 },
  amount: { ...font.heading, color: colors.text, marginTop: 10 },
});
