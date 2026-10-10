import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, type User,
} from '@firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { can as canDo, type Permission } from '@/services/permissions';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u) {
          setProfile(null);
          setLoading(false);
        }
      }),
    [],
  );

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null);
        setLoading(false);
      },
      () => {
        setProfile(null);
        setLoading(false);
      },
    );
  }, [uid]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);
  const signOut = useCallback(() => fbSignOut(auth), []);
  const resetPassword = useCallback((email: string) => sendPasswordResetEmail(auth, email.trim()), []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signOut,
      resetPassword,
      can: (p) => !!profile?.active && canDo(profile.role, p),
    }),
    [user, profile, loading, signIn, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}

/** Traduit les codes d'erreur Firebase Auth en messages lisibles. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou mot de passe incorrect.';
    case 'auth/invalid-email':
      return "Cette adresse email n'est pas valide.";
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre réseau.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    default:
      return 'Connexion impossible. Réessayez.';
  }
}
