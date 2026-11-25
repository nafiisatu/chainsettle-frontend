'use client';

import { useCurrency } from '@/lib/hooks/use-currency';

interface ApproximateFiatProps {
  amount: string | number | null | undefined;
  className?: string;
}

export function ApproximateFiat({ amount, className = 'text-xs text-gray-500' }: ApproximateFiatProps) {
  const { formatFiat } = useCurrency();
  const text = formatFiat(amount);

  if (!text) return null;

  return (
    <span
      className={className}
      title="Estimated value based on current exchange rates"
      aria-label={`Approximate local currency value: ${text}`}
    >
      {text}
    </span>
  );
}
