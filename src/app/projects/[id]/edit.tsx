import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { useDocument } from '@/services/firestore';
import type { Project } from '@/types';

export default function EditProject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading } = useDocument<Project>('projects', id);
  if (loading) return <Screen title="Projet" back><Loading /></Screen>;
  if (!data || !can('projects.write')) {
    return (
      <Screen title="Projet" back>
        <EmptyState icon="alert-circle-outline" title="Modification impossible" text="Ce projet est introuvable ou vous n'avez pas le droit de le modifier." />
      </Screen>
    );
  }
  return <ProjectForm key={data.id} project={data} />;
}
