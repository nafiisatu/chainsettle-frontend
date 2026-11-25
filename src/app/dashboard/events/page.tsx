'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUp, Radio, Activity } from 'lucide-react';
import { eventsApi } from '@/lib/api/services';
import type { ChainEvent, PaginatedResponse } from '@/types';
import { StellarLink } from '@/components/StellarLink';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { timeAgo, cn } from '@/lib/utils';
import { useEventsStream } from '@/lib/hooks/use-events-stream';

const PAGE_SIZE = 20;

function EventsContent() {
import { timeAgo } from '@/lib/utils';
import { Activity } from 'lucide-react';

const PAGE_SIZE = 20;

function EventsPageContent() {
  const t = useTranslations('events');
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const shipmentId = searchParams.get('shipmentId') ?? '';

  const [data, setData] = useState<PaginatedResponse<ChainEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    eventsApi
      .list({ page, limit: PAGE_SIZE, shipmentId: shipmentId || undefined })
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setError(t('loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, shipmentId, t]);

  const {
    events,
    newEventsCount,
    highlightedIds,
    isPolling,
    scrollToTop,
  } = useEventsStream({
    shipmentId: shipmentId || undefined,
    initialEvents: data?.data ?? [],
    page,
  });

  const updateParams = useCallback(
    (next: { page?: number; shipmentId?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.shipmentId !== undefined) {
        if (next.shipmentId) params.set('shipmentId', next.shipmentId);
        else params.delete('shipmentId');
        params.delete('page');
      }
      if (next.page !== undefined) {
        if (next.page > 1) params.set('page', String(next.page));
        else params.delete('page');
      }
      const query = params.toString();
      router.push(query ? `/dashboard/events?${query}` : '/dashboard/events');
    },
    [router, searchParams],
  );

  const totalPages = data?.totalPages ?? data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6 relative">
      {/* Floating 'N new events' pill */}
      {newEventsCount > 0 && (
        <div className="sticky top-4 z-30 flex justify-center pointer-events-none animate-bounce">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700 active:scale-95"
            aria-label={`${newEventsCount} new events available, click to scroll to top`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>
              {newEventsCount} new {newEventsCount === 1 ? 'event' : 'events'}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <div
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200"
            title={isPolling ? 'Real-time via interval polling' : 'Real-time via SSE stream'}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isPolling ? 'Polling' : 'Live'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="shipmentId" className="text-sm text-gray-600">
            {t('filterShipment')}
          </label>
          <input
            id="shipmentId"
            type="text"
            defaultValue={shipmentId}
            placeholder={t('filterShipmentPlaceholder')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParams({ shipmentId: (e.target as HTMLInputElement).value.trim() });
              }
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : loading ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={Activity} title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500">
                    {t('columns.event')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500">
                    {t('columns.shipment')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500">
                    {t('columns.ledger')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500">
                    {t('columns.txHash')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-500">
                    {t('columns.time')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.map((event) => {
                  const isHighlighted = highlightedIds.has(event.id);
                  return (
                    <tr
                      key={event.id}
                      className={cn(
                        'transition-colors duration-1000',
                        isHighlighted ? 'bg-brand-50/80 ring-1 ring-inset ring-brand-200' : 'hover:bg-gray-50/60'
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {isHighlighted && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
                          )}
                          <span>{event.eventName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {event.shipmentId ? (
                          <a
                            href={`/dashboard/shipments/${event.shipmentId}`}
                            className="text-blue-600 hover:underline font-mono text-xs"
                          >
                            {event.shipmentId}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono text-xs">
                        {event.ledger}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StellarLink type="tx" value={event.txHash} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {timeAgo(event.createdAt || event.timestamp || '')}
                      </td>
                    </tr>
                  );
                })}
                {events.map((event: ChainEvent) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {event.eventName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`/dashboard/shipments/${event.shipmentId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {event.shipmentId}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{event.ledger}</td>
                    <td className="px-4 py-3 text-sm">
                      <StellarLink type="tx" value={event.txHash} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <FormattedDate date={event.createdAt ?? event.timestamp ?? null} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => updateParams({ page: page - 1 })}
            onNext={() => updateParams({ page: page + 1 })}
          />
        </>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <EventsContent />
    </Suspense>
  );
}
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading events...</div>}>
      <EventsPageContent />
    </Suspense>
  );
}

