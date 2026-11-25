'use client';

import { useAuthStore } from '@/lib/hooks/use-auth-store';

export function useWallet() {
  const address = useAuthStore((s) => s.address);
  const isConnected = useAuthStore((s) => s.isConnected);
  return { address, isConnected };
}
