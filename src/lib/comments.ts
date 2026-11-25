import type { Comment, MentionRole, Shipment } from '@/types';

export const MENTION_ROLES: MentionRole[] = ['buyer', 'supplier', 'logistics', 'arbiter'];

const MENTION_REGEX = /(^|[\s(])@(buyer|supplier|logistics|arbiter)\b/gi;
const MENTION_SPLIT_REGEX = /(@(?:buyer|supplier|logistics|arbiter)\b)/gi;

export interface MentionOption {
  role: MentionRole;
  label: string;
  address: string;
}

/** Extract unique canonical @role mentions from comment content, in order of appearance. */
export function extractMentions(content: string): MentionRole[] {
  const seen = new Set<MentionRole>();
  const result: MentionRole[] = [];
  for (const match of content.matchAll(MENTION_REGEX)) {
    const role = match[2].toLowerCase() as MentionRole;
    if (!seen.has(role)) {
      seen.add(role);
      result.push(role);
    }
  }
  return result;
}

/**
 * Inspect text before the caret to determine if the user is typing an @mention.
 * Returns the query after `@` and the index of `@`, or null if no active mention token.
 */
export function getMentionQueryAtCursor(
  text: string,
  cursorPos: number,
): { query: string; startIndex: number } | null {
  const clamped = Math.max(0, Math.min(cursorPos, text.length));
  const beforeCursor = text.slice(0, clamped);
  const match = beforeCursor.match(/(^|[\s(])@([a-zA-Z]*)$/);
  if (!match) return null;
  const query = match[2].toLowerCase();
  const startIndex = beforeCursor.length - query.length - 1;
  return { query, startIndex };
}

/** Replace the active `@query` token with `@role ` and return the updated content and caret position. */
export function applyMentionReplacement(
  text: string,
  startIndex: number,
  cursorPos: number,
  role: MentionRole,
): { nextContent: string; nextCursorPos: number } {
  const before = text.slice(0, startIndex);
  const after = text.slice(cursorPos);
  const insertion = `@${role} `;
  const nextContent = `${before}${insertion}${after}`;
  return {
    nextContent,
    nextCursorPos: before.length + insertion.length,
  };
}

/** Build the mentionable party options for a shipment. */
export function getShipmentMentionOptions(shipment: Pick<
  Shipment,
  'buyerAddress' | 'supplierAddress' | 'logisticsAddress' | 'arbiterAddress'
>): MentionOption[] {
  return [
    { role: 'buyer', label: 'Buyer', address: shipment.buyerAddress },
    { role: 'supplier', label: 'Supplier', address: shipment.supplierAddress },
    { role: 'logistics', label: 'Logistics', address: shipment.logisticsAddress },
    { role: 'arbiter', label: 'Arbiter', address: shipment.arbiterAddress },
  ];
}

/** Filter mention options by the query currently typed after `@`. */
export function filterMentionOptions(
  options: MentionOption[],
  query: string,
): MentionOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (opt) => opt.role.startsWith(q) || opt.label.toLowerCase().includes(q),
  );
}

/** Split comment text into plain segments and canonical @mention tokens for safe rendering. */
export function splitCommentContentWithMentions(
  content: string,
): Array<{ text: string; mention?: MentionRole }> {
  const parts = content.split(MENTION_SPLIT_REGEX);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower.startsWith('@')) {
        const candidate = lower.slice(1) as MentionRole;
        if (MENTION_ROLES.includes(candidate)) {
          return { text: part, mention: candidate };
        }
      }
      return { text: part };
    });
}

/** Determine whether a comment has been edited after creation. */
export function isCommentEdited(
  comment: Pick<Comment, 'edited' | 'editedAt' | 'createdAt' | 'updatedAt'>,
): boolean {
  if (comment.edited === true) return true;
  if (comment.editedAt) return true;
  if (!comment.updatedAt) return false;
  const created = new Date(comment.createdAt).getTime();
  const updated = new Date(comment.updatedAt).getTime();
  return Number.isFinite(created) && Number.isFinite(updated) && updated - created > 1000;
}
