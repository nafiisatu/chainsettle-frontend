'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Lock, FileText, Check, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { getShipmentNote, saveShipmentNote } from '@/lib/services/notes';

interface ShipmentNotesProps {
  shipmentId: string;
}

export function ShipmentNotes({ shipmentId }: ShipmentNotesProps) {
  const { address } = useAuthStore();
  const [note, setNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);

  // Load existing note on mount or when address/shipmentId changes
  useEffect(() => {
    if (!address || !shipmentId) return;
    const existing = getShipmentNote(address, shipmentId);
    setNote(existing);
    if (existing) {
      setSaveStatus('saved');
    } else {
      setSaveStatus('idle');
    }
    initialLoadRef.current = true;
  }, [address, shipmentId]);

  // Autosave handler with debounce
  const triggerAutosave = useCallback(
    (text: string) => {
      if (!address || !shipmentId) return;
      setSaveStatus('saving');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveShipmentNote(address, shipmentId, text);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }, 500);
    },
    [address, shipmentId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    triggerAutosave(val);
  };

  return (
    <div className="card p-5" role="region" aria-label="Personal shipment notes">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">My notes</h2>
            <p className="text-[11px] text-gray-400">
              Personal reference notes for this shipment
            </p>
          </div>
        </div>

        {/* Prominent 'Only visible to you' privacy badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
          title="Stored only for your connected wallet. Counterparties cannot see this."
        >
          <Lock className="w-3 h-3 text-amber-600" aria-hidden="true" />
          <span>Only visible to you</span>
        </div>
      </div>

      {/* Note Textarea */}
      <div className="relative">
        <label htmlFor="shipment-personal-notes" className="sr-only">
          Personal private note for shipment {shipmentId}
        </label>
        <textarea
          id="shipment-personal-notes"
          value={note}
          onChange={handleChange}
          placeholder="Add internal notes e.g. Internal PO #84920, carrier contact phone, delivery instructions..."
          rows={3}
          className="w-full text-xs text-gray-800 placeholder-gray-400 bg-gray-50/50 rounded-xl border border-gray-200 p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-y"
        />
      </div>

      {/* Footer with autosave status */}
      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
          <span>Stored per wallet & searchable in shipment list</span>
        </div>

        <div>
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <Check className="w-3 h-3" />
              <span>
                Saved {lastSavedAt ? `at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
