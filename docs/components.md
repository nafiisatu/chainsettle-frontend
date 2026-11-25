# Components: conventions and catalog

This page lists the shared components in `src/components/` and the conventions new components should follow. Check it before you build something new; the component you need may already exist.

## Folder layout

```
src/components/
├── CommandPalette.tsx        ← shared, app-wide (root)
├── EmptyState.tsx            ← shared, app-wide (root)
├── Pagination.tsx            ← shared, app-wide (root)
├── StellarLink.tsx           ← shared, app-wide (root)
├── TransactionError.tsx      ← shared, app-wide (root)
├── auth/                     ← session and sign-in UI
├── layout/                   ← dashboard chrome (Sidebar, TopBar, Breadcrumbs, KeyboardShortcuts)
├── milestones/               ← milestone timeline, arbiter panel, proof upload
├── shipments/                ← shipment cards, metadata, progress, comments
└── templates/                ← shipment template picker and manager
```

- **Root (`src/components/*.tsx`)**: generic building blocks used by more than one feature. They must not depend on a specific page.
- **Feature folders (`src/components/<feature>/`)**: components that belong to one domain area. Put a new component in the folder of the feature that owns it; create a new folder only for a new domain area.
- **Pages (`src/app/**/page.tsx`)**: route-level composition. If a block of a page is reused or grows large, move it to `src/components/<feature>/`.
- Promote a feature component to the root only when a second, unrelated feature needs it.

## Shared components

### `StellarLink`

`src/components/StellarLink.tsx` · client component

Renders an account address or transaction hash as a shortened link to Stellar Expert. The network (`testnet` or `public`) comes from `NEXT_PUBLIC_STELLAR_NETWORK`. Use it everywhere an address or hash is shown, instead of plain text.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | Yes | Account address (`G…`) or transaction hash. |
| `type` | `'account' \| 'tx'` | Yes | Which Stellar Expert page to link to. |
| `className` | `string` | No | Replaces (does not merge with) the default `font-mono text-blue-600 hover:text-blue-800 underline`. |

```tsx
import { StellarLink } from '@/components/StellarLink';

<StellarLink value={shipment.buyerAddress} type="account" />
<StellarLink value={txHash} type="tx" className="font-mono text-xs text-gray-600 underline" />
```

Accessibility: it opens in a new tab with `rel="noopener noreferrer"` and an `aria-label` that says so. See [`src/components/STELLAR_LINK.md`](../src/components/STELLAR_LINK.md) for details.

### `EmptyState`

`src/components/EmptyState.tsx` · works in server and client components

A centered card for "nothing here yet" states in lists and feeds.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `LucideIcon` | Yes | A `lucide-react` icon component (pass the component, not an element). |
| `title` | `string` | Yes | Short heading. |
| `description` | `string` | Yes | One sentence explaining the state or the next step. |
| `action` | `React.ReactNode` | No | Optional call to action, e.g. a link or button. |

```tsx
import Link from 'next/link';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

<EmptyState
  icon={Package}
  title={t('empty.title')}
  description={t('empty.description')}
  action={
    <Link href="/dashboard/shipments/create" className="btn-primary">
      {t('newShipment')}
    </Link>
  }
/>
```

### `Pagination`

`src/components/Pagination.tsx` · client component

Previous/next controls for paged lists. It renders nothing when `totalPages <= 1`. Pages are 1-based.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `page` | `number` | Yes | Current page, starting at `1`. |
| `totalPages` | `number` | Yes | Total number of pages. |
| `onPrev` | `() => void` | Yes | Called when "Previous" is clicked (disabled on page 1). |
| `onNext` | `() => void` | Yes | Called when "Next" is clicked (disabled on the last page). |

```tsx
'use client';

import { useState } from 'react';
import { Pagination } from '@/components/Pagination';

const [page, setPage] = useState(1);

<Pagination
  page={page}
  totalPages={totalPages}
  onPrev={() => setPage((p) => Math.max(1, p - 1))}
  onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
/>
```

Accessibility: wrapped in `<nav aria-label="Pagination">`, buttons have `aria-label`s and visible focus rings.

### `TransactionError`

`src/components/TransactionError.tsx` · client component (uses `next-intl`)

Renders an error thrown by a contract call in `src/lib/stellar/contract.ts`:

- `TxPendingError` → a "still pending" notice with a Stellar Expert link to the transaction.
- `ContractError` → a translated, friendly message plus a collapsible "Technical details" section (hidden for `UserRejected`).
- Anything else → the error's message, then `fallback`, then the generic unknown-error message.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `error` | `unknown` | Yes | The caught error. |
| `fallback` | `string` | No | Message shown when the error has no message. |
| `className` | `string` | No | Classes for the message paragraph. Defaults to `text-sm text-red-700`. |

The file also exports `isTxPending(error): error is TxPendingError`.

```tsx
'use client';

import { useState } from 'react';
import { TransactionError, isTxPending } from '@/components/TransactionError';
import { confirmMilestone } from '@/lib/stellar/contract';

const [error, setError] = useState<unknown>(null);

async function onConfirm() {
  setError(null);
  try {
    await confirmMilestone({ callerAddress: address, shipmentId, milestoneIndex });
  } catch (err) {
    setError(err);
  }
}

{error !== null && (
  <div role="alert">
    <TransactionError error={error} />
  </div>
)}
{isTxPending(error) && <p>{/* e.g. keep polling instead of offering a retry */}</p>}
```

### `CommandPalette`

`src/components/CommandPalette.tsx` · client component · no props

The global `Cmd/Ctrl+K` palette for jumping to pages, running actions (disconnect wallet) and searching shipments. It renders only when a wallet is connected. It is already mounted by the dashboard layout; do not mount it again. To add a page or action, add an entry to the `pageCommands` or `actionCommands` arrays inside the component.

```tsx
import { CommandPalette } from '@/components/CommandPalette';

<CommandPalette />
```

### Modals and dialogs

There is no generic `Modal` component in the root yet. Existing dialogs build their own overlay:

- `src/components/auth/SessionTimeoutModal.tsx`: session expiry warning.
- `src/components/templates/SaveTemplateDialog.tsx`: save-as-template dialog.
- The cancel-shipment confirmation in `src/app/dashboard/shipments/[id]/page.tsx`.

If you need a new dialog, follow the same pattern: `role="dialog"`, `aria-modal="true"`, an `aria-labelledby` pointing at the title, focus moved into the dialog on open and returned on close, and `Escape` to close. If a third use case appears, extract a shared `Modal` to `src/components/Modal.tsx` and add it to this page.

## Feature components (quick index)

| Folder | Components |
|--------|------------|
| `auth/` | `SessionTimeoutModal` |
| `layout/` | `Sidebar`, `TopBar`, `Breadcrumbs`, `KeyboardShortcuts` |
| `milestones/` | `MilestoneTimeline`, `ArbiterPanel`, `ProofDocumentDropzone` |
| `shipments/` | `ShipmentCard`, `ShipmentCardSkeleton`, `ShipmentMeta`, `ShipmentProgress`, `ShipmentComments`, `EscrowBalanceCard` |
| `templates/` | `TemplatePicker`, `TemplateManager`, `SaveTemplateDialog` |

## Conventions

### Naming and exports

- One component per file. The file name is the component name in PascalCase: `ShipmentCard.tsx` exports `ShipmentCard`.
- Use **named exports** (`export function ShipmentCard`), not default exports. Default exports are reserved for Next.js route files (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`).
- Declare props as an interface named `<Component>Props` above the component (inline types are fine for one or two props).
- Import with the `@/` alias: `import { EmptyState } from '@/components/EmptyState';`.
- Small helpers used only by one component can live in the same file; shared helpers go in `src/lib/utils`.

### Server vs client

- Components are server components by default. Add `'use client'` at the top only when the component uses state, effects, event handlers, browser APIs, Zustand stores, or `useTranslations` from a client context.
- Keep wallet and contract calls (`src/lib/stellar/*`) in client components; they need Freighter in the browser.

### Styling

- Use Tailwind utility classes. Reuse the component classes from `src/styles/globals.css` before writing new ones: `card`, `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, `input`, `label`, `badge` and the `badge-*` status variants, `no-print`.
- Use the `brand-*` color scale from `tailwind.config.js` for primary accents and focus rings.
- Combine conditional classes with `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`), so later classes correctly override earlier ones:

  ```tsx
  import { cn } from '@/lib/utils';

  <button className={cn('btn', active ? 'btn-primary' : 'btn-secondary', className)} />
  ```

- Avoid inline `style` except for values that cannot be expressed as classes (for example, progress bar widths).
- Run `npm run format`; Prettier sorts Tailwind classes.

### Text and translations

- Do not hard-code user-facing strings. Add keys to `src/i18n/messages/en.json` and read them with `useTranslations` / `getTranslations`. See the [i18n guide](i18n.md).
- Shared components should take text as props (like `EmptyState`) instead of choosing it themselves, unless the text is part of the component's job (like `TransactionError`).

### Accessibility

- Use real elements: `<button>` for actions, `<a>`/`<Link>` for navigation. Never put `onClick` on a `<div>`.
- Every icon-only button needs an `aria-label`; decorative icons get `aria-hidden="true"`.
- Give interactive elements a visible focus style: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2`.
- Announce async results: `role="status"` / `aria-live="polite"` for loading and success, `role="alert"` for errors.
- External links open in a new tab only with `rel="noopener noreferrer"` and an `aria-label` noting "(opens in new tab)".
- Inputs need an associated `<label>` (use the `label` class) or an `aria-label`.
- Do not rely on color alone to show status; pair it with text or an icon.

## Before you build a new component

- [ ] Searched this page and `src/components/` for something that already does the job (or can with one new optional prop).
- [ ] Chose the right place: a feature folder, or the root only if two unrelated features need it.
- [ ] File and export are named in PascalCase, with a named export and a `<Component>Props` interface.
- [ ] `'use client'` is added only if the component needs it.
- [ ] Styling uses Tailwind, the shared classes in `globals.css`, and `cn()` for conditional classes.
- [ ] Addresses and hashes are rendered with `StellarLink`; empty lists with `EmptyState`; contract errors with `TransactionError`.
- [ ] All user-facing text comes from `src/i18n/messages/en.json`.
- [ ] Keyboard, focus, labels and live regions follow the accessibility rules above.
- [ ] If the component lives in the root, it has been added to the catalog on this page.
