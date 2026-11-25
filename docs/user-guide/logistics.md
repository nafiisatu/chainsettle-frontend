# Logistics guide

As the logistics provider you move the goods and record transport milestones, such as pickup, departure, customs clearance and delivery. Your proof is what tells the buyer the shipment has reached each stage.

Start with [connecting Freighter](README.md#before-you-start-connect-freighter). You only need XLM for transaction fees.

## Your on-chain actions

| Action | Contract call | When | What happens to funds |
|--------|---------------|------|-----------------------|
| Submit proof | `submit_proof` | A milestone is **Pending** and the shipment is **Active** | Nothing moves yet. The milestone waits for the buyer. |

Milestone payments go to the **supplier**, not to the logistics account. When the buyer confirms a milestone you submitted proof for (or the arbiter approves it after a dispute), that milestone's share is released from escrow to the supplier. Your own fee is agreed outside ChainSettle unless the supplier and logistics provider are the same account.

Both you and the supplier can submit proof for any pending milestone. Agree with the supplier in advance which milestones each of you covers, and use the discussion thread to coordinate.

## Find your shipments

Shipments that list your address appear in **Shipments** with the badge "Your role: Logistics". Open one to see the milestones and which ones are still **Pending**.

## Submit proof for a transport milestone

1. Open the shipment and find the **Pending** milestone that matches the stage reached (for example "Delivered to port").
2. Click **Submit proof**.
3. Provide the proof:
   - **Upload document**: a bill of lading, delivery receipt, customs release or a timestamped photo. Its hash is computed in your browser; the file is not put on the blockchain.
   - Or **Enter hash / CID**: paste the IPFS CID or hash of a document stored elsewhere.
4. Approve the transaction in Freighter.

The milestone becomes **Proof submitted** and the buyer is notified. Keep the original documents so they can be verified with **Verify a document**.

## If a milestone is disputed

Payment for that milestone is on hold until the arbiter decides. Add tracking details or documents to the discussion thread. If the arbiter rejects it, the milestone goes back to **Pending** and new proof can be submitted.

## Tips

- Submit proof as soon as each stage is reached; the buyer cannot confirm until you do.
- Use clear documents with dates and shipment references so the buyer can confirm quickly.
- The **Chain events** page lists every proof submission and payment, linked to Stellar Expert.
