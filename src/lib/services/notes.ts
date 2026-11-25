/**
 * src/lib/services/notes.ts
 *
 * Secure client-side storage for private shipment notes.
 * Scoped per connected Stellar wallet address so notes remain completely
 * isolated and never leak to counterparties or other wallets on the machine.
 */

export interface StoredNote {
  note: string;
  updatedAt: string;
}

type NotesStore = Record<string, StoredNote>;

function getStorageKey(address: string): string {
  return `chainsettle_notes_${address.trim()}`;
}

/**
 * Retrieve all notes for a specific wallet address.
 * Returns a map of shipmentId -> note text.
 */
export function getAllShipmentNotes(address: string | null | undefined): Record<string, string> {
  if (!address || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey(address));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotesStore;
    const result: Record<string, string> = {};
    for (const [id, item] of Object.entries(parsed)) {
      if (item && typeof item.note === 'string') {
        result[id] = item.note;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Get note for a specific shipment under the current wallet address.
 */
export function getShipmentNote(
  address: string | null | undefined,
  shipmentId: string,
): string {
  if (!address || !shipmentId || typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(getStorageKey(address));
    if (!raw) return '';
    const parsed = JSON.parse(raw) as NotesStore;
    return parsed[shipmentId]?.note ?? '';
  } catch {
    return '';
  }
}

/**
 * Save private note for a specific shipment under the current wallet address.
 */
export function saveShipmentNote(
  address: string | null | undefined,
  shipmentId: string,
  noteText: string,
): void {
  if (!address || !shipmentId || typeof window === 'undefined') return;
  try {
    const key = getStorageKey(address);
    const raw = localStorage.getItem(key);
    const store: NotesStore = raw ? JSON.parse(raw) : {};

    const trimmed = noteText.trim();
    if (!trimmed) {
      delete store[shipmentId];
    } else {
      store[shipmentId] = {
        note: noteText,
        updatedAt: new Date().toISOString(),
      };
    }

    localStorage.setItem(key, JSON.stringify(store));
    window.dispatchEvent(
      new CustomEvent('chainsettle:notes-updated', {
        detail: { shipmentId, note: noteText },
      }),
    );
  } catch {
    // Ignore storage errors
  }
}
