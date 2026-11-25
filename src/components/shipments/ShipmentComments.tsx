'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lock,
  Pencil,
  Trash2,
  Check,
  X,
  AtSign,
} from 'lucide-react';
import { commentsApi } from '@/lib/api/services';
import { usePolling } from '@/lib/hooks/use-polling';
import { useAddressBook } from '@/lib/hooks/use-address-book-store';
import {
  applyMentionReplacement,
  extractMentions,
  filterMentionOptions,
  getMentionQueryAtCursor,
  getShipmentMentionOptions,
  isCommentEdited,
  splitCommentContentWithMentions,
  type MentionOption,
} from '@/lib/comments';
import {
  deriveUserRole,
  roleBadge,
  timeAgo,
  formatDate,
  shortAddress,
  cn,
} from '@/lib/utils';
import { FormattedDate } from '@/components/FormattedDate';
import { StellarLink } from '@/components/StellarLink';
import type { Shipment, Comment } from '@/types';

const MAX_COMMENT_LENGTH = 1000;

interface ShipmentCommentsProps {
  shipment: Shipment;
  userRole: string;
  currentUserAddress?: string | null;
  pollInterval?: number;
}

interface MentionTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  onSubmitShortcut: () => void;
  onEscape?: () => void;
  placeholder: string;
  disabled?: boolean;
  mentionOptions: MentionOption[];
  getAddressLabel: (address: string) => string | null;
  rows?: number;
  autoFocus?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

function MentionTextarea({
  id,
  label,
  value,
  onChange,
  onSubmitShortcut,
  onEscape,
  placeholder,
  disabled = false,
  mentionOptions,
  getAddressLabel,
  rows = 3,
  autoFocus = false,
  textareaRef: externalRef,
}: MentionTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const [cursorPos, setCursorPos] = useState(value.length);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const mentionMatch = useMemo(
    () => getMentionQueryAtCursor(value, cursorPos),
    [value, cursorPos],
  );

  const filteredOptions = useMemo(
    () => (mentionMatch ? filterMentionOptions(mentionOptions, mentionMatch.query) : []),
    [mentionMatch, mentionOptions],
  );

  const isMenuOpen =
    Boolean(mentionMatch) &&
    dismissedAt !== mentionMatch?.startIndex &&
    filteredOptions.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionMatch?.query, mentionMatch?.startIndex]);

  const insertMention = (option: MentionOption) => {
    if (!mentionMatch) return;
    const { nextContent, nextCursorPos } = applyMentionReplacement(
      value,
      mentionMatch.startIndex,
      cursorPos,
      option.role,
    );
    onChange(nextContent.slice(0, MAX_COMMENT_LENGTH));
    setDismissedAt(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const clamped = Math.min(nextCursorPos, MAX_COMMENT_LENGTH);
        el.setSelectionRange(clamped, clamped);
        setCursorPos(clamped);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredOptions[activeIndex];
        if (chosen) insertMention(chosen);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedAt(mentionMatch?.startIndex ?? null);
        return;
      }
    }

    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmitShortcut();
    }
  };

  const isOverLimit = value.length > MAX_COMMENT_LENGTH;

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={textareaRef}
        rows={rows}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setDismissedAt(null);
          setCursorPos(e.target.selectionStart ?? e.target.value.length);
          onChange(e.target.value);
        }}
        onClick={(e) => setCursorPos(e.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart ?? value.length)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={MAX_COMMENT_LENGTH}
        aria-expanded={isMenuOpen}
        aria-autocomplete="list"
        aria-controls={isMenuOpen ? `${id}-mentions-listbox` : undefined}
        className={cn(
          'w-full text-xs sm:text-sm rounded-xl border border-gray-200 bg-white p-3 text-gray-900 placeholder:text-gray-400',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors resize-y min-h-[72px]',
          isOverLimit && 'border-red-300 focus:border-red-500 focus:ring-red-500',
        )}
      />

      {isMenuOpen && (
        <div
          id={`${id}-mentions-listbox`}
          role="listbox"
          aria-label="Mention shipment party"
          className="absolute left-0 bottom-full mb-1.5 z-30 w-full max-w-sm rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Notify party
          </div>
          {filteredOptions.map((option, idx) => {
            const badge = roleBadge(option.role);
            const customLabel = getAddressLabel(option.address);
            const selected = idx === activeIndex;
            return (
              <button
                key={option.role}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(option);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  'w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs transition-colors',
                  selected ? 'bg-brand-50 text-brand-900' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold text-brand-700">
                    @{option.role}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-gray-400 truncate">
                  {customLabel ? `${customLabel} (${shortAddress(option.address, 3)})` : shortAddress(option.address, 4)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ShipmentComments({
  shipment,
  userRole,
  currentUserAddress,
  pollInterval = 15_000,
}: ShipmentCommentsProps) {
  const { getLabel } = useAddressBook(currentUserAddress ?? null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionOptions = useMemo(
    () => getShipmentMentionOptions(shipment),
    [shipment],
  );

  // Determine if the current user is an authorized participant of this shipment
  const isParticipant =
    (userRole !== 'observer' && Boolean(currentUserAddress)) ||
    (Boolean(currentUserAddress) &&
      (currentUserAddress === shipment.buyerAddress ||
        currentUserAddress === shipment.supplierAddress ||
        currentUserAddress === shipment.logisticsAddress ||
        currentUserAddress === shipment.arbiterAddress));

  const fetchComments = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const data = await commentsApi.list(shipment.id);
        const sorted = [...(data || [])].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setComments(sorted);
      } catch (err: unknown) {
        console.error('Failed to load shipment comments:', err);
        if (!isBackground) {
          setError('Failed to load discussion notes. Please try again.');
        }
      } finally {
        if (!isBackground) setLoading(false);
        setRefreshing(false);
      }
    },
    [shipment.id],
  );

  useEffect(() => {
    void fetchComments(false);
  }, [fetchComments]);

  usePolling(() => fetchComments(true), pollInterval, {
    enabled: shipment.status === 'Active',
  });

  const submitNewComment = async () => {
    if (!isParticipant) {
      setPostError('Only shipment participants can post comments.');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setPostError('Comment cannot be empty.');
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setPostError('Comment exceeds 1,000 characters limit.');
      return;
    }

    setSubmitting(true);
    setPostError(null);

    try {
      const mentions = extractMentions(trimmed);
      const newComment = await commentsApi.create(shipment.id, {
        content: trimmed,
        mentions,
      });
      setContent('');
      if (newComment && newComment.id) {
        setComments((prev) => {
          if (prev.some((c) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
      }
      await fetchComments(true);
    } catch (err: unknown) {
      console.error('Failed to post comment:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to post comment. Please try again.';
      setPostError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitNewComment();
  };

  const startEditing = (comment: Comment) => {
    setConfirmDeleteId(null);
    setActionError(null);
    setEditError(null);
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
    setEditError(null);
  };

  const saveEdit = async (commentId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      setEditError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setEditError('Comment exceeds 1,000 characters limit.');
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const mentions = extractMentions(trimmed);
      const updated = await commentsApi.update(shipment.id, commentId, {
        content: trimmed,
        mentions,
      });
      const nowIso = new Date().toISOString();
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                ...updated,
                content: updated.content ?? trimmed,
                edited: true,
                updatedAt: updated.updatedAt ?? nowIso,
              }
            : c,
        ),
      );
      setEditingId(null);
      setEditContent('');
      await fetchComments(true);
    } catch (err: unknown) {
      console.error('Failed to update comment:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to update comment. Please try again.';
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    setActionError(null);
    try {
      await commentsApi.delete(shipment.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setConfirmDeleteId(null);
      await fetchComments(true);
    } catch (err: unknown) {
      console.error('Failed to delete comment:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to delete comment. Please try again.';
      setActionError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900">
            Discussion &amp; Notes
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {comments.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchComments(true)}
            disabled={refreshing || loading}
            aria-label={refreshing ? 'Refreshing comments' : 'Refresh comments'}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            title="Refresh comments"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', refreshing && 'animate-spin text-brand-600')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Error states */}
      {(error || actionError) && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error || actionError}</span>
          </div>
          {error && (
            <button
              type="button"
              onClick={() => void fetchComments(false)}
              className="font-medium underline hover:text-red-800 ml-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div
          className="space-y-3 py-2"
          role="status"
          aria-label="Loading comments"
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 bg-gray-200 rounded w-16" />
                  <div className="h-3.5 bg-gray-200 rounded w-28" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        /* Empty state */
        <div className="text-center py-8 px-4 rounded-xl bg-gray-50/60 border border-dashed border-gray-200 mb-4">
          <MessageSquare className="w-7 h-7 text-gray-300 mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs font-semibold text-gray-700">No notes or comments yet</p>
          <p className="text-[11px] text-gray-400 max-w-sm mx-auto mt-1 leading-normal">
            {isParticipant
              ? 'Leave updates or mention @buyer, @supplier, @logistics, or @arbiter to notify counterparties.'
              : 'No notes have been posted on this shipment yet.'}
          </p>
        </div>
      ) : (
        /* Comments list */
        <div
          className="space-y-3 mb-5 max-h-[480px] overflow-y-auto pe-1"
          role="log"
          aria-label="Shipment comments"
          aria-live="polite"
        >
          {comments.map((comment) => {
            const derivedRole = deriveUserRole(comment.authorAddress, shipment);
            const roleInfo = roleBadge(derivedRole);
            const isCurrentUser =
              Boolean(currentUserAddress) &&
              comment.authorAddress.toLowerCase() ===
                currentUserAddress?.toLowerCase();
            const isEditing = editingId === comment.id;
            const isConfirmingDelete = confirmDeleteId === comment.id;
            const isDeleting = deletingId === comment.id;
            const edited = isCommentEdited(comment);
            const segments = splitCommentContentWithMentions(comment.content);

            return (
              <div
                key={comment.id}
                className={cn(
                  'p-3.5 rounded-xl border transition-colors text-xs',
                  isCurrentUser
                    ? 'bg-blue-50/30 border-blue-100'
                    : 'bg-gray-50/60 border-gray-100',
                )}
              >
                {/* Comment Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                        roleInfo.className,
                      )}
                    >
                      {roleInfo.label}
                    </span>

                    <StellarLink
                      value={comment.authorAddress}
                      type="account"
                      className="font-mono text-xs text-gray-600 hover:text-brand-600 truncate max-w-[150px] sm:max-w-none"
                    />

                    {isCurrentUser && (
                      <span className="text-[10px] font-medium bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <span
                      className="text-[11px] text-gray-400 whitespace-nowrap"
                      title={formatDate(comment.createdAt)}
                    >
                      {timeAgo(comment.createdAt)}
                    </span>

                    {edited && (
                      <span
                        className="text-[10px] text-gray-400 italic"
                        title={
                          comment.editedAt || comment.updatedAt
                            ? `Edited ${formatDate(comment.editedAt ?? comment.updatedAt ?? null)}`
                            : 'Edited'
                        }
                      >
                        (edited)
                      </span>
                    )}

                    {isCurrentUser && !isEditing && !isConfirmingDelete && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() => startEditing(comment)}
                          aria-label="Edit comment"
                          title="Edit comment"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setConfirmDeleteId(comment.id);
                          }}
                          aria-label="Delete comment"
                          title="Delete comment"
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-white transition-colors"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body / Inline Editor */}
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    {editError && (
                      <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {editError}
                      </p>
                    )}
                    <MentionTextarea
                      id={`edit-comment-${comment.id}`}
                      label="Edit comment"
                      value={editContent}
                      onChange={(next) => {
                        setEditContent(next);
                        if (editError) setEditError(null);
                      }}
                      onSubmitShortcut={() => void saveEdit(comment.id)}
                      onEscape={cancelEditing}
                      placeholder="Edit your comment..."
                      disabled={editSaving}
                      mentionOptions={mentionOptions}
                      getAddressLabel={getLabel}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {editContent.length} / {MAX_COMMENT_LENGTH}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={editSaving}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(comment.id)}
                          disabled={
                            editSaving ||
                            !editContent.trim() ||
                            editContent.length > MAX_COMMENT_LENGTH
                          }
                          className="btn-primary text-xs py-1 px-2.5"
                        >
                          {editSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="w-3 h-3" aria-hidden="true" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {segments.map((seg, idx) =>
                      seg.mention ? (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded bg-brand-50 px-1 py-0.5 font-medium text-brand-700"
                        >
                          {seg.text}
                        </span>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      ),
                    )}
                  </p>
                )}

                {/* Inline delete confirmation */}
                {isConfirmingDelete && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-600">
                      Delete this comment permanently?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        className="btn-secondary text-xs py-1 px-2.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment.id)}
                        disabled={isDeleting}
                        className="btn-danger text-xs py-1 px-2.5"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Composer Section */}
      {isParticipant ? (
        <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-gray-100">
          {postError && (
            <div
              className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{postError}</span>
            </div>
          )}

          <MentionTextarea
            id="comment-input"
            label="Add note or comment"
            value={content}
            onChange={(next) => {
              setContent(next);
              if (postError) setPostError(null);
            }}
            onSubmitShortcut={() => {
              if (!submitting && content.trim() && content.length <= MAX_COMMENT_LENGTH) {
                void submitNewComment();
              }
            }}
            placeholder="Add a note or type @ to mention @buyer, @supplier, @logistics, or @arbiter..."
            disabled={submitting}
            mentionOptions={mentionOptions}
            getAddressLabel={getLabel}
            textareaRef={textareaRef}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  isOverLimit
                    ? 'text-red-600 font-medium'
                    : charCount >= 900
                    ? 'text-amber-600'
                    : 'text-gray-400',
                )}
              >
                {charCount} / {MAX_COMMENT_LENGTH} characters
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400">
                <AtSign className="w-3 h-3" aria-hidden="true" />
                Type @ to notify a party
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || !content.trim() || isOverLimit}
              className="btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  Post note
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Read-only view for non-participants */
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200/80 px-3.5 py-2.5 text-xs text-gray-500">
            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span>
              Only verified shipment counterparties (Buyer, Supplier, Logistics) and the
              Arbiter can post notes. You are in read-only mode.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
