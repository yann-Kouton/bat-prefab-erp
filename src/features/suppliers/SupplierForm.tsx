import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, Field, Screen } from '@/components/ui';
import { COUNTRY_OPTIONS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument, removeDocument, updateDocument } from '@/services/firestore';
import type { CountryCode, Supplier } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Saisissez le nom du fournisseur.'),
  email: z.string().trim().refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Adresse email invalide.'),
});

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const { can, profile } = useAuth();
  const readOnly = !can('purchases.write');
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [country, setCountry] = useState<CountryCode>(supplier?.country ?? profile?.country ?? 'CI');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = validate(schema, { name, email });
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(), contactName: contactName.trim(), phone: phone.trim(), email: email.trim(),
        address: address.trim(), country, notes: notes.trim(),
      };
      if (supplier) await updateDocument('suppliers', supplier.id, data);
      else await createDocument('suppliers', data);
      router.back();
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!supplier) return;
    confirmAction('Supprimer ce fournisseur ?', `${supplier.name} sera supprimé définitivement.`, 'Supprimer', async () => {
      try { await removeDocument('suppliers', supplier.id); router.back(); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }

  return (
    <Screen
      title={supplier ? supplier.name : 'Nouveau fournisseur'}
      back
      footer={readOnly ? undefined : <Button label={supplier ? 'Enregistrer les modifications' : 'Ajouter le fournisseur'} onPress={save} loading={saving} />}
    >
      <Field label="Nom du fournisseur" value={name} onChangeText={setName} error={errors.name} editable={!readOnly} autoCapitalize="words" />
      <Field label="Contact" value={contactName} onChangeText={setContactName} editable={!readOnly} autoCapitalize="words" />
      <Field label="Téléphone" value={phone} onChangeText={setPhone} editable={!readOnly} keyboardType="phone-pad" />
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} editable={!readOnly} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Field label="Adresse" value={address} onChangeText={setAddress} editable={!readOnly} multiline />
      <Chips label="Pays" options={COUNTRY_OPTIONS} value={country} onChange={setCountry} disabled={readOnly} />
      <Field label="Notes (délais, conditions…)" value={notes} onChangeText={setNotes} editable={!readOnly} multiline />
      {supplier && can('clients.delete') ? <Button label="Supprimer le fournisseur" variant="danger" icon="trash-outline" onPress={remove} /> : null}
    </Screen>
  );
}
