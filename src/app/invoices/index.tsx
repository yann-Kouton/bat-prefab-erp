import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Card, Chips, EmptyState, Loading, Screen, SearchInput } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { PAY_LABELS, PAY_TONES } from '@/lib/tones';
import { payState, remaining, type InvoicePayState } from '@/services/billing';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Invoice } from '@/types';

type Filter = 'toutes' | 'ouvertes' | 'en_retard' | 'payee';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'toutes', label: 'Toutes' }, { value: 'ouvertes', label: 'À encaisser' }, { value: 'en_retard', label: 'En retard' }, { value: 'payee', label: 'Payées' },
];
const OPEN: InvoicePayState[] = ['a_payer', 'partielle', 'en_retard'];

export default function InvoicesScreen() {
  const { can } = useAuth();
  const allowed = can('invoices.read');
  const { data: invoices, loading } = useCollection<Invoice>('invoices', { enabled: allowed });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('toutes');

  const rows = useMemo(() => invoices.map((i) => ({ inv: i, state: payState(i) })), [invoices]);
  const outstanding = useMemo(() => rows.filter((r) => OPEN.includes(r.state)).reduce((s, r) => s + remaining(r.inv), 0), [rows]);
  const lateAmount = useMemo(() => rows.filter((r) => r.state === 'en_retard').reduce((s, r) => s + remaining(r.inv), 0), [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(({ inv, state }) => {
      const okFilter = filter === 'toutes' || (filter === 'ouvertes' ? OPEN.includes(state) : state === filter);
      return okFilter && (!s || inv.number.toLowerCase().includes(s) || inv.clientName.toLowerCase().includes(s));
    });
  }, [rows, search, filter]);

  if (!allowed) {
    return <Screen title="Factures" back><EmptyState icon="lock-closed-outline" title="Accès réservé" text="Votre rôle n'a pas accès à la facturation." /></Screen>;
  }

  return (
    <Screen title="Factures" subtitle={`${invoices.length} facture${invoices.length > 1 ? 's' : ''}`} back scroll={false} padded={false}>
      <View style={styles.filters}>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sumLabel}>Reste à encaisser</Text>
            <Text style={styles.sumValue}>{formatMoney(outstanding)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.sumLabel}>dont en retard</Text>
            <Text style={[styles.sumValue, lateAmount > 0 && { color: colors.danger }]}>{formatMoney(lateAmount)}</Text>
          </View>
        </View>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Numéro ou client" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? <Loading /> : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.inv.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={invoices.length === 0
            ? <EmptyState icon="cash-outline" title="Aucune facture" text="Ouvrez un devis accepté et choisissez « Créer une facture » (acompte, situation ou solde)." />
            : <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre mot-clé ou changez de filtre." />}
          renderItem={({ item: { inv, state } }) => (
            <Card onPress={() => router.push(`/invoices/${inv.id}`)}>
              <View style={styles.row}>
                <Text style={styles.number}>{inv.number}</Text>
                <Badge label={PAY_LABELS[state]} tone={PAY_TONES[state]} />
              </View>
              <Text style={styles.sub} numberOfLines={1}>{inv.clientName} · {inv.label}</Text>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Text style={styles.sub}>Échéance {formatDate(inv.dueDate)}</Text>
                <Text style={styles.amount}>{formatMoney(inv.totalTTC)}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  summary: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md },
  sumLabel: { ...font.small, color: colors.muted },
  sumValue: { ...font.heading, color: colors.text, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  number: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 4 },
  amount: { ...font.body, fontWeight: '700', color: colors.text },
});
