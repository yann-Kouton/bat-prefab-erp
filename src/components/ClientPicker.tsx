import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, EmptyState, IconButton, SearchInput } from '@/components/ui';
import { CLIENT_STATUS_LABELS } from '@/lib/constants';
import { CLIENT_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, radius, spacing } from '@/theme';
import type { Client } from '@/types';

interface Props {
  label: string;
  value: { id: string; name: string } | null;
  onChange: (client: Client) => void;
  error?: string;
  disabled?: boolean;
}

export function ClientPicker({ label, value, onChange, error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: clients } = useCollection<Client>('clients');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? clients.filter((c) => c.name.toLowerCase().includes(s) || (c.contactName ?? '').toLowerCase().includes(s)) : clients;
  }, [clients, search]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.field, error ? { borderColor: colors.danger } : null, disabled && { backgroundColor: colors.concrete }]}
      >
        <Text style={[styles.value, !value && { color: colors.muted }]} numberOfLines={1}>
          {value ? value.name : 'Choisir un client'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un client</Text>
              <IconButton name="close" label="Fermer" onPress={() => setOpen(false)} />
            </View>
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher un client" />
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
                  text="Créez d'abord le client depuis l'onglet Clients, puis revenez ici."
                />
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange(item); setOpen(false); setSearch(''); }}
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
  modal: { flex: 1, backgroundColor: colors.concrete },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  modalTitle: { ...font.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm },
  rowName: { ...font.body, fontWeight: '600', color: colors.text },
  rowSub: { ...font.small, color: colors.muted, marginTop: 2 },
});
