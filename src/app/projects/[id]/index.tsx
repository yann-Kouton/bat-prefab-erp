import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, Chips, EmptyState, IconButton, InfoRow, Loading, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { COUNTRIES, PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS, PROJECT_TYPE_LABELS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { formatDate, formatMoney } from '@/lib/format';
import { PROJECT_TONES } from '@/lib/tones';
import { ProjectExpenses } from '@/features/projects/ProjectExpenses';
import { ProjectLogs } from '@/features/projects/ProjectLogs';
import { ProjectPhotos } from '@/features/projects/ProjectPhotos';
import { updateDocument, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Project, ProjectStatus } from '@/types';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data: project, loading } = useDocument<Project>('projects', id);

  if (loading) return <Screen title="Projet" back><Loading /></Screen>;
  if (!project) {
    return (
      <Screen title="Projet" back>
        <EmptyState icon="alert-circle-outline" title="Projet introuvable" text="Ce projet a peut-être été supprimé." />
      </Screen>
    );
  }

  const canWrite = can('projects.write');

  async function patch(data: Record<string, unknown>) {
    try {
      await updateDocument('projects', project!.id, data);
    } catch (e) {
      notify('Mise à jour impossible', errorMessage(e));
    }
  }
  const setProgress = (value: number) => patch({ progress: Math.max(0, Math.min(100, value)) });

  return (
    <Screen
      title={project.code}
      subtitle={project.clientName}
      back
      right={canWrite ? <IconButton name="create-outline" color="#FFFFFF" label="Modifier le projet" onPress={() => router.push(`/projects/${project.id}/edit`)} /> : undefined}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{project.title}</Text>
          <Badge label={PROJECT_STATUS_LABELS[project.status]} tone={PROJECT_TONES[project.status]} />
        </View>
        <InfoRow label="Client" value={project.clientName} />
        <InfoRow label="Type" value={PROJECT_TYPE_LABELS[project.type]} />
        <InfoRow label="Pays" value={COUNTRIES[project.country].label} />
        <InfoRow label="Lieu" value={project.location} />
        <InfoRow label="Budget" value={can('quotes.read') ? formatMoney(project.budget) : '—'} />
        <InfoRow label="Début" value={formatDate(project.startDate)} />
        <InfoRow label="Fin prévue" value={formatDate(project.endDate)} />
        <InfoRow label="Responsable" value={project.managerName} />
      </Card>

      <SectionTitle>Avancement</SectionTitle>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.progress}>{project.progress}%</Text>
          {canWrite ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="−10" variant="secondary" onPress={() => setProgress(project.progress - 10)} disabled={project.progress <= 0} style={styles.step} />
              <Button label="+10" variant="secondary" onPress={() => setProgress(project.progress + 10)} disabled={project.progress >= 100} style={styles.step} />
            </View>
          ) : null}
        </View>
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar value={project.progress} />
        </View>
        {canWrite ? (
          <View style={{ marginTop: spacing.lg }}>
            <Chips<ProjectStatus> label="Statut" scroll options={PROJECT_STATUS_OPTIONS} value={project.status} onChange={(status) => patch({ status })} />
          </View>
        ) : null}
      </Card>

      {project.notes ? (
        <Card>
          <Text style={styles.noteTitle}>Notes</Text>
          <Text style={styles.note}>{project.notes}</Text>
        </Card>
      ) : null}

      {project.quoteId && can('quotes.read') ? (
        <Button label="Voir le devis d'origine" icon="document-text-outline" variant="secondary" onPress={() => router.push(`/quotes/${project.quoteId}`)} style={{ marginBottom: spacing.md }} />
      ) : null}

      <ProjectLogs projectId={project.id} />
      <ProjectExpenses project={project} />
      <ProjectPhotos projectId={project.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  title: { ...font.heading, color: colors.text, flex: 1 },
  progress: { fontSize: 30, fontWeight: '800', color: colors.text },
  step: { minHeight: 40, paddingHorizontal: spacing.lg },
  noteTitle: { ...font.small, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  note: { ...font.body, color: colors.text, lineHeight: 22 },
});
