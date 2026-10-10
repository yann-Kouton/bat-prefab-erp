import { useState } from 'react';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, EmptyState, Field, Screen } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { COUNTRY_OPTIONS, ROLE_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { FieldErrors, validate } from '@/lib/validation';
import type { CountryCode, Role } from '@/types';

const schema = z.object({
  displayName: z.string().trim().min(2, 'Saisissez le nom complet.'),
  email: z.string().trim().refine((v) => /^\S+@\S+\.\S+$/.test(v), 'Adresse email invalide.'),
  password: z.string().min(8, 'Au moins 8 caractères.'),
});

export default function NewUser() {
  const { can } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('commercial');
  const [country, setCountry] = useState<CountryCode>('CI');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  if (!can('users.manage')) {
    return (
      <Screen title="Nouvel utilisateur" back>
        <EmptyState icon="lock-closed-outline" title="Accès réservé" text="Seuls les administrateurs peuvent créer des comptes." />
      </Screen>
    );
  }

  async function save() {
    const result = validate(schema, { displayName, email, password });
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    try {
      await apiPost('/api/create-user', { displayName: displayName.trim(), email: email.trim(), password, role, country });
      notify('Compte créé', `${displayName.trim()} peut maintenant se connecter avec cet email et le mot de passe provisoire.`);
      router.back();
    } catch (e) {
      notify('Création impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Nouvel utilisateur" back footer={<Button label="Créer le compte" onPress={save} loading={saving} />}>
      <Field label="Nom complet" value={displayName} onChangeText={setDisplayName} error={errors.displayName} autoCapitalize="words" />
      <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Field label="Mot de passe provisoire" value={password} onChangeText={setPassword} error={errors.password} autoCapitalize="none" autoCorrect={false} hint="Communiquez-le à la personne ; elle pourra le changer via « Mot de passe oublié »." />
      <Chips label="Rôle" options={ROLE_OPTIONS} value={role} onChange={setRole} />
      <Chips label="Pays" options={COUNTRY_OPTIONS} value={country} onChange={setCountry} />
    </Screen>
  );
}
