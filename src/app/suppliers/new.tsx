import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { SupplierForm } from '@/features/suppliers/SupplierForm';

export default function NewSupplier() {
  const { can } = useAuth();
  if (!can('purchases.write')) {
    return <Screen title="Nouveau fournisseur" back><EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas d'ajouter des fournisseurs." /></Screen>;
  }
  return <SupplierForm />;
}
