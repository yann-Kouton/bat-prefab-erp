import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { ProductForm } from '@/features/stock/ProductForm';
import { useDocument } from '@/services/firestore';
import type { Product } from '@/types';

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading } = useDocument<Product>('products', id);
  if (loading) return <Screen title="Article" back><Loading /></Screen>;
  if (!data || !can('stock.write')) {
    return <Screen title="Article" back><EmptyState icon="alert-circle-outline" title="Modification impossible" text="Article introuvable ou droits insuffisants." /></Screen>;
  }
  return <ProductForm key={data.id} product={data} />;
}
