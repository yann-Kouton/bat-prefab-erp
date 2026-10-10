import { useAuth } from '@/auth/AuthContext';
import { EmptyState, Screen } from '@/components/ui';
import { PurchaseForm } from '@/features/purchases/PurchaseForm';

export default function NewPurchase() {
  const { can } = useAuth();
  if (!can('purchases.write')) {
    return <Screen title="Nouveau bon de commande" back><EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas de créer des bons de commande." /></Screen>;
  }
  return <PurchaseForm />;
}
