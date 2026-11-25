# Arbiter guide

As the arbiter you are the neutral party named on a shipment. You only act when the buyer disputes a milestone, and your decision is final on-chain.

Start with [connecting Freighter](README.md#before-you-start-connect-freighter). You only need XLM for transaction fees.

## Your on-chain actions

| Action | Contract call | When | What happens to funds |
|--------|---------------|------|-----------------------|
| Approve milestone | `resolve_dispute` (approve) | A milestone is **Disputed** and the shipment is **Active** | That milestone's percentage of the total is paid from escrow to the supplier. |
| Reject milestone | `resolve_dispute` (reject) | A milestone is **Disputed** and the shipment is **Active** | Nothing moves. The milestone goes back to **Pending** and the money stays in escrow. |

You cannot create, confirm or cancel shipments, and you cannot submit proof.

## When you are needed

Shipments naming your address appear in **Shipments**. When a buyer raises a dispute, you get a notification and the milestone shows **Disputed**. An amber **arbiter panel** appears under it, visible only to you.

## Review a dispute

1. Open the shipment and read the arbiter panel. It shows the milestone, its payment percentage and the amount at stake in USDC.
2. Open the **proof** link, or use **Verify a document** on a file sent to you, to check the document matches the hash the supplier or logistics provider submitted.
3. Read the shipment's **discussion thread** for each party's explanation. Ask questions there so the record stays with the shipment.
4. Check the history in **Chain events** if you need to see when proof was submitted.

## Decide

- **Approve milestone** if the proof shows the milestone was completed. The panel asks you to confirm: "Approve this milestone and release $X USDC to the supplier?"
- **Reject milestone** if it was not. The milestone is reset to **Pending**; the supplier or logistics provider can submit new proof, and the buyer can confirm or dispute again.

After you confirm, Freighter opens; approve the transaction. Once it is confirmed the panel disappears and the milestone status updates for everyone. The decision cannot be undone, so post a short reason in the discussion thread.

## Good practice

- Stay neutral: do not act as buyer, supplier or logistics on a shipment you arbitrate.
- Decide on the evidence attached to the shipment, and note the reason in the thread.
- Decide promptly: while a milestone is disputed, the buyer cannot cancel and that payment is on hold.
