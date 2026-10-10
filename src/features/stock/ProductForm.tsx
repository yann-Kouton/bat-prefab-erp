import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, Field, Screen } from '@/components/ui';
import { PRODUCT_CATEGORIES, UNITS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { parseNumber } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument, removeDocument, updateDocument } from '@/services/firestore';
import { recordMovement } from '@/services/stock';
import type { Product } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, "Saisissez le nom de l'article."),
  minQty: z.number().min(0, 'Seuil invalide.'),
  initialQty: z.number().min(0, 'Quantité invalide.'),
});

export function ProductForm({ product }: { product?: Product }) {
  const { can, profile } = useAuth();
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [category, setCategory] = useState<string>(product?.category ?? PRODUCT_CATEGORIES[0].value);
  const [unit, setUnit] = useState(product?.unit ?? 'u');
  const [minQty, setMinQty] = useState(product ? String(product.minQty) : '0');
  const [initialQty, setInitialQty] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = validate(schema, { name, minQty: parseNumber(minQty), initialQty: parseNumber(initialQty) });
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    try {
      const data = { name: name.trim(), sku: sku.trim(), category, unit, minQty: parseNumber(minQty) };
      if (product) {
        // La quantité n'est jamais éditée ici : uniquement via les mouvements.
        await updateDocument('products', product.id, data);
        router.back();
      } else {
        const id = await createDocument('products', { ...data, qty: 0 });
        const start = parseNumber(initialQty);
        if (start > 0) {
          await recordMovement({ productId: id, type: 'entree', qty: start, reason: 'Stock initial', authorName: profile?.displayName });
        }
        router.replace(`/stock/${id}`);
      }
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!product) return;
    confirmAction('Supprimer cet article ?', `${product.name} sera retiré du catalogue (l'historique des mouvements est conservé).`, 'Supprimer', async () => {
      try { await removeDocument('products', product.id); router.dismissAll(); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }

  return (
    <Screen title={product ? 'Modifier l’article' : 'Nouvel article'} back footer={<Button label={product ? 'Enregistrer' : 'Créer l’article'} onPress={save} loading={saving} />}>
      <Field label="Désignation" value={name} onChangeText={setName} error={errors.name} placeholder="Ex. Tube carré 40×40" />
      <Field label="Référence (facultatif)" value={sku} onChangeText={setSku} autoCapitalize="characters" />
      <Chips label="Catégorie" scroll options={PRODUCT_CATEGORIES} value={category} onChange={setCategory} />
      <Chips label="Unité" scroll options={UNITS.map((u) => ({ value: u, label: u }))} value={unit} onChange={setUnit} />
      <Field label="Seuil d'alerte" value={minQty} onChangeText={setMinQty} keyboardType="decimal-pad" error={errors.minQty} hint="Une alerte « stock bas » s'affiche sous ce seuil." />
      {!product ? <Field label="Stock initial (facultatif)" value={initialQty} onChangeText={setInitialQty} keyboardType="decimal-pad" error={errors.initialQty} hint="Enregistré comme première entrée dans l'historique." /> : null}
      {product && can('projects.delete') ? <Button label="Supprimer l'article" variant="danger" icon="trash-outline" onPress={remove} /> : null}
    </Screen>
  );
}
