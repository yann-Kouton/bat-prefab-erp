import { auth } from '@/lib/firebase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** Appelle une Vercel Function en envoyant le jeton Firebase de l'utilisateur connecté. */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL n'est pas défini : renseignez l'URL de l'API (voir README).");
  }
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Erreur serveur (${res.status})`);
  return json as T;
}
