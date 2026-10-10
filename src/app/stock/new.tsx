import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { ProductForm } from '@/features/stock/ProductForm';

export default function NewProduct() {
  const { can } = useAuth();
  if (!can('stock.write')) {
    return <Screen title="Nouvel article" back><EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas d'ajouter des articles." /></Screen>;
  }
  return <ProductForm />;
}
