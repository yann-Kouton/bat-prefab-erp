import { useLocalSearchParams } from 'expo-router';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { QuoteForm } from '@/features/quotes/QuoteForm';
import { useAuth } from '@/auth/AuthContext';
import { useDocument } from '@/services/firestore';
import type { Quote } from '@/types';

export default function EditQuote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading } = useDocument<Quote>('quotes', id);
  if (loading) return <Screen title="Devis" back><Loading /></Screen>;
  if (!data || !can('quotes.write')) {
    return (
      <Screen title="Devis" back>
        <EmptyState icon="alert-circle-outline" title="Modification impossible" text="Ce devis est introuvable ou vous n'avez pas le droit de le modifier." />
      </Screen>
    );
  }
  return <QuoteForm key={data.id} quote={data} />;
}
