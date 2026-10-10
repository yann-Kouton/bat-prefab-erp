import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, IconButton } from '@/components/ui';
import { thumbnail, uploadImage } from '@/lib/cloudinary';
import { errorMessage, notify } from '@/lib/dialogs';
import { colors, font, radius, spacing } from '@/theme';
import type { Attachment } from '@/types';

const SIZE = 84;

/** Miniatures d'images ; toucher une miniature l'ouvre en grand. `onRemove` ajoute la croix de suppression. */
export function AttachmentGrid({ items, onRemove }: { items: Attachment[]; onRemove?: (a: Attachment) => void }) {
  const [selected, setSelected] = useState<Attachment | null>(null);
  return (
    <>
      <View style={styles.grid}>
        {items.map((a) => (
          <View key={a.publicId}>
            <Pressable onPress={() => setSelected(a)} accessibilityRole="imagebutton" accessibilityLabel="Agrandir l'image">
              <Image source={{ uri: thumbnail(a.url, 240) }} style={styles.thumb} />
            </Pressable>
            {onRemove ? (
              <Pressable onPress={() => onRemove(a)} accessibilityRole="button" accessibilityLabel="Retirer l'image" style={styles.remove}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
      <Modal visible={!!selected} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.viewer}>
          <View style={styles.viewerBar}><IconButton name="close" color="#FFFFFF" label="Fermer" onPress={() => setSelected(null)} /></View>
          {selected ? <Image source={{ uri: selected.url.replace('/upload/', '/upload/c_limit,w_1600,q_auto,f_auto/') }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </>
  );
}

/** Prise de photo / choix en galerie, envoi immédiat sur Cloudinary. */
export function AttachmentPicker({ label, hint, value, onChange, folder, error, onBusyChange }: {
  label: string; hint?: string; value: Attachment[]; onChange: (v: Attachment[]) => void; folder: string; error?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function add(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          notify('Autorisation requise', "Autorisez l'appareil photo dans les réglages du téléphone.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: source === 'library' };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || result.assets.length === 0) return;

      setUploading(true);
      onBusyChange?.(true);
      const next = [...value];
      for (const asset of result.assets) {
        const img = await uploadImage(asset.uri, folder);
        next.push({ publicId: img.publicId, url: img.url });
      }
      onChange(next);
    } catch (e) {
      notify('Envoi impossible', errorMessage(e));
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      {value.length > 0 ? <View style={{ marginBottom: spacing.sm }}><AttachmentGrid items={value} onRemove={(a) => onChange(value.filter((x) => x.publicId !== a.publicId))} /></View> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Photo" icon="camera-outline" variant="secondary" style={{ flex: 1 }} onPress={() => add('camera')} disabled={uploading} />
        <Button label="Galerie" icon="images-outline" variant="secondary" style={{ flex: 1 }} onPress={() => add('library')} loading={uploading} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: SIZE, height: SIZE, borderRadius: radius.input, backgroundColor: colors.neutralSoft },
  remove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  label: { ...font.small, fontWeight: '600', color: colors.text, marginBottom: 6 },
  hint: { ...font.small, color: colors.muted, marginTop: 4 },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
  viewer: { flex: 1, backgroundColor: 'rgba(10,16,22,0.95)', justifyContent: 'center' },
  viewerBar: { position: 'absolute', top: 48, left: 12, zIndex: 2 },
  viewerImage: { width: '100%', height: '80%' },
});
