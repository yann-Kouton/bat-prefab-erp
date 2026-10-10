import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { ExpenseForm } from '@/features/finance/ExpenseForm';
import { useDocument } from '@/services/firestore';
import type { Expense } from '@/types';

export default function EditExpense() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { can } = useAuth();
  const { data, loading } = useDocument<Expense>(`projects/${id}/expenses`, expenseId);
  if (loading) return <Screen title="Dépense" back><Loading /></Screen>;
  if (!data || !can('expenses.write')) {
    return (
      <Screen title="Dépense" back>
        <EmptyState icon="alert-circle-outline" title="Modification impossible" text="Cette dépense est introuvable ou vous n'avez pas le droit de la modifier." />
      </Screen>
    );
  }
  return <ExpenseForm key={data.id} projectId={id} expense={data} />;
}
