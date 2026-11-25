# ChainSettle user guide

ChainSettle holds payment for a shipment in a Stellar escrow contract and releases it in stages, as milestones are completed. Every shipment has four parties, each with their own guide:

| Role | What you do | Guide |
|------|-------------|-------|
| **Buyer** | Create the shipment, lock the USDC, confirm or dispute each milestone, cancel if needed. | [Buyer guide](buyer.md) |
| **Supplier** | Submit proof that a milestone is done and receive the payment for it. | [Supplier guide](supplier.md) |
| **Logistics** | Submit proof for transport milestones (pickup, transit, delivery). | [Logistics guide](logistics.md) |
| **Arbiter** | Decide disputed milestones: release the payment or send the milestone back. | [Arbiter guide](arbiter.md) |

Your role is decided by your wallet address. When you open a shipment, the badge next to its title shows "Your role: Buyer", "Supplier", "Logistics" or "Arbiter". If your address is not on the shipment, you can view it but not act on it.

## Before you start: connect Freighter

ChainSettle has no passwords. You sign in and sign every action with the [Freighter](https://www.freighter.app/) browser wallet.

1. Install the Freighter extension and create or import an account.
2. In Freighter, open **Settings → Network** and select the network the app runs on. The badge in the top bar of ChainSettle shows it (**Testnet** or **Mainnet**). If the two do not match, transactions will fail.
3. Make sure the account exists on the network and holds a little XLM for transaction fees. On testnet, fund it for free with [Friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY). Testnet XLM and USDC have no value.
4. Buyers also need USDC in the same account (see the [buyer guide](buyer.md)).
5. Open ChainSettle and click **Connect Freighter Wallet**. Freighter asks you to share your address, then to **sign a sign-in message**. Signing this message does not send a transaction or move any funds; it only proves you own the address.
6. You land on your shipments list. Your session lasts a limited time; shortly before it ends, a dialog lets you **Stay signed in** (another message signature) or log out.

To sign out, use **Disconnect wallet** in the top bar, in **Settings**, or from the command palette (`Cmd/Ctrl+K`).

## How every action works

Each button that changes a shipment (create, submit proof, confirm, dispute, resolve, cancel) does the same thing:

1. ChainSettle builds a transaction and **simulates** it, so obvious errors (wrong role, wrong milestone status) show up before you sign.
2. Freighter opens and shows the transaction. Check it, then **Approve**. Clicking **Reject** cancels the action; nothing changes.
3. The transaction is sent to the Stellar network and ChainSettle waits for it to be confirmed (usually a few seconds).
4. The shipment page updates. Every transaction can be checked on [Stellar Expert](https://stellar.expert/) from the links on the page.

If confirmation takes too long, you will see a "still pending" notice with a link to the transaction. Do not repeat the action; check the link and refresh the page after a minute.

## What happens to the money

```
Buyer ──create_shipment──▶ Escrow contract (holds total USDC)
                               │
   milestone 1 confirmed ──────┼──▶ Supplier receives milestone 1 %
   milestone 2 confirmed ──────┼──▶ Supplier receives milestone 2 %
   ...                         │
   shipment cancelled ─────────┴──▶ Buyer receives what is left
```

- **Create:** the full shipment amount moves from the buyer's wallet into the escrow contract. Nobody, including ChainSettle, can move it except by the contract's rules.
- **Proof submitted:** no money moves. The milestone waits for the buyer.
- **Confirmed** (by the buyer) or **approved** (by the arbiter after a dispute): that milestone's percentage of the total is paid from escrow to the supplier.
- **Disputed:** no money moves. The milestone waits for the arbiter.
- **Rejected** by the arbiter: no money moves. The milestone goes back to **Pending** so proof can be submitted again.
- **Cancelled** (by the buyer): the remaining escrow balance (total minus everything already released) goes back to the buyer.
- When every milestone is paid, the shipment becomes **Completed**.

## Milestone statuses

| Status | Meaning | Who acts next |
|--------|---------|---------------|
| Pending | Waiting for proof. | Supplier or logistics |
| Proof submitted | Proof is on-chain, payment not released yet. | Buyer |
| Confirmed | Buyer accepted the proof; payment released. | — |
| Disputed | Buyer challenged the proof. | Arbiter |
| Resolved | Arbiter decided the dispute. | — |

## Screenshots

Screenshots for these guides are taken on **testnet** and stored in `docs/user-guide/images/`. When you add or update one:

- Use throwaway testnet accounts created for the screenshot, never your own or a customer's wallet.
- Use made-up shipment names, display names and comments. Do not show real company names, people, emails, documents or IPFS links to real files.
- Crop out browser bookmarks, other extensions and your desktop.
- Name the file after the page and step, for example `buyer-create-shipment.png`, and reference it from the guide with alt text describing the screen.

## Getting help

- **"Transaction rejected"**: you clicked Reject in Freighter. Try again and Approve.
- **The action button is missing**: check the role badge and the milestone status; only the role in the "Who acts next" column above sees the button.
- **Account not found / insufficient balance**: fund the account with XLM (and USDC for buyers) on the right network.
- **Wrong network**: switch Freighter to the network shown in the ChainSettle top bar.
