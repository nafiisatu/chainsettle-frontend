import { deriveUserRole as baseDeriveUserRole } from '@/lib/utils';

export function deriveUserRole(first: any, second: any): string {
  if (typeof first === 'string' || first === null) {
    return baseDeriveUserRole(first, second);
  }
  return baseDeriveUserRole(second, first);
}
