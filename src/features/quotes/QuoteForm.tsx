import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { ClientPicker } from '@/components/ClientPicker';
import { Button, Card, Chips, Field, IconButton, Screen, SectionTitle } from '@/components/ui';
import { COUNTRIES, COUNTRY_OPTIONS, DEFAULT_CONDITIONS, UNITS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { formatMoney, formatNumber, parseNumber } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { computeTotals, lineTotal } from '@/features/quotes/calc';
import { createDocument, nextNumber, updateDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { CountryCode, Quote } from '@/types';
import { useAuth } from '@/auth/AuthContext';

interface Line {
  id: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyLine = (): Line => ({ id: uid(), description: '', unit: 'u', quantity: '1', unitPrice: '' });

const schema = z.object({
  clientId: z.string().min(1, 'Choisissez un client.'),
  projectTitle: z.string().trim().min(3, 'Donnez un intitulé au devis (ex. Base-vie 20 modules).'),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, 'Saisissez la désignation.'),
        quantity: z.number().positive('La quantité doit être supérieure à 0.'),
        unitPrice: z.number().min(0, 'Prix invalide.'),
      }),
    )
    .min(1, 'Ajoutez au moins une ligne.'),
  discountPct: z.number().min(0, 'Remise invalide.').max(100, 'La remise ne peut pas dépasser 100 %.'),
  vatPct: z.number().min(0, 'TVA invalide.').max(100, 'TVA invalide.'),
  validityDays: z.number().int('Nombre entier requis.').min(1, 'Au moins 1 jour.'),
});

export function QuoteForm({ quote }: { quote?: Quote }) {
  const { profile } = useAuth();
  const initialCountry: CountryCode = quote?.country ?? profile?.country ?? 'CI';

  const [client, setClient] = useState<{ id: string; name: string } | null>(
    quote ? { id: quote.clientId, name: quote.clientName } : null,
  );
  const [projectTitle, setProjectTitle] = useState(quote?.projectTitle ?? '');
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [vatPct, setVatPct] = useState(formatPct(quote?.vatPct ?? COUNTRIES[initialCountry].vat));
  const [discountPct, setDiscountPct] = useState(formatPct(quote?.discountPct ?? 0));
  const [validityDays, setValidityDays] = useState(String(quote?.validityDays ?? 30));
  const [lines, setLines] = useState<Line[]>(
    quote?.items.map((i) => ({ id: i.id, description: i.description, unit: i.unit, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })) ?? [emptyLine()],
  );
  const [notes, setNotes] = useState(quote?.notes ?? '');
  const [conditions, setConditions] = useState(quote?.conditions ?? DEFAULT_CONDITIONS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const parsedItems = useMemo(
    () => lines.map((l) => ({ quantity: parseNumber(l.quantity), unitPrice: parseNumber(l.unitPrice) })),
    [lines],
  );
  const totals = useMemo(
    () => computeTotals(parsedItems, parseNumber(discountPct), parseNumber(vatPct)),
    [parsedItems, discountPct, vatPct],
  );

  function changeCountry(c: CountryCode) {
    setCountry(c);
    setVatPct(formatPct(COUNTRIES[c].vat)); // TVA par défaut du pays, modifiable ensuite
  }
  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function save() {
    const values = {
      clientId: client?.id ?? '',
      projectTitle,
      items: lines.map((l) => ({ description: l.description, quantity: parseNumber(l.quantity), unitPrice: parseNumber(l.unitPrice) })),
      discountPct: parseNumber(discountPct),
      vatPct: parseNumber(vatPct),
      validityDays: parseNumber(validityDays),
    };
    const result = validate(schema, values);
    setErrors(result.errors);
    if (!result.ok || !client) return;

    setSaving(true);
    try {
      const items = lines.map((l) => ({
        id: l.id,
        description: l.description.trim(),
        unit: l.unit,
        quantity: parseNumber(l.quantity),
        unitPrice: parseNumber(l.unitPrice),
      }));
      const t = computeTotals(items, values.discountPct, values.vatPct);
      const data = {
        clientId: client.id,
        clientName: client.name,
        projectTitle: projectTitle.trim(),
        country,
        currency: COUNTRIES[country].currency,
        items,
        discountPct: values.discountPct,
        vatPct: values.vatPct,
        ...t,
        validityDays: values.validityDays,
        notes: notes.trim(),
        conditions: conditions.trim(),
      };
      if (quote) {
        await updateDocument('quotes', quote.id, data);
        router.back();
      } else {
        const number = await nextNumber('DEV');
        const id = await createDocument('quotes', { ...data, number, status: 'brouillon' });
        router.replace(`/quotes/${id}`);
      }
    } catch (e) {
      notify("Enregistrement impossible", errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={quote ? `Modifier ${quote.number}` : 'Nouveau devis'}
      back
      footer={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ ...font.small, color: colors.muted }}>Total TTC</Text>
            <Text style={{ ...font.heading, color: colors.text }}>{formatMoney(totals.totalTTC)}</Text>
          </View>
          <Button label={quote ? 'Enregistrer les modifications' : 'Enregistrer le devis'} onPress={save} loading={saving} />
        </View>
      }
    >
      <ClientPicker label="Client" value={client} onChange={(c) => setClient({ id: c.id, name: c.name })} error={errors.clientId} />
      <Field label="Intitulé du devis" value={projectTitle} onChangeText={setProjectTitle} error={errors.projectTitle} placeholder="Ex. Base-vie 20 modules" />
      <Chips label="Pays du chantier" options={COUNTRY_OPTIONS} value={country} onChange={changeCountry} />

      <SectionTitle>Lignes du devis</SectionTitle>
      {errors.items ? <Text style={{ ...font.small, color: colors.danger, marginBottom: spacing.sm }}>{errors.items}</Text> : null}
      {lines.map((line, index) => (
        <Card key={line.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ ...font.small, fontWeight: '700', color: colors.muted }}>Ligne {index + 1}</Text>
            {lines.length > 1 ? (
              <IconButton name="trash-outline" color={colors.danger} size={20} label={`Supprimer la ligne ${index + 1}`} onPress={() => setLines((p) => p.filter((l) => l.id !== line.id))} />
            ) : null}
          </View>
          <Field label="Désignation" value={line.description} onChangeText={(t) => updateLine(line.id, { description: t })} error={errors[`items.${index}.description`]} multiline />
          <Chips scroll options={UNITS.map((u) => ({ value: u, label: u }))} value={line.unit} onChange={(u) => updateLine(line.id, { unit: u })} />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Quantité" value={line.quantity} onChangeText={(t) => updateLine(line.id, { quantity: t })} keyboardType="decimal-pad" error={errors[`items.${index}.quantity`]} />
            </View>
            <View style={{ flex: 1.6 }}>
              <Field label="Prix unitaire HT" value={line.unitPrice} onChangeText={(t) => updateLine(line.id, { unitPrice: t })} keyboardType="decimal-pad" placeholder="0" error={errors[`items.${index}.unitPrice`]} />
            </View>
          </View>
          <Text style={{ ...font.body, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            {formatMoney(lineTotal(parsedItems[index]))}
          </Text>
        </Card>
      ))}
      <Button label="Ajouter une ligne" variant="secondary" icon="add" onPress={() => setLines((p) => [...p, emptyLine()])} />

      <SectionTitle>Montants</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Field label="Remise (%)" value={discountPct} onChangeText={setDiscountPct} keyboardType="decimal-pad" error={errors.discountPct} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="TVA (%)" value={vatPct} onChangeText={setVatPct} keyboardType="decimal-pad" error={errors.vatPct} />
          </View>
        </View>
        <TotalRow label="Total HT" value={formatMoney(totals.subtotal)} />
        {totals.discountAmount > 0 ? <TotalRow label={`Remise (${formatNumber(parseNumber(discountPct))} %)`} value={`- ${formatMoney(totals.discountAmount)}`} /> : null}
        <TotalRow label="Net HT" value={formatMoney(totals.netHT)} />
        <TotalRow label={`TVA (${formatNumber(parseNumber(vatPct))} %)`} value={formatMoney(totals.vatAmount)} />
        <TotalRow label="Total TTC" value={formatMoney(totals.totalTTC)} strong />
      </Card>

      <Field label="Validité de l'offre (jours)" value={validityDays} onChangeText={setValidityDays} keyboardType="number-pad" error={errors.validityDays} />
      <Field label="Conditions" value={conditions} onChangeText={setConditions} multiline />
      <Field label="Remarques" value={notes} onChangeText={setNotes} multiline hint="Visible sur le PDF du devis." />
    </Screen>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ ...font.body, color: strong ? colors.text : colors.muted, fontWeight: strong ? '700' : '400' }}>{label}</Text>
      <Text style={{ ...font.body, color: colors.text, fontWeight: strong ? '700' : '600' }}>{value}</Text>
    </View>
  );
}

function formatPct(n: number): string {
  return String(n).replace('.', ',');
}
