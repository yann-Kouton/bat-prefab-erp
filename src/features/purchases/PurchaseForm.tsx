import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { EntityPicker } from '@/components/EntityPicker';
import { Button, Card, Chips, Field, IconButton, Screen, SectionTitle } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { COUNTRIES, COUNTRY_OPTIONS, UNITS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { formatMoney, isISODate, parseNumber } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument, nextNumber, updateDocument, useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { CountryCode, Product, Project, PurchaseOrder, Supplier } from '@/types';

interface Line {
  id: string;
  productId?: string;
  productName?: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const emptyLine = (): Line => ({ id: uid(), description: '', unit: 'u', quantity: '1', unitPrice: '' });

const schema = z.object({
  supplierId: z.string().min(1, 'Choisissez un fournisseur.'),
  expectedDate: z.string().trim().refine((v) => v === '' || isISODate(v), 'Format attendu : AAAA-MM-JJ.'),
  items: z.array(z.object({
    description: z.string().trim().min(1, 'Saisissez la désignation.'),
    quantity: z.number().positive('La quantité doit être supérieure à 0.'),
    unitPrice: z.number().min(0, 'Prix invalide.'),
  })).min(1, 'Ajoutez au moins une ligne.'),
});

export function PurchaseForm({ order }: { order?: PurchaseOrder }) {
  const { profile } = useAuth();
  const { data: suppliers } = useCollection<Supplier>('suppliers', { orderField: null });
  const { data: products } = useCollection<Product>('products', { orderField: null });
  const { data: projects } = useCollection<Project>('projects', { orderField: null });

  const [supplier, setSupplier] = useState<{ id: string; label: string } | null>(order ? { id: order.supplierId, label: order.supplierName } : null);
  const [project, setProject] = useState<{ id: string; label: string; code: string } | null>(
    order?.projectId ? { id: order.projectId, label: order.projectCode ?? '', code: order.projectCode ?? '' } : null,
  );
  const [country, setCountry] = useState<CountryCode>(order?.country ?? profile?.country ?? 'CI');
  const [expectedDate, setExpectedDate] = useState(order?.expectedDate ?? '');
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [lines, setLines] = useState<Line[]>(
    order?.items.map((i) => ({ id: i.id, productId: i.productId, description: i.description, unit: i.unit, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })) ?? [emptyLine()],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const supplierItems = useMemo(() => suppliers.map((s) => ({ id: s.id, label: s.name, sub: s.contactName })).sort((a, b) => a.label.localeCompare(b.label)), [suppliers]);
  const productItems = useMemo(() => products.map((p) => ({ id: p.id, label: p.name, sub: `${p.category} · en stock : ${p.qty} ${p.unit}` })).sort((a, b) => a.label.localeCompare(b.label)), [products]);
  const projectItems = useMemo(() => projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.title}`, sub: p.clientName })), [projects]);

  const total = useMemo(() => Math.round(lines.reduce((s, l) => s + parseNumber(l.quantity) * parseNumber(l.unitPrice), 0)), [lines]);
  const update = (id: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function pickProduct(lineId: string, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    update(lineId, { productId: p.id, productName: p.name, description: p.name, unit: p.unit, unitPrice: p.lastCost ? String(p.lastCost) : '' });
  }

  async function save() {
    const values = {
      supplierId: supplier?.id ?? '',
      expectedDate,
      items: lines.map((l) => ({ description: l.description, quantity: parseNumber(l.quantity), unitPrice: parseNumber(l.unitPrice) })),
    };
    const result = validate(schema, values);
    setErrors(result.errors);
    if (!result.ok || !supplier) return;
    setSaving(true);
    try {
      const items = lines.map((l) => ({
        id: l.id, productId: l.productId ?? null, description: l.description.trim(), unit: l.unit,
        quantity: parseNumber(l.quantity), unitPrice: parseNumber(l.unitPrice),
      }));
      const data = {
        supplierId: supplier.id, supplierName: supplier.label,
        projectId: project?.id ?? null, projectCode: project?.code ?? null,
        country, currency: COUNTRIES[country].currency, items,
        total: Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)),
        expectedDate: expectedDate.trim(), notes: notes.trim(),
      };
      if (order) {
        await updateDocument('purchaseOrders', order.id, data);
        router.back();
      } else {
        const number = await nextNumber('BC');
        const id = await createDocument('purchaseOrders', { ...data, number, status: 'brouillon' });
        router.replace(`/purchases/${id}`);
      }
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={order ? `Modifier ${order.number}` : 'Nouveau bon de commande'}
      back
      footer={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ ...font.small, color: colors.muted }}>Total HT</Text>
            <Text style={{ ...font.heading, color: colors.text }}>{formatMoney(total)}</Text>
          </View>
          <Button label={order ? 'Enregistrer les modifications' : 'Enregistrer le brouillon'} onPress={save} loading={saving} />
        </View>
      }
    >
      <EntityPicker label="Fournisseur" title="Choisir un fournisseur" placeholder="Choisir un fournisseur" items={supplierItems}
        value={supplier} onChange={(i) => setSupplier({ id: i.id, label: i.label })} error={errors.supplierId}
        emptyText="Ajoutez d'abord le fournisseur depuis Plus → Fournisseurs." />
      <EntityPicker label="Chantier concerné (facultatif)" title="Choisir un projet" placeholder="Aucun chantier (stock général)" items={projectItems}
        value={project} onChange={(i) => setProject({ id: i.id, label: i.label, code: projects.find((p) => p.id === i.id)?.code ?? '' })}
        onClear={() => setProject(null)} />
      <Chips label="Pays" options={COUNTRY_OPTIONS} value={country} onChange={setCountry} />
      <DateField label="Livraison souhaitée" value={expectedDate} onChange={setExpectedDate} error={errors.expectedDate} optional />

      <SectionTitle>Lignes</SectionTitle>
      {errors.items ? <Text style={{ ...font.small, color: colors.danger, marginBottom: spacing.sm }}>{errors.items}</Text> : null}
      {lines.map((line, index) => (
        <Card key={line.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ ...font.small, fontWeight: '700', color: colors.muted }}>Ligne {index + 1}</Text>
            {lines.length > 1 ? <IconButton name="trash-outline" color={colors.danger} size={20} label={`Supprimer la ligne ${index + 1}`} onPress={() => setLines((p) => p.filter((l) => l.id !== line.id))} /> : null}
          </View>
          <EntityPicker label="Article du catalogue (alimente le stock à la réception)" title="Choisir un article" placeholder="Hors catalogue" items={productItems}
            value={line.productId ? { id: line.productId, label: line.productName ?? products.find((p) => p.id === line.productId)?.name ?? 'Article' } : null}
            onChange={(i) => pickProduct(line.id, i.id)} onClear={() => update(line.id, { productId: undefined, productName: undefined })} />
          <Field label="Désignation" value={line.description} onChangeText={(t) => update(line.id, { description: t })} error={errors[`items.${index}.description`]} multiline />
          <Chips scroll options={UNITS.map((u) => ({ value: u, label: u }))} value={line.unit} onChange={(u) => update(line.id, { unit: u })} />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}><Field label="Quantité" value={line.quantity} onChangeText={(t) => update(line.id, { quantity: t })} keyboardType="decimal-pad" error={errors[`items.${index}.quantity`]} /></View>
            <View style={{ flex: 1.6 }}><Field label="Prix unitaire HT" value={line.unitPrice} onChangeText={(t) => update(line.id, { unitPrice: t })} keyboardType="decimal-pad" placeholder="0" error={errors[`items.${index}.unitPrice`]} /></View>
          </View>
          <Text style={{ ...font.body, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{formatMoney(parseNumber(line.quantity) * parseNumber(line.unitPrice))}</Text>
        </Card>
      ))}
      <Button label="Ajouter une ligne" variant="secondary" icon="add" onPress={() => setLines((p) => [...p, emptyLine()])} />
      <View style={{ height: spacing.lg }} />
      <Field label="Remarques" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
