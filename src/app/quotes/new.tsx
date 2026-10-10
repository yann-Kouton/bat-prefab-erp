import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { QuoteForm } from '@/features/quotes/QuoteForm';

export default function NewQuote() {
  const { can } = useAuth();
  if (!can('quotes.write')) {
    return (
      <Screen title="Nouveau devis" back>
        <EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas de créer des devis." />
      </Screen>
    );
  }
  return <QuoteForm />;
}
