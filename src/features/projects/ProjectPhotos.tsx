import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/auth/AuthContext';
import { Button, EmptyState, IconButton, SectionTitle } from '@/components/ui';
import { uploadImage, thumbnail } from '@/lib/cloudinary';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { createDocument, removeDocument, useCollection } from '@/services/firestore';
import { colors, font, radius, spacing } from '@/theme';
import type { ProjectDocument } from '@/types';

const GAP = 6;

export function ProjectPhotos({ projectId }: { projectId: string }) {
  const { can, profile } = useAuth();
  const path = `projects/${projectId}/documents`;
  const { data: photos } = useCollection<ProjectDocument>(path);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<ProjectDocument | null>(null);
  const { width } = useWindowDimensions();
  const size = Math.floor((Math.min(width, 700) - spacing.lg * 2 - GAP * 2) / 3);
  const canUpload = can('documents.write');

  async function add(source: 'camera' | 'library') {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          notify('Autorisation requise', "Autorisez l'appareil photo dans les réglages du téléphone.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const img = await uploadImage(result.assets[0].uri, `bat-prefab/projets/${projectId}`);
      await createDocument(path, { kind: 'photo', publicId: img.publicId, url: img.url, uploadedByName: profile?.displayName ?? '' });
    } catch (e) {
      notify("Envoi impossible", errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function remove(photo: ProjectDocument) {
    confirmAction('Retirer cette photo ?', "Elle disparaît du projet (le fichier reste dans Cloudinary).", 'Retirer', async () => {
      try {
        await removeDocument(path, photo.id);
        setSelected(null);
      } catch (e) {
        notify('Suppression impossible', errorMessage(e));
      }
    });
  }

  return (
    <View>
      <SectionTitle>Photos du chantier</SectionTitle>
      {canUpload ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Button label="Prendre une photo" icon="camera-outline" variant="secondary" style={{ flex: 1 }} onPress={() => add('camera')} disabled={uploading} />
          <Button label="Galerie" icon="images-outline" variant="secondary" style={{ flex: 1 }} onPress={() => add('library')} loading={uploading} />
        </View>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState icon="camera-outline" title="Aucune photo" text={canUpload ? 'Ajoutez des photos pour suivre l’avancement du chantier.' : undefined} />
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <Pressable key={p.id} onPress={() => setSelected(p)} accessibilityRole="imagebutton" accessibilityLabel="Agrandir la photo">
              <Image source={{ uri: thumbnail(p.url, 300) }} style={{ width: size, height: size, borderRadius: radius.input, backgroundColor: colors.neutralSoft }} />
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={!!selected} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.viewer}>
          <View style={styles.viewerBar}>
            <IconButton name="close" color="#FFFFFF" label="Fermer" onPress={() => setSelected(null)} />
            {selected && canUpload ? <IconButton name="trash-outline" color="#FFFFFF" label="Retirer la photo" onPress={() => remove(selected)} /> : null}
          </View>
          {selected ? (
            <Image source={{ uri: selected.url.replace('/upload/', '/upload/c_limit,w_1400,q_auto,f_auto/') }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          {selected?.uploadedByName ? <Text style={styles.viewerCaption}>Ajoutée par {selected.uploadedByName}</Text> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  viewer: { flex: 1, backgroundColor: 'rgba(10,16,22,0.95)', justifyContent: 'center' },
  viewerBar: { position: 'absolute', top: 48, left: 12, right: 12, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  viewerImage: { width: '100%', height: '75%' },
  viewerCaption: { ...font.small, color: '#B8C4CE', textAlign: 'center', marginTop: spacing.md },
});
