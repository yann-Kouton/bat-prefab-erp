import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Button, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { EntityPicker } from '@/components/EntityPicker';
import { MOVEMENT_LABELS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { formatNumber, parseNumber } from '@/lib/format';
import { useCollection, useDocument } from '@/services/firestore';
import { recordMovement } from '@/services/stock';
import type { MovementType, Product, Project } from '@/types';

export default function MoveStock() {
  const { id, type: rawType } = useLocalSearchParams<{ id: string; type?: string }>();
  const type: MovementType = rawType === 'sortie' || rawType === 'ajustement' ? rawType : 'entree';
  const { can, profile } = useAuth();
  const { data: product, loading } = useDocument<Product>('products', id);
  const { data: projects } = useCollection<Project>('projects', { orderField: null });
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [project, setProject] = useState<{ id: string; label: string; code: string } | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.title}`, sub: p.clientName, code: p.code })), [projects]);

  if (loading) return <Screen title="Mouvement" back><Loading /></Screen>;
  if (!product || !can('stock.write')) {
    return <Screen title="Mouvement" back><EmptyState icon="alert-circle-outline" title="Action impossible" text="Article introuvable ou droits insuffisants." /></Screen>;
  }

  const label = type === 'ajustement' ? 'Quantité comptée' : type === 'entree' ? 'Quantité reçue' : 'Quantité sortie';

  async function save() {
    const n = parseNumber(qty);
    if (type === 'ajustement' ? n < 0 || qty.trim() === '' : n <= 0) {
      setError(type === 'ajustement' ? 'Saisissez la quantité réellement comptée.' : 'La quantité doit être supérieure à 0.');
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await recordMovement({
        productId: product!.id, type, qty: n, reason: reason.trim(),
        projectId: project?.id, projectCode: project?.code, authorName: profile?.displayName,
      });
      router.back();
    } catch (e) {
      notify('Mouvement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={MOVEMENT_LABELS[type]} subtitle={`${product.name} · en stock : ${formatNumber(product.qty)} ${product.unit}`} back footer={<Button label="Enregistrer" onPress={save} loading={saving} />}>
      <Field label={`${label} (${product.unit})`} value={qty} onChangeText={setQty} keyboardType="decimal-pad" error={error} autoFocus />
      {type === 'sortie' ? (
        <EntityPicker
          label="Chantier destinataire (facultatif)" title="Choisir un projet" placeholder="Aucun chantier" items={items}
          value={project} onChange={(i) => setProject({ id: i.id, label: i.label, code: items.find((x) => x.id === i.id)?.code ?? '' })}
          onClear={() => setProject(null)}
        />
      ) : null}
      <Field label={type === 'ajustement' ? 'Motif de l’écart' : 'Motif / remarque (facultatif)'} value={reason} onChangeText={setReason} multiline />
    </Screen>
  );
}
