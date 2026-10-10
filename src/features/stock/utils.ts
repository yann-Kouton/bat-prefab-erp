import type { Product } from '@/types';

/** Stock sous le seuil d'alerte (ou en rupture). Un seuil à 0 désactive l'alerte. */
export const isLow = (p: Pick<Product, 'qty' | 'minQty'>) => p.minQty > 0 && p.qty <= p.minQty;
