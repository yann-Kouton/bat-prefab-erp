import { useLocalSearchParams } from 'expo-router';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { ClientForm } from '@/features/clients/ClientForm';
import { useDocument } from '@/services/firestore';
import type { Client } from '@/types';

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useDocument<Client>('clients', id);
  if (loading) return <Screen title="Client" back><Loading /></Screen>;
  if (!data) {
    return (
      <Screen title="Client" back>
        <EmptyState icon="alert-circle-outline" title="Client introuvable" text="Cette fiche a peut-être été supprimée." />
      </Screen>
    );
  }
  return <ClientForm key={data.id} client={data} />;
}
