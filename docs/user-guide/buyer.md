# Buyer guide

As the buyer you pay for the shipment. You lock the money in escrow when you create the shipment, and you decide when each milestone is paid.

Start with [connecting Freighter](README.md#before-you-start-connect-freighter).

## Your on-chain actions

| Action | Contract call | When | What happens to funds |
|--------|---------------|------|-----------------------|
| Create shipment | `create_shipment` | Once, at the start | The total USDC moves from your wallet into escrow. |
| Confirm milestone | `confirm_milestone` | A milestone is **Proof submitted** | That milestone's share is paid from escrow to the supplier. |
| Raise dispute | `raise_dispute` | A milestone is **Proof submitted** and you do not accept the proof | Nothing moves; the arbiter decides. |
| Cancel shipment | `cancel_shipment` | Shipment is **Active** and no milestone is **Proof submitted** or **Disputed** | The remaining escrow balance comes back to you. |

Each action opens Freighter for you to sign.

## What you need

- XLM for transaction fees.
- USDC in the same Freighter account, at least the shipment total. On testnet, get test USDC (for example from Circle's testnet faucet) after adding a USDC trustline in Freighter; it has no value.
- The Stellar addresses (`G…`) of the supplier, the logistics provider and the arbiter. Agree on all four parties and the milestone split before you start; they cannot be changed after the shipment is created.

## Create a shipment

1. Go to **Shipments → New shipment**.
2. Optionally pick a saved template to prefill the form.
3. Enter the **supplier**, **logistics** and **arbiter** addresses. Each must be a valid Stellar address, and they should be different accounts.
4. Enter the **Total amount (USDC)**.
5. Add milestones (for example "Goods produced", "Shipped", "Delivered") and give each a payment percentage. The total must be exactly **100%**; the indicator under the list turns green when it is, and the create button stays disabled until then.
6. Review the summary. For large amounts you will be asked to confirm a second time.
7. Click create, then **Approve** the transaction in Freighter.

When the transaction is confirmed, the full amount is in escrow and the shipment shows as **Active**. Your unfinished form is saved in your browser, so you can come back to it. You can also **save the form as a template** for repeat shipments.

## Confirm a milestone

When the supplier or logistics provider submits proof, the milestone changes to **Proof submitted** and you get a notification.

1. Open the shipment and find the milestone.
2. Open the proof link to see the document, or use **Verify a document** to check that a file you received matches the hash on-chain.
3. If you accept it, click **Confirm receipt** and approve in Freighter.

The milestone's percentage of the total is paid to the supplier straight away and the progress bar updates. Confirming cannot be undone.

## Raise a dispute

If the proof is wrong or incomplete, click **Raise dispute** on that milestone instead of confirming it and approve in Freighter. The milestone becomes **Disputed** and no money moves. Use the shipment's discussion thread to explain the problem to the supplier and the arbiter. The arbiter will either release the payment or send the milestone back to **Pending**.

## Cancel a shipment

You can cancel an **Active** shipment as long as no milestone is waiting for a decision (**Proof submitted** or **Disputed**). Confirm or dispute those first.

1. Open the shipment and click **Cancel shipment**.
2. The dialog shows the refund: the total minus everything already paid.
3. Confirm and approve in Freighter.

The refund is sent back to your wallet and the shipment becomes **Cancelled**. Milestones already paid to the supplier are not reversed.

## Follow your shipments

- The **Shipments** list has tabs for All, Active, Completed and Cancelled, and a search box for shipment IDs and addresses.
- **Chain events** lists every contract event for your shipments, each linked to Stellar Expert.
- The **Escrow balance** card on a shipment shows how much is still held in the contract.
