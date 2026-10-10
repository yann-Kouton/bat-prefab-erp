import { Platform } from 'react-native';
import { apiPost } from '@/lib/api';

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/** Upload signé : le secret Cloudinary reste côté serveur (api/cloudinary-sign.ts). */
export async function uploadImage(uri: string, folder: string): Promise<UploadedImage> {
  const sig = await apiPost<SignResponse>('/api/cloudinary-sign', { folder });

  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'photo.jpg');
  } else {
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Échec de l'envoi de l'image.");
  return {
    publicId: json.public_id,
    url: json.secure_url,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
  };
}

/** Miniature optimisée : insère une transformation dans l'URL Cloudinary. */
export function thumbnail(url: string, size = 400): string {
  return url.replace('/upload/', `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}
