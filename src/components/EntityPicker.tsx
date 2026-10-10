import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, IconButton, SearchInput } from '@/components/ui';
import { colors, font, radius, spacing } from '@/theme';

export interface PickerItem {
  id: string;
  label: string;
  sub?: string;
}

interface Props {
  label: string;
  title: string; // titre de la fenêtre de choix
  placeholder: string;
  items: PickerItem[];
  value: { id: string; label: string } | null;
  onChange: (item: PickerItem) => void;
  onClear?: () => void; // affiche « Aucun » si le champ est facultatif
  emptyText?: string;
  error?: string;
  disabled?: boolean;
}

/** Sélecteur de liste générique (fournisseur, produit, projet…) avec recherche. */
export function EntityPicker({ label, title, placeholder, items, value, onChange, onClear, emptyText, error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? items.filter((i) => i.label.toLowerCase().includes(s) || (i.sub ?? '').toLowerCase().includes(s)) : items;
  }, [items, search]);

  const close = () => { setOpen(false); setSearch(''); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.field, error ? { borderColor: colors.danger } : null, disabled && { backgroundColor: colors.canvas }]}
      >
        <Text style={[styles.value, !value && { color: colors.muted }]} numberOfLines={1}>{value ? value.label : placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <IconButton name="close" label="Fermer" onPress={close} />
            </View>
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <SearchInput value={search} onChangeText={setSearch} placeholder="Rechercher" />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                onClear && value ? (
                  <Pressable onPress={() => { onClear(); close(); }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.rowName, { color: colors.danger }]}>Aucun (retirer la sélection)</Text>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={<EmptyState icon="search-outline" title="Aucun résultat" text={emptyText} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => { onChange(item); close(); }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.label}</Text>
                    {item.sub ? <Text style={styles.rowSub} numberOfLines={1}>{item.sub}</Text> : null}
                  </View>
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
  modal: { flex: 1, backgroundColor: colors.canvas },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  modalTitle: { ...font.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm },
  rowName: { ...font.body, fontWeight: '600', color: colors.text },
  rowSub: { ...font.small, color: colors.muted, marginTop: 2 },
});
