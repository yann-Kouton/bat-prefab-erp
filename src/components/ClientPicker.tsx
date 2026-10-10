import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Chips, EmptyState, Field, IconButton, SearchInput } from '@/components/ui';
import { CLIENT_STATUS_LABELS, CLIENT_TYPE_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { CLIENT_TONES } from '@/lib/tones';
import { createDocument, useCollection } from '@/services/firestore';
import { colors, font, radius, spacing } from '@/theme';
import type { Client, ClientType } from '@/types';

interface Props {
  label: string;
  value: { id: string; name: string } | null;
  onChange: (client: Client) => void;
  error?: string;
  disabled?: boolean;
}

export function ClientPicker({ label, value, onChange, error, disabled }: Props) {
  const { can, profile } = useAuth();
  const canCreate = can('clients.write');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: clients } = useCollection<Client>('clients');

  // Création rapide d'un client sans quitter le formulaire
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<ClientType>('entreprise');
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? clients.filter((c) => c.name.toLowerCase().includes(s) || (c.contactName ?? '').toLowerCase().includes(s)) : clients;
  }, [clients, search]);

  function close() {
    setOpen(false);
    setCreating(false);
    setSearch('');
  }

  function startCreate() {
    setName(search.trim()); // reprend ce qui a été tapé dans la recherche
    setNameError(undefined);
    setEmailError(undefined);
    setCreating(true);
  }

  async function createClient() {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const nErr = cleanName.length < 2 ? 'Saisissez le nom du client.' : undefined;
    const eErr = cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail) ? 'Adresse email invalide.' : undefined;
    setNameError(nErr);
    setEmailError(eErr);
    if (nErr || eErr) return;

    setSaving(true);
    try {
      const data = {
        type, name: cleanName, contactName: contactName.trim(), phone: phone.trim(), email: cleanEmail,
        address: '', country: profile?.country ?? 'CI', status: 'client', source: '', notes: '',
      };
      const id = await createDocument('clients', data);
      onChange({ id, ...data } as Client); // le nouveau client est sélectionné directement
      setName(''); setContactName(''); setPhone(''); setEmail('');
      close();
    } catch (e) {
      notify('Création impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.field, error ? { borderColor: colors.danger } : null, disabled && { backgroundColor: colors.canvas }]}
      >
        <Text style={[styles.value, !value && { color: colors.muted }]} numberOfLines={1}>
          {value ? value.name : 'Choisir ou créer un client'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{creating ? 'Nouveau client' : 'Choisir un client'}</Text>
              <IconButton name="close" label="Fermer" onPress={close} />
            </View>

            {creating ? (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
                  <Chips label="Type de client" options={CLIENT_TYPE_OPTIONS} value={type} onChange={setType} />
                  <Field label={type === 'entreprise' ? "Nom de l'entreprise" : 'Nom complet'} value={name} onChangeText={setName} error={nameError} autoCapitalize="words" />
                  <Field label="Personne à contacter (facultatif)" value={contactName} onChangeText={setContactName} autoCapitalize="words" />
                  <Field label="Téléphone (facultatif)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+225 ..." />
                  <Field label="Email (facultatif)" value={email} onChangeText={setEmail} error={emailError} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                  <Text style={styles.hint}>Les autres informations (adresse, notes…) se complètent plus tard dans l'onglet Clients.</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                    <Button label="Retour" variant="secondary" style={{ flex: 1 }} onPress={() => setCreating(false)} disabled={saving} />
                    <Button label="Créer et choisir" style={{ flex: 2 }} onPress={createClient} loading={saving} />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : (
              <>
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm }}>
                  <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un client" />
                  {canCreate ? <Button label="Nouveau client" icon="add" variant="accent" onPress={startCreate} /> : null}
                </View>
                <FlatList
                  data={filtered}
                  keyExtractor={(c) => c.id}
                  contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <EmptyState
                      icon="people-outline"
                      title="Aucun client trouvé"
                      text={canCreate
                        ? (search.trim() ? `Créez « ${search.trim()} » avec le bouton ci-dessus.` : 'Créez votre premier client avec le bouton ci-dessus.')
                        : "Votre rôle ne permet pas de créer un client : demandez à un collègue autorisé de le créer depuis l'onglet Clients."}
                    />
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => { onChange(item); close(); }}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                        {item.contactName ? <Text style={styles.rowSub} numberOfLines={1}>{item.contactName}</Text> : null}
                      </View>
                      <Badge label={CLIENT_STATUS_LABELS[item.status]} tone={CLIENT_TONES[item.status]} />
                    </Pressable>
                  )}
                />
              </>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...font.small, fontWeight: '600', color: colors.text, marginBottom: 6 },
  field: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: 12 },
  value: { ...font.body, color: colors.text, flex: 1 },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
  hint: { ...font.small, color: colors.muted },
  modal: { flex: 1, backgroundColor: colors.canvas },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  modalTitle: { ...font.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm },
  rowName: { ...font.body, fontWeight: '600', color: colors.text },
  rowSub: { ...font.small, color: colors.muted, marginTop: 2 },
});
