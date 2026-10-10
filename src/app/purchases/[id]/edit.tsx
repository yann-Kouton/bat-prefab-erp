import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { PurchaseForm } from '@/features/purchases/PurchaseForm';
import { useDocument } from '@/services/firestore';
import type { PurchaseOrder } from '@/types';

export default function EditPurchase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading } = useDocument<PurchaseOrder>('purchaseOrders', id);
  if (loading) return <Screen title="Bon de commande" back><Loading /></Screen>;
  if (!data || !can('purchases.write') || data.status !== 'brouillon') {
    return <Screen title="Bon de commande" back><EmptyState icon="alert-circle-outline" title="Modification impossible" text="Seul un brouillon peut être modifié." /></Screen>;
  }
  return <PurchaseForm key={data.id} order={data} />;
}
