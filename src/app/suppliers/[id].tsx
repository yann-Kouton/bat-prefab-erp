import { useLocalSearchParams } from 'expo-router';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { SupplierForm } from '@/features/suppliers/SupplierForm';
import { useDocument } from '@/services/firestore';
import type { Supplier } from '@/types';

export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useDocument<Supplier>('suppliers', id);
  if (loading) return <Screen title="Fournisseur" back><Loading /></Screen>;
  if (!data) {
    return <Screen title="Fournisseur" back><EmptyState icon="alert-circle-outline" title="Fournisseur introuvable" text="Cette fiche a peut-être été supprimée." /></Screen>;
  }
  return <SupplierForm key={data.id} supplier={data} />;
}
