import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function init() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT est manquant sur le serveur.');
  initializeApp({ credential: cert(JSON.parse(raw)) });
}

export function adminAuth() {
  init();
  return getAuth();
}
export function adminDb() {
  init();
  return getFirestore();
}

/** Vérifie le jeton Firebase de l'appelant, son profil actif et (optionnellement) son rôle. */
export async function requireUser(req: VercelRequest, allowedRoles?: string[]) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Authentification requise.');

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    throw new HttpError(401, 'Session expirée. Reconnectez-vous.');
  }

  const snap = await adminDb().doc(`users/${uid}`).get();
  const profile = snap.data();
  if (!snap.exists || !profile?.active) throw new HttpError(403, 'Compte inactif.');
  if (allowedRoles && !allowedRoles.includes(profile.role)) throw new HttpError(403, 'Droits insuffisants.');
  return { uid, role: profile.role as string };
}

/** Enveloppe commune : CORS, méthode POST, gestion des erreurs. */
export function route(handler: (req: VercelRequest) => Promise<unknown>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
    try {
      res.status(200).json(await handler(req));
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  };
}
