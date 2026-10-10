import { useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where,
  type WhereFilterOp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type WithId<T> = T & { id: string };

/** Abonnement temps réel à une collection (ou sous-collection : "projects/abc/documents"). */
export function useCollection<T>(
  path: string,
  options: { enabled?: boolean; orderField?: string | null; where?: [string, WhereFilterOp, unknown] } = {},
) {
  const { enabled = true, orderField = 'createdAt' } = options;
  // Un filtre `where` combiné à orderBy exigerait un index composite : avec un filtre, on trie côté client.
  const filter = options.where;
  const filterKey = filter ? JSON.stringify(filter) : '';
  const [data, setData] = useState<WithId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = collection(db, path);
    const q = filter
      ? query(ref, where(filter[0], filter[1], filter[2]))
      : orderField ? query(ref, orderBy(orderField, 'desc')) : query(ref);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as unknown as WithId<T>));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, orderField, filterKey]);

  return { data, loading, error };
}

/** Abonnement temps réel à un document. `data` vaut null s'il n'existe pas. */
export function useDocument<T>(collectionPath: string, id: string | undefined) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, collectionPath, id),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) } as unknown as WithId<T>) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [collectionPath, id]);

  return { data, loading };
}

export async function createDocument(path: string, data: Record<string, unknown>): Promise<string> {
  const ref = await addDoc(collection(db, path), {
    ...data,
    createdBy: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(path: string, id: string, data: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

/**
 * Numéro de document séquentiel par année : DEV-2026-0001, PRJ-2026-0001…
 * Incrémenté dans une transaction pour éviter les doublons.
 */
export async function nextNumber(prefix: 'DEV' | 'PRJ' | 'FAC' | 'BC'): Promise<string> {
  const year = new Date().getFullYear();
  const ref = doc(db, 'counters', `${prefix}_${year}`);
  const value = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? (snap.data().value as number) : 0) + 1;
    tx.set(ref, { value: next });
    return next;
  });
  return `${prefix}-${year}-${String(value).padStart(4, '0')}`;
}
