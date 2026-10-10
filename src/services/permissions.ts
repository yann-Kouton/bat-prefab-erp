import type { Role } from '@/types';

export type Permission =
  | 'clients.write' | 'clients.delete'
  | 'quotes.read' | 'quotes.write' | 'quotes.delete'
  | 'projects.write' | 'projects.delete'
  | 'documents.write'
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
  'users.manage': ['admin'],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && MATRIX[permission].includes(role);
}
