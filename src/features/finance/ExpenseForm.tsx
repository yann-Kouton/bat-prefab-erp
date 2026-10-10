import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button, Chips, Field, InfoRow, Screen, SectionTitle } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { EXPENSE_OPTIONS, PAYMENT_OPTIONS, UNITS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { NEEDS_ARTICLE_PHOTOS, paidOf } from '@/lib/finance';
import { formatMoney, isISODate, parseNumber, todayISO } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { createExpense } from '@/services/finance';
import { updateDocument } from '@/services/firestore';
import type { Attachment, Expense, ExpenseCategory, PaymentMethod } from '@/types';

const schema = z.object({
  date: z.string().trim().refine(isISODate, 'Format attendu : AAAA-MM-JJ.'),
  label: z.string().trim().min(2, 'Décrivez la dépense (ex. Pointes 80 mm, 5 kg).'),
  amount: z.number().positive('Le montant doit être supérieur à 0.'),
});

type PayMode = 'full' | 'partial' | 'none';
const PAY_MODES: { value: PayMode; label: string }[] = [
  { value: 'full', label: 'Payée en totalité' }, { value: 'partial', label: 'Acompte versé' }, { value: 'none', label: 'Pas encore payée' },
];

/** Création (sans `expense`) ou modification d'une dépense, avec photos des articles et de la facture. */
export function ExpenseForm({ projectId, expense }: { projectId: string; expense?: Expense }) {
  const { profile } = useAuth();
  const editing = !!expense;
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'materiaux');
  const [label, setLabel] = useState(expense?.label ?? '');
  const [quantity, setQuantity] = useState(expense?.quantity ? String(expense.quantity) : '');
  const [unit, setUnit] = useState(expense?.unit || 'u');
  const [unitPrice, setUnitPrice] = useState(expense?.unitPrice ? String(expense.unitPrice) : '');
  const [amountInput, setAmountInput] = useState(expense ? String(expense.amount) : '');
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [supplierName, setSupplierName] = useState(expense?.supplierName ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(expense?.invoiceNumber ?? '');
  const [articlePhotos, setArticlePhotos] = useState<Attachment[]>(expense?.articlePhotos ?? []);
  const [invoicePhotos, setInvoicePhotos] = useState<Attachment[]>(expense?.invoicePhotos ?? []);
  const [hasInvoice, setHasInvoice] = useState<'oui' | 'non'>(expense?.noInvoiceReason ? 'non' : 'oui');
  const [noInvoiceReason, setNoInvoiceReason] = useState(expense?.noInvoiceReason ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [payMode, setPayMode] = useState<PayMode>('full');
  const [paidInput, setPaidInput] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('especes');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState({ articles: false, invoice: false });

  // Montant calculé dès que quantité et prix unitaire sont renseignés
  const computed = Math.round(parseNumber(quantity) * parseNumber(unitPrice));
  const amount = computed > 0 ? computed : parseNumber(amountInput);
  const needsArticles = NEEDS_ARTICLE_PHOTOS.includes(category);
  const folder = `bat-prefab/projets/${projectId}/depenses`;

  async function save() {
    const result = validate(schema, { date, label, amount });
    const next: FieldErrors = { ...result.errors };
    if (needsArticles && articlePhotos.length === 0) next.articles = 'Ajoutez au moins une photo des articles achetés.';
    if (hasInvoice === 'oui' && invoicePhotos.length === 0) next.invoice = 'Ajoutez la photo de la facture ou du reçu, ou indiquez qu\'il n\'y en a pas.';
    if (hasInvoice === 'non' && noInvoiceReason.trim().length < 3) next.reason = 'Précisez pourquoi il n\'y a pas de facture.';
    let paid = 0;
    if (!editing) {
      paid = payMode === 'full' ? amount : payMode === 'partial' ? parseNumber(paidInput) : 0;
      if (payMode === 'partial' && !(paid > 0 && paid < amount)) next.paid = "L'acompte doit être supérieur à 0 et inférieur au montant total.";
    } else if (amount < paidOf(expense!)) {
      next.amount = `Le montant ne peut pas être inférieur à ce qui est déjà payé (${formatMoney(paidOf(expense!))}).`;
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const data = {
      date: date.trim(), category, label: label.trim(), amount,
      quantity: parseNumber(quantity) > 0 ? parseNumber(quantity) : null,
      unit: parseNumber(quantity) > 0 ? unit : '',
      unitPrice: parseNumber(unitPrice) > 0 ? parseNumber(unitPrice) : null,
      supplierName: supplierName.trim(), invoiceNumber: invoiceNumber.trim(),
      articlePhotos, invoicePhotos: hasInvoice === 'oui' ? invoicePhotos : [],
      noInvoiceReason: hasInvoice === 'non' ? noInvoiceReason.trim() : '', notes: notes.trim(),
    };
    setSaving(true);
    try {
      if (expense) {
        // Une ancienne dépense (sans paidAmount) était réputée payée : on fige cette valeur avant de toucher au montant
        await updateDocument(`projects/${projectId}/expenses`, expense.id, { ...data, paidAmount: expense.paidAmount ?? expense.amount });
      } else {
        const authorName = profile?.displayName ?? '';
        await createExpense(projectId, { ...data, authorName }, paid > 0 ? { amount: paid, method, date: data.date, reference: reference.trim(), authorName } : undefined);
      }
      router.back();
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'} back
      footer={<Button label={editing ? 'Enregistrer les modifications' : 'Enregistrer la dépense'} onPress={save} loading={saving} disabled={busy.articles || busy.invoice} />}
    >
      <Chips label="Catégorie" options={EXPENSE_OPTIONS} value={category} onChange={setCategory} />
      <Field label="Désignation" value={label} onChangeText={setLabel} error={errors.label} placeholder="Ex. Pointes 80 mm – 5 kg" />

      <Field label="Quantité (facultatif)" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
      <Chips label="Unité" scroll options={UNITS.map((u) => ({ value: u, label: u }))} value={unit} onChange={setUnit} />
      <Field label="Prix unitaire (FCFA, facultatif)" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" hint="Quantité × prix unitaire calcule le montant automatiquement." />
      <Field
        label="Montant total (FCFA)" value={computed > 0 ? String(computed) : amountInput} onChangeText={setAmountInput}
        editable={computed <= 0} keyboardType="decimal-pad" error={errors.amount}
      />

      <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
      <Field label="Fournisseur / prestataire" value={supplierName} onChangeText={setSupplierName} autoCapitalize="words" />

      <SectionTitle>Justificatifs</SectionTitle>
      <AttachmentPicker
        label={needsArticles ? 'Photos des articles (obligatoire)' : 'Photos des articles / du travail (recommandé)'}
        value={articlePhotos} onChange={setArticlePhotos} folder={`${folder}/articles`} error={errors.articles}
        onBusyChange={(b) => setBusy((s) => ({ ...s, articles: b }))}
      />
      <Chips label="Facture ou reçu" options={[{ value: 'oui', label: 'Je l\'ai' }, { value: 'non', label: 'Pas de facture' }]} value={hasInvoice} onChange={setHasInvoice} />
      {hasInvoice === 'oui' ? (
        <>
          <Field label="N° de facture (facultatif)" value={invoiceNumber} onChangeText={setInvoiceNumber} autoCapitalize="characters" />
          <AttachmentPicker
            label="Photo de la facture / du reçu" value={invoicePhotos} onChange={setInvoicePhotos} folder={`${folder}/factures`} error={errors.invoice}
            onBusyChange={(b) => setBusy((s) => ({ ...s, invoice: b }))}
          />
        </>
      ) : (
        <Field label="Pourquoi pas de facture ?" value={noInvoiceReason} onChangeText={setNoInvoiceReason} error={errors.reason} placeholder="Ex. Achat au marché, vendeur sans reçu" />
      )}

      {editing ? (
        <>
          <SectionTitle>Paiement</SectionTitle>
          <InfoRow label="Déjà payé" value={formatMoney(paidOf(expense!))} />
        </>
      ) : (
        <>
          <SectionTitle>Paiement</SectionTitle>
          <Chips label="État du règlement" options={PAY_MODES} value={payMode} onChange={setPayMode} />
          {payMode === 'partial' ? <Field label="Montant versé (FCFA)" value={paidInput} onChangeText={setPaidInput} keyboardType="decimal-pad" error={errors.paid} /> : null}
          {payMode !== 'none' ? (
            <>
              <Chips label="Moyen de paiement" options={PAYMENT_OPTIONS} value={method} onChange={setMethod} />
              <Field label="Référence (facultatif)" value={reference} onChangeText={setReference} autoCapitalize="characters" />
            </>
          ) : null}
        </>
      )}

      <Field label="Notes (facultatif)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}
