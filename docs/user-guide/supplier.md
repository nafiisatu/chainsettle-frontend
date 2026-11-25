# Supplier guide

As the supplier you deliver the goods and get paid milestone by milestone. The buyer has already locked the full amount in escrow when the shipment was created, so you can check the money is there before you start work.

Start with [connecting Freighter](README.md#before-you-start-connect-freighter). You only need XLM for transaction fees; you do not need USDC to start. To receive USDC, your account needs a **USDC trustline** (add the USDC asset in Freighter) before the first payment.

## Your on-chain actions

| Action | Contract call | When | What happens to funds |
|--------|---------------|------|-----------------------|
| Submit proof | `submit_proof` | A milestone is **Pending** and the shipment is **Active** | Nothing moves yet. The milestone waits for the buyer. |

Payments to you are triggered by other parties:

| Event | Who | What you receive |
|-------|-----|------------------|
| Buyer confirms your milestone (`confirm_milestone`) | Buyer | That milestone's percentage of the total, from escrow to your wallet. |
| Arbiter approves a disputed milestone (`resolve_dispute`, approve) | Arbiter | The same amount. |
| Arbiter rejects a disputed milestone (`resolve_dispute`, reject) | Arbiter | Nothing; the milestone goes back to **Pending** and you can submit new proof. |
| Buyer cancels the shipment (`cancel_shipment`) | Buyer | Nothing more. Payments you already received stay with you; the rest goes back to the buyer. |

## Check a new shipment

When a buyer creates a shipment with your address, it appears in your **Shipments** list with the badge "Your role: Supplier".

1. Open it and check the total amount, the milestones and their percentages.
2. Check the **Escrow balance** card: it should equal the total.
3. Use the creation transaction link to verify it on Stellar Expert if you want.

## Submit proof for a milestone

1. Open the shipment and find the **Pending** milestone you have completed.
2. Click **Submit proof**.
3. Choose how to provide it:
   - **Upload document**: drop the document (invoice, certificate, photo). ChainSettle computes its hash in your browser; the file itself is not uploaded to the blockchain.
   - **Enter hash / CID**: paste an IPFS CID or a hash of a document you have stored elsewhere.
4. Approve the transaction in Freighter.

The proof hash is recorded on-chain, the milestone becomes **Proof submitted**, and the buyer is notified. Keep the original file: the buyer or arbiter may ask for it and use **Verify a document** to check it matches the hash.

## If your milestone is disputed

The milestone shows **Disputed** and payment is on hold. Explain your side in the shipment's discussion thread and share any documents the arbiter asks for. If the arbiter rejects it, the milestone returns to **Pending**; fix the issue and submit proof again.

## Track payments

- The progress bar on the shipment shows how much has been released.
- Each confirmed milestone shows the amount paid and links to the transaction.
- **Chain events** shows every payment event for your shipments.
