# Deployment guide

This guide covers deploying the ChainSettle frontend to Vercel or to your own Node.js server, the environment variables it needs, its security headers and Content Security Policy (CSP), and a checklist for switching to mainnet.

## How configuration works

All configuration is through `NEXT_PUBLIC_*` environment variables. Two things follow from that:

- **They are inlined into the browser bundle at build time.** Changing a variable means **rebuilding and redeploying**, not just restarting. Never put a secret in a `NEXT_PUBLIC_*` variable; everything in them is public.
- **They are validated twice.** `next.config.js` checks them when `next build` or `next dev` starts and stops with a readable error if one is missing or malformed. `src/lib/env.ts` checks them again at runtime. A build that fails with `Invalid environment configuration` lists each problem.

`src/middleware.ts` also reads the same variables on every request to build the CSP, so they must be set in the **runtime** environment of the server too (on Vercel this happens automatically).

## Environment variables

| Variable | Required | Network-specific | Validation | Default |
|----------|----------|------------------|------------|---------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | Yes | `testnet` or `mainnet` | `testnet` |
| `NEXT_PUBLIC_CONTRACT_ID` | **Yes** | Yes | 56 characters, starts with `C` | — |
| `NEXT_PUBLIC_USDC_ADDRESS` | **Yes** | Yes | 56 characters, starts with `C` (the USDC Stellar Asset Contract) | — |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | **Yes** | Yes | `http(s)` URL | — |
| `NEXT_PUBLIC_HORIZON_URL` | No | Yes | `http(s)` URL | `https://horizon.stellar.org` on mainnet, `https://horizon-testnet.stellar.org` on testnet |
| `NEXT_PUBLIC_API_URL` | No | Per environment | `http(s)` URL | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_IPFS_GATEWAY` | No | No | `https` URL only | `https://ipfs.io/ipfs/` |

`NEXT_PUBLIC_STELLAR_NETWORK` also selects:

- the network passphrase used to build and sign transactions and the sign-in message (`Networks.PUBLIC` or `Networks.TESTNET`),
- the Stellar Expert explorer used by every address and transaction link (`/explorer/public` or `/explorer/testnet`),
- the network badge in the top bar (**Mainnet** or **Testnet**).

Always set it explicitly in production, even for testnet, so a missing variable can never silently point a mainnet contract at testnet settings.

See [`.env.example`](../.env.example) for sample values.

## Deploying to Vercel

1. Import the repository in Vercel. The framework preset is detected as **Next.js**; keep the default build command (`next build`) and output settings.
2. Under **Settings → Environment Variables**, add every variable from the table above for each environment (Production, Preview, Development). Use testnet values for Preview deployments so pull request previews never touch mainnet funds.
3. Set the Node.js version to **20.x** or later.
4. Deploy. If the build fails at the start with `Invalid environment configuration`, fix the listed variables and redeploy.
5. Add your custom domain and let Vercel issue the TLS certificate. The `Strict-Transport-Security` header is only sent in production builds, so make sure the domain is HTTPS-only before going live.
6. After changing any variable, trigger a **new deployment** (Redeploy without the build cache if unsure); existing deployments keep the values they were built with.

## Deploying to a Node.js server

Requirements: Node.js 20+, and a reverse proxy (nginx, Caddy, a load balancer) that terminates TLS.

```bash
npm ci
# Export the variables, or write them to .env.production.local on the build machine
export NEXT_PUBLIC_STELLAR_NETWORK=mainnet
export NEXT_PUBLIC_CONTRACT_ID=C...
export NEXT_PUBLIC_USDC_ADDRESS=C...
export NEXT_PUBLIC_STELLAR_RPC_URL=https://...
export NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
export NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
npm run build
NODE_ENV=production npm run start -- -p 3000
```

- Build with the same variables you run with. The browser bundle uses the build-time values; the middleware (CSP) uses the runtime values. If they differ, the CSP can block the app's own RPC or API calls.
- Run `next start` under a process manager (systemd, pm2) or in a container, and proxy HTTPS traffic to it.
- The proxy must pass the response headers from Next.js through unchanged, in particular `Content-Security-Policy`. Do not add a second, different CSP at the proxy.
- Serve only over HTTPS and redirect HTTP to HTTPS.
- The backend (`chainsetttle-backend`) must allow the frontend's origin in its CORS settings.

## Security headers and CSP

### Static headers (`next.config.js`)

Sent on every route:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (production builds only) |

### Content Security Policy (`src/middleware.ts`)

The middleware creates a random nonce per request and sends this policy:

```
default-src 'self';
script-src 'self' 'nonce-<random>';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' <API origin> <RPC origin> <Horizon origin>;
img-src 'self' data: <IPFS gateway origin>;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none'
```

The origins in `connect-src` and `img-src` are **derived from the environment variables**:

| Directive | Source variable |
|-----------|-----------------|
| `connect-src` | origins of `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STELLAR_RPC_URL` and `NEXT_PUBLIC_HORIZON_URL` (or its network default) |
| `img-src` | origin of `NEXT_PUBLIC_IPFS_GATEWAY` (or `https://ipfs.io`) |

### When you need to change the CSP

- **Custom RPC provider, Horizon server or backend:** set the variable. Its origin is added to `connect-src` automatically. No code change is needed.
- **Custom IPFS gateway:** set `NEXT_PUBLIC_IPFS_GATEWAY` (must be `https`). Its origin is added to `img-src` automatically. Proof links open the gateway in a new tab, which is not restricted by the CSP; `img-src` only matters for images rendered inside the page.
- **More than one host for the same purpose** (for example, a fallback RPC, or an RPC that redirects to another host): only the configured origin is allowed. Add the extra origin to the right directive in `createCsp()` in `src/middleware.ts`, ideally from a new environment variable, and document why it is needed.
- **A new external service** (analytics, error reporting, a font or image CDN): add only its origin, only to the narrowest directive it needs (`connect-src` for API calls, `img-src` for images, `font-src`/`style-src` for fonts and styles).
- **Never** add `'unsafe-inline'` or `'unsafe-eval'` to `script-src`, use wildcards such as `https:` or `*`, or broaden `default-src`.

A blocked request appears in the browser console as `Refused to connect to ... because it violates the following Content Security Policy directive`. The URL in that message tells you which origin and directive to fix.

Freighter runs as a browser extension and signs transactions outside the page, so it does not need a CSP entry.

## Mainnet go-live checklist

Work through this on a staging deployment that uses mainnet settings before switching the production domain. Every network-specific variable is listed.

**Contract and assets**

- [ ] `NEXT_PUBLIC_STELLAR_NETWORK=mainnet` is set explicitly.
- [ ] `NEXT_PUBLIC_CONTRACT_ID` is the **mainnet** deployment of the ChainSettle contract, built from the audited release, and matches the ID the backend's event poller watches.
- [ ] The contract is initialized on mainnet (admin, accepted token) as required by `chainsetttle-contract`.
- [ ] `NEXT_PUBLIC_USDC_ADDRESS` is the **mainnet** USDC Stellar Asset Contract (`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`, issued by Circle). Verify it on [Stellar Expert](https://stellar.expert/explorer/public) before use; do not copy it from an untrusted source.
- [ ] The contract's accepted token matches `NEXT_PUBLIC_USDC_ADDRESS`.

**Network endpoints**

- [ ] `NEXT_PUBLIC_STELLAR_RPC_URL` points to a **mainnet** Soroban RPC provider (there is no public SDF mainnet RPC; use a provider with an SLA, or your own node). It uses HTTPS.
- [ ] `NEXT_PUBLIC_HORIZON_URL` is unset (defaults to `https://horizon.stellar.org`) or points to a mainnet Horizon you trust. It must not be the testnet Horizon.
- [ ] RPC and Horizon are on the same network: a request to each returns the passphrase `Public Global Stellar Network ; September 2015`.

**Backend and other services**

- [ ] `NEXT_PUBLIC_API_URL` points to the **production** backend over HTTPS, and that backend is configured for mainnet with the same contract ID.
- [ ] The backend's CORS settings allow the production frontend origin.
- [ ] `NEXT_PUBLIC_IPFS_GATEWAY` is set to the gateway you want users to rely on (HTTPS), or left at the default.

**Security**

- [ ] Any extra hosts (fallback RPC, analytics) have been added to the CSP as described above, and nothing else.
- [ ] The domain is HTTPS-only and `Strict-Transport-Security` is present.
- [ ] Preview and staging deployments still use testnet values.

**User-facing**

- [ ] The top bar badge reads **Mainnet**.
- [ ] Stellar Expert links open `/explorer/public/...`.
- [ ] Support and user guide text no longer mentions Friendbot or test funds for production users.

## Verifying a deployment

Run these checks after every deployment, and all of them before mainnet launch.

1. **Build output.** The build log has no `Invalid environment configuration` error.
2. **Headers.** Check the response headers:

   ```bash
   curl -sI https://app.example.com/auth/login
   ```

   Confirm `Content-Security-Policy` is present and its `connect-src` lists your API, RPC and Horizon origins and its `img-src` lists your IPFS gateway; confirm `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `Permissions-Policy`; and, in production, `Strict-Transport-Security`. Reload once more and confirm the nonce in `script-src` changes on every request.
3. **Auth redirect.** Opening `/dashboard/shipments` without signing in redirects to `/auth/login?callbackUrl=...`.
4. **Console.** Open the login page with DevTools. There are no CSP violation errors in the console.
5. **Network.** The top bar badge shows the expected network. Set Freighter to the same network, connect, and sign in. The sign-in signature succeeds and you land on the dashboard.
6. **Reads.** Open an existing shipment. Its data loads from the API, the **Escrow balance** card loads from the RPC, and the wallet balance on **Settings** loads from Horizon. Each one exercises a different `connect-src` origin.
7. **Links.** An address or transaction link opens Stellar Expert on the right network and shows the expected contract or account.
8. **Write (testnet / staging).** Create a small shipment, submit proof, and confirm a milestone end to end, checking each transaction on Stellar Expert. On mainnet, do this once with a minimal amount between accounts you control before announcing the launch.
9. **Contract ID.** On Stellar Expert, the contract called by your test transaction is `NEXT_PUBLIC_CONTRACT_ID`, and the token moved is `NEXT_PUBLIC_USDC_ADDRESS`.

## Rollback

On Vercel, promote the previous deployment from the **Deployments** tab. On a Node.js server, keep the previous build directory (`.next`) and restart with it. Because configuration is baked in at build time, rolling back also restores the previous environment values; check that is what you want if the incident was caused by a variable change.
