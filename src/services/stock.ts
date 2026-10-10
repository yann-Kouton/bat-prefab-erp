import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { MovementType, Product, PurchaseOrder } from '@/types';

interface MovementInput {
  productId: string;
  type: MovementType;
  /** entree/sortie : quantité positive. ajustement : nouvelle quantité comptée (inventaire). */
  qty: number;
  projectId?: string;
  projectCode?: string;
  reason?: string;
  authorName?: string;
}

/**
 * Enregistre un mouvement de stock ET met à jour la quantité du produit dans la même transaction.
 * Le stock n'est jamais modifié « à la main » : chaque variation laisse une trace dans stockMovements.
 */
export async function recordMovement(input: MovementInput): Promise<void> {
  await runTransaction(db, async (tx) => {
    const productRef = doc(db, 'products', input.productId);
    const snap = await tx.get(productRef);
    if (!snap.exists()) throw new Error('Produit introuvable.');
    const product = snap.data() as Product;
    const current = Number(product.qty) || 0;

    let delta: number;
    if (input.type === 'entree') delta = input.qty;
    else if (input.type === 'sortie') delta = -input.qty;
    else delta = input.qty - current; // ajustement = recalage sur la quantité comptée

    const balanceAfter = current + delta;
    if (balanceAfter < 0) throw new Error(`Stock insuffisant : il reste ${current} ${product.unit}.`);

    tx.update(productRef, { qty: balanceAfter, updatedAt: serverTimestamp() });
    tx.set(doc(collection(db, 'stockMovements')), {
      productId: input.productId,
      productName: product.name,
      type: input.type,
      qty: input.type === 'ajustement' ? Math.abs(delta) : input.qty,
      delta,
      balanceAfter,
      projectId: input.projectId ?? null,
      projectCode: input.projectCode ?? null,
      reason: input.reason ?? '',
      authorName: input.authorName ?? '',
      createdBy: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * Réceptionne un bon de commande : passe le statut à « reçu » et crée une entrée de stock
 * pour chaque ligne rattachée au catalogue. Tout est fait dans une transaction : impossible de
 * réceptionner deux fois (le statut est relu), ni de laisser un stock à moitié mis à jour.
 */
export async function receivePurchaseOrder(poId: string, authorName: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const poRef = doc(db, 'purchaseOrders', poId);
    const poSnap = await tx.get(poRef);
    if (!poSnap.exists()) throw new Error('Bon de commande introuvable.');
    const po = poSnap.data() as PurchaseOrder;
    if (po.status !== 'commande') throw new Error('Ce bon de commande ne peut pas être réceptionné (statut : ' + po.status + ').');

    // Toutes les lectures d'abord (exigence Firestore), puis les écritures
    const lines = po.items.filter((i) => i.productId);
    const refs = lines.map((i) => doc(db, 'products', i.productId as string));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));

    // Plusieurs lignes peuvent viser le même produit : on cumule
    const running = new Map<string, number>();
    lines.forEach((item, idx) => {
      const snap = snaps[idx];
      if (!snap.exists()) return;
      const product = snap.data() as Product;
      const before = running.get(snap.id) ?? (Number(product.qty) || 0);
      const after = before + item.quantity;
      running.set(snap.id, after);
      tx.update(refs[idx], { qty: after, lastCost: item.unitPrice, updatedAt: serverTimestamp() });
      tx.set(doc(collection(db, 'stockMovements')), {
        productId: snap.id,
        productName: product.name,
        type: 'entree',
        qty: item.quantity,
        delta: item.quantity,
        balanceAfter: after,
        purchaseOrderId: poId,
        reason: `Réception ${po.number}`,
        authorName,
        createdBy: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });
    });

    tx.update(poRef, { status: 'recu', receivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}
