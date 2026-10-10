import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, Chips, EmptyState, Fab, Loading, ProgressBar, Screen, SearchInput } from '@/components/ui';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { PROJECT_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Project, ProjectStatus } from '@/types';

type Filter = 'tous' | ProjectStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'etude', label: 'En étude' },
  { value: 'planifie', label: 'Planifiés' },
  { value: 'suspendu', label: 'Suspendus' },
  { value: 'termine', label: 'Terminés' },
];

export default function ProjectsTab() {
  const { can } = useAuth();
  const { data: projects, loading, error } = useCollection<Project>('projects');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (filter === 'tous' || p.status === filter) &&
        (!s || p.code.toLowerCase().includes(s) || p.title.toLowerCase().includes(s) || p.clientName.toLowerCase().includes(s)),
    );
  }, [projects, search, filter]);

  const canCreate = can('projects.write');

  return (
    <Screen title="Projets" subtitle={`${projects.length} projet${projects.length > 1 ? 's' : ''}`} scroll={false} padded={false}>
      <View style={styles.filters}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Code, projet ou client" />
        <View style={{ height: spacing.md }} />
        <Chips scroll options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-circle-outline" title="Chargement impossible" text={error} />
            ) : projects.length === 0 ? (
              <EmptyState
                icon="construct-outline"
                title="Aucun projet"
                text="Créez un projet, ou transformez un devis accepté en projet."
                action={canCreate ? <Button label="Créer un projet" icon="add" onPress={() => router.push('/projects/new')} /> : undefined}
              />
            ) : (
              <EmptyState icon="search-outline" title="Aucun résultat" text="Essayez un autre mot-clé ou changez de filtre." />
            )
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/projects/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.code}>{item.code} · {PROJECT_TYPE_LABELS[item.type]}</Text>
                <Badge label={PROJECT_STATUS_LABELS[item.status]} tone={PROJECT_TONES[item.status]} />
              </View>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.clientName}{item.location ? ` · ${item.location}` : ''}</Text>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar value={item.progress} />
              </View>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Text style={styles.sub}>{item.progress}% réalisé</Text>
                <Text style={styles.budget}>{formatMoney(item.budget)}</Text>
              </View>
            </Card>
          )}
        />
      )}
      {canCreate ? <Fab label="Nouveau projet" onPress={() => router.push('/projects/new')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { ...font.small, fontWeight: '700', color: colors.muted },
  title: { ...font.body, fontWeight: '700', color: colors.text, marginTop: 6 },
  sub: { ...font.small, color: colors.muted, marginTop: 3 },
  budget: { ...font.small, fontWeight: '700', color: colors.text },
});
