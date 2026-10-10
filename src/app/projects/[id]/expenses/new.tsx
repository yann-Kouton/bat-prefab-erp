import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { ExpenseForm } from '@/features/finance/ExpenseForm';

export default function NewExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  if (!can('expenses.write')) {
    return (
      <Screen title="Nouvelle dépense" back>
        <EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas d'enregistrer des dépenses." />
      </Screen>
    );
  }
  return <ExpenseForm projectId={id} />;
}
