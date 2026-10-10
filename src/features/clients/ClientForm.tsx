import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, Field, Screen } from '@/components/ui';
import {
  CLIENT_SOURCES, CLIENT_STATUS_OPTIONS, CLIENT_TYPE_OPTIONS, COUNTRY_OPTIONS,
} from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument, removeDocument, updateDocument } from '@/services/firestore';
import type { Client, ClientStatus, ClientType, CountryCode } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Saisissez le nom du client.'),
  email: z.string().trim().refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Adresse email invalide.'),
});

export function ClientForm({ client }: { client?: Client }) {
  const { can, profile } = useAuth();
  const readOnly = !can('clients.write');

  const [type, setType] = useState<ClientType>(client?.type ?? 'entreprise');
  const [name, setName] = useState(client?.name ?? '');
  const [contactName, setContactName] = useState(client?.contactName ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [country, setCountry] = useState<CountryCode>(client?.country ?? profile?.country ?? 'CI');
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'prospect');
  const [source, setSource] = useState<string | null>(client?.source ?? null);
  const [notes, setNotes] = useState(client?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = validate(schema, { name, email });
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    try {
      const data = {
        type, name: name.trim(), contactName: contactName.trim(), phone: phone.trim(), email: email.trim(),
        address: address.trim(), country, status, source: source ?? '', notes: notes.trim(),
      };
      if (client) await updateDocument('clients', client.id, data);
      else await createDocument('clients', data);
      router.back();
    } catch (e) {
      notify("Enregistrement impossible", errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!client) return;
    confirmAction('Supprimer ce client ?', `${client.name} sera supprimé définitivement. Ses devis et projets restent conservés.`, 'Supprimer', async () => {
      try {
        await removeDocument('clients', client.id);
        router.back();
      } catch (e) {
        notify('Suppression impossible', errorMessage(e));
      }
    });
  }

  return (
    <Screen
      title={client ? client.name : 'Nouveau client'}
      subtitle={client ? (readOnly ? 'Consultation' : 'Modifier la fiche') : undefined}
      back
      footer={readOnly ? undefined : <Button label={client ? 'Enregistrer les modifications' : 'Créer le client'} onPress={save} loading={saving} />}
    >
      <Chips label="Type de client" options={CLIENT_TYPE_OPTIONS} value={type} onChange={setType} disabled={readOnly} />
      <Field label={type === 'entreprise' ? "Nom de l'entreprise" : 'Nom complet'} value={name} onChangeText={setName} error={errors.name} editable={!readOnly} autoCapitalize="words" />
      <Field label="Personne à contacter" value={contactName} onChangeText={setContactName} editable={!readOnly} autoCapitalize="words" />
      <Field label="Téléphone" value={phone} onChangeText={setPhone} editable={!readOnly} keyboardType="phone-pad" placeholder="+225 ..." />
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} editable={!readOnly} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Field label="Adresse" value={address} onChangeText={setAddress} editable={!readOnly} multiline />
      <Chips label="Pays" options={COUNTRY_OPTIONS} value={country} onChange={setCountry} disabled={readOnly} />
      <Chips label="Statut" options={CLIENT_STATUS_OPTIONS} value={status} onChange={setStatus} disabled={readOnly} />
      <Chips label="Origine du contact" options={CLIENT_SOURCES} value={source} onChange={setSource} disabled={readOnly} />
      <Field label="Notes" value={notes} onChangeText={setNotes} editable={!readOnly} multiline />
      {client && can('clients.delete') ? (
        <View style={{ marginTop: 8 }}>
          <Button label="Supprimer le client" variant="danger" icon="trash-outline" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  );
}
