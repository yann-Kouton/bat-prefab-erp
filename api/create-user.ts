import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, HttpError, requireUser, route } from './_lib/admin';

const ROLES = ['admin', 'direction', 'commercial', 'chef_chantier', 'comptable', 'magasinier'];
const COUNTRIES = ['CI', 'TG', 'BF', 'CM'];

/** Crée un compte Firebase Auth + son profil Firestore. Réservé aux administrateurs. */
export default route(async (req) => {
  await requireUser(req, ['admin']);

  const { email, password, displayName, role, country } = req.body ?? {};
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email invalide.');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Mot de passe : 8 caractères minimum.');
  if (typeof displayName !== 'string' || displayName.trim().length < 2) throw new HttpError(400, 'Nom invalide.');
  if (!ROLES.includes(role)) throw new HttpError(400, 'Rôle invalide.');
  if (!COUNTRIES.includes(country)) throw new HttpError(400, 'Pays invalide.');

  let uid: string;
  try {
    uid = (await adminAuth().createUser({ email: email.trim(), password, displayName: displayName.trim() })).uid;
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/email-already-exists') throw new HttpError(409, 'Un compte existe déjà avec cet email.');
    throw e;
  }

  await adminDb().doc(`users/${uid}`).set({
    email: email.trim(),
    displayName: displayName.trim(),
    role,
    country,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { uid };
});
