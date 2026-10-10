import type { Role } from '@/types';

export type Permission =
  | 'clients.write' | 'clients.delete'
  | 'quotes.read' | 'quotes.write' | 'quotes.delete'
  | 'projects.write' | 'projects.delete'
  | 'documents.write'
  | 'logs.write' | 'logs.delete'
  | 'expenses.read' | 'expenses.write' | 'expenses.delete' | 'finance.income'
  | 'stock.read' | 'stock.write'
  | 'purchases.read' | 'purchases.write' | 'purchases.approve'
  | 'invoices.read' | 'invoices.write'
  | 'users.manage';

// À garder synchronisé avec firestore.rules
const MATRIX: Record<Permission, Role[]> = {
  'clients.write': ['admin', 'direction', 'commercial'],
  'clients.delete': ['admin', 'direction'],
  'quotes.read': ['admin', 'direction', 'commercial', 'comptable'],
  'quotes.write': ['admin', 'direction', 'commercial'],
  'quotes.delete': ['admin', 'direction'],
  'projects.write': ['admin', 'direction', 'commercial', 'chef_chantier'],
  'projects.delete': ['admin'],
  'documents.write': ['admin', 'direction', 'chef_chantier'],
  'logs.write': ['admin', 'direction', 'chef_chantier'],
  'logs.delete': ['admin', 'direction'],
  'expenses.read': ['admin', 'direction', 'comptable', 'chef_chantier'],
  'expenses.write': ['admin', 'direction', 'comptable', 'chef_chantier'],
  'expenses.delete': ['admin', 'direction', 'comptable'],
  'finance.income': ['admin', 'direction', 'comptable'],
  'stock.read': ['admin', 'direction', 'chef_chantier', 'magasinier', 'comptable'],
  'stock.write': ['admin', 'direction', 'magasinier'],
  'purchases.read': ['admin', 'direction', 'comptable', 'magasinier'],
  'purchases.write': ['admin', 'direction', 'magasinier'],
  'purchases.approve': ['admin', 'direction'],
  'invoices.read': ['admin', 'direction', 'comptable', 'commercial'],
  'invoices.write': ['admin', 'direction', 'comptable'],
  'users.manage': ['admin'],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && MATRIX[permission].includes(role);
}
