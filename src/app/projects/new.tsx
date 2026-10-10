import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { ProjectForm } from '@/features/projects/ProjectForm';

export default function NewProject() {
  const { can } = useAuth();
  if (!can('projects.write')) {
    return (
      <Screen title="Nouveau projet" back>
        <EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas de créer des projets." />
      </Screen>
    );
  }
  return <ProjectForm />;
}
