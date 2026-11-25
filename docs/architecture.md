# Architecture

How the ChainSettle frontend is put together: stack, folder layout, key user flows, internationalization and security headers.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Framework with server and client components |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Lightweight global state (auth, wallet) |
| **@stellar/freighter-api** | Connect to Freighter wallet, sign transactions |
| **@stellar/stellar-sdk** | Build Soroban transactions, interact with RPC |
| **Axios** | HTTP client for backend API calls |
| **date-fns** | Date formatting |
| **lucide-react** | Icon set |

## Project Structure

```
chainsettle-frontend/
├── .env.example                        ← copy to .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
│
└── src/
    ├── middleware.ts                   ← Auth-protect dashboard routes
    │
    ├── app/
    │   ├── layout.tsx                  ← Root layout with metadata and providers
    │   ├── page.tsx                    ← Redirect to /dashboard/shipments
    │   ├── providers.tsx               ← Zustand rehydration wrapper
    │   │
    │   ├── auth/
    │   │   └── login/
    │   │       └── page.tsx            ← Freighter connect + Stellar login page
    │   │
    │   ├── dashboard/
    │   │   ├── layout.tsx              ← Sidebar + top bar wrapper
    │   │   └── shipments/
    │   │       ├── page.tsx            ← Shipments list with tabs + search
    │   │       ├── create/
    │   │       │   └── page.tsx        ← Create shipment form + milestone validation
    │   │       └── [id]/
    │   │           └── page.tsx        ← Shipment detail and milestone timeline
    │   │
    │   └── notifications/
    │       └── page.tsx                ← Notification feed
    │
    ├── components/
    │   ├── StellarLink.tsx             ← Stellar Expert address/tx links
    │   ├── layout/
    │   │   ├── Sidebar.tsx             ← Navigation sidebar
    │   │   └── TopBar.tsx              ← Header with wallet actions
    │   ├── shipments/
    │   │   ├── ShipmentCard.tsx        ← List card UI for shipments
    │   │   ├── ShipmentProgress.tsx    ← Progress bar and totals
    │   │   ├── ShipmentMeta.tsx        ← Shipment metadata details
    │   │   └── ShipmentCardSkeleton.tsx← Loading skeletons
    │   └── milestones/
    │       ├── MilestoneTimeline.tsx   ← Milestone action timeline
    │       └── ArbiterPanel.tsx       ← Dispute resolution UI
    │
    ├── lib/
    │   ├── stellar/
    │   │   ├── freighter.ts            ← Freighter wallet wrappers
    │   │   └── contract.ts             ← Soroban transaction builders
    │   ├── api/
    │   │   ├── client.ts               ← Axios client with auth interceptor
    │   │   └── services.ts             ← Backend API wrappers
    │   ├── hooks/
    │   │   └── use-auth-store.ts       ← Zustand auth store
    │   └── utils/
    │       └── index.ts                ← Formatting and helpers
    │
    ├── types/
    │   └── index.ts                    ← Shared TypeScript types
    │
    └── styles/
        └── globals.css                 ← Tailwind setup and custom styles
```

## Internationalization

The frontend uses `next-intl` with English as the default locale. Translation messages live in `src/i18n/messages/en.json`, and supported locales are declared in `src/i18n/config.ts`.

To add a locale:

1. Copy `src/i18n/messages/en.json` to a new file such as `src/i18n/messages/fr.json` and translate its values.
2. Add the locale code to the `locales` array in `src/i18n/config.ts`.
3. Load the new message bundle in `src/app/providers.tsx` and pass the selected locale and messages to `NextIntlClientProvider`.
4. Keep translation keys stable across locale files so components can use the same `useTranslations` calls.

## Content Security Policy

Security headers are configured in `next.config.js`; middleware creates a per-request nonce and attaches the CSP to application responses. `script-src` permits only same-origin scripts and scripts carrying that nonce, so inline event handlers and `javascript:` URLs remain blocked. `style-src` allows inline style attributes because progress indicators use them, and permits the Google Fonts stylesheet and font hosts currently imported by `src/styles/globals.css`.

When adding an external browser service, add only its origin to the narrowest required CSP directive in `src/middleware.ts` (for example, API/RPC calls to `connect-src`, images to `img-src`, or styles/fonts to their respective directives). Prefer an environment-configured origin when it varies by deployment, and document why it is required. Do not add `'unsafe-inline'` to `script-src` or broaden `default-src` to accommodate a service.

## Key Flows

### Authentication (Sign-In With Stellar)

1. User clicks connect.
2. Freighter returns the public Stellar address.
3. Frontend requests a nonce from `/auth/nonce`.
4. User signs the nonce in Freighter.
5. Frontend sends the signed payload to `/auth/login`.
6. Backend returns a JWT and user profile.
7. Frontend stores auth state and redirects to the dashboard.

### Shipment creation

1. User enters buyer/supplier/logistics/arbiter addresses.
2. User defines milestones and payment percentages.
3. The UI validates that the milestone total equals `100%`.
4. The user signs a Soroban transaction through Freighter.
5. The transaction is published to Stellar.
6. After confirmation, the shipment is stored in the backend.

### Shipment filtering and verification

- Shipment list supports text search and status tabs.
- Status selection persists in the browser URL.
- Shipment metadata includes Stellar Expert links for both accounts and tx hashes.
- Users can verify chain state without manual lookup.
