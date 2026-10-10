import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import { WEATHER_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { formatDate } from '@/lib/format';
import { removeDocument, useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { DailyLog } from '@/types';

/** Journal de chantier : un rapport quotidien (météo, effectif, travaux, incidents). */
export function ProjectLogs({ projectId }: { projectId: string }) {
  const { can } = useAuth();
  const path = `projects/${projectId}/dailyLogs`;
  const { data: logs } = useCollection<DailyLog>(path, { orderField: 'date' });
  const canWrite = can('logs.write');
  const canDelete = can('logs.delete');

  function remove(log: DailyLog) {
    confirmAction('Supprimer ce rapport ?', `Rapport du ${formatDate(log.date)}.`, 'Supprimer', async () => {
      try { await removeDocument(path, log.id); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }

  return (
    <View>
      <SectionTitle>Journal de chantier</SectionTitle>
      {canWrite ? (
        <Button label="Nouveau rapport du jour" icon="create-outline" variant="secondary" onPress={() => router.push(`/projects/${projectId}/logs/new`)} style={{ marginBottom: spacing.md }} />
      ) : null}
      {logs.length === 0 ? (
        <EmptyState icon="reader-outline" title="Aucun rapport" text={canWrite ? 'Notez chaque jour l’avancement, l’effectif présent et les incidents.' : undefined} />
      ) : (
        logs.slice(0, 15).map((log) => (
          <Card key={log.id} onPress={canDelete ? () => remove(log) : undefined}>
            <View style={styles.row}>
              <Text style={styles.date}>{formatDate(log.date)}</Text>
              <Badge label={`${WEATHER_LABELS[log.weather]} · ${log.headcount} pers.`} tone="neutral" />
            </View>
            <Text style={styles.notes}>{log.notes}</Text>
            {log.issues ? (
              <View style={styles.issues}>
                <Text style={styles.issuesLabel}>Incident / blocage</Text>
                <Text style={styles.issuesText}>{log.issues}</Text>
              </View>
            ) : null}
            {log.authorName ? <Text style={styles.author}>Par {log.authorName}</Text> : null}
          </Card>
        ))
      )}
      {logs.length > 15 ? <Text style={styles.author}>Les 15 derniers rapports sont affichés ({logs.length} au total).</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  date: { ...font.body, fontWeight: '700', color: colors.text },
  notes: { ...font.body, color: colors.text, marginTop: spacing.sm, lineHeight: 22 },
  issues: { marginTop: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: 8, padding: spacing.md },
  issuesLabel: { ...font.small, fontWeight: '700', color: colors.danger },
  issuesText: { ...font.body, color: colors.text, marginTop: 2 },
  author: { ...font.small, color: colors.muted, marginTop: spacing.sm },
});
