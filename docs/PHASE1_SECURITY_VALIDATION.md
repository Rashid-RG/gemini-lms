# Phase 1 security verification and rollout checklist

## Scope
This branch addresses PayHere payment ownership, signed callback validation, one-time credit settlement, database diagnostics authorization, and disables the manual payment-credit endpoint outside development. No production data is changed by these commits.

## Must-pass checks before any deployment
1. Run `npm ci && npm test`, and run `npm run build` in an isolated environment with non-production credentials.
2. Verify signed-out requests to `POST /api/payments/payhere/initiate` return 401 and super-admin diagnostics reject anonymous, tutor, and admin roles.
3. In PayHere **sandbox**, initiate a genuine purchase from an authenticated student. Confirm a pending `paymentRecord` exists before checkout.
4. Deliver a signed success IPN and verify exactly one completed record, exactly one new credit transaction, and the expected credit balance.
5. Replay the same signed IPN, including concurrently, and verify **zero extra credits** or audit records.
6. Attempt mismatched amount, currency, user email, plan, merchant ID, signature, or order ID; verify no credits are granted.
7. Test signed canceled and failed notifications; they must not grant credits. Reconcile pending entries separately.
8. Verify customer payment history and confirmation email behavior; ensure a failed email does not cause a second award.
9. Verify the manual verification route rejects requests in staging and production, even if a setup key is provided.
10. Test pre-existing payment records and reconciliation against PayHere records before enabling the new callback.

## Operational caveats
- Current settlement uses one PostgreSQL data-modifying CTE, which atomically claims only a **single matching pending order** and updates credits and the credit audit trail together. Existing historical payments without a pending order are deliberately not auto-credited.
- No database migration is required for the new code paths; unique order IDs are generated with UUIDs. Before a wider release, separately audit historical duplicates and add a unique partial payment-order constraint in a reviewed migration.
- `/api/payments/verify` is intentionally limited to development; do not use it for real payments. Replace manual adjustments with an audited, role-restricted reconciliation workflow.
- For stronger long-term accounting, adopt a ledger-based credit model, gateway-payment-ID uniqueness, webhook reconciliation jobs, and refund/chargeback handling.
- Do not apply schema changes, run destructive scripts, or point test environments at production Neon data.

## Cancellation / refunds safety gate (additional Phase 1 review)
A source audit found that the old subscription cancellation endpoint trusted a caller-supplied email, marked payments as refunded without gateway confirmation, and changed credits immediately. The legacy admin payments API could also grant credits or mark payments refunded without proving a payment/refund on PayHere.

Until a verified gateway workflow is integrated:
- Customer cancellation requires Clerk identity and returns a clear **manual review required** response. It does NOT terminate membership or issue a refund.
- The subscription cancellation UI must not promise automatic refunds; it sends students to support.
- Manual admin POST/PUT payment mutation is deliberately blocked, even for super-admins, and is NOT suitable for commercial release until a reviewed refund/adjustment workflow is implemented.
- Super-admin read-only anomaly review: `GET /api/admin/payments/reconciliation` reports duplicate PayHere order IDs, duplicate gateway transaction IDs, pending orders older than 24 hours and completed records missing a gateway ID. Entries are bounded at 50 per category and are indicators for investigation, not gateway proof.
- Do not change status to `refunded` or reverse entitlements unless gateway refund completion is independently verified and the credit ledger is reconciled.
- Build a support-mediated cancellation request queue and an authenticated gateway refund/chargeback reconciliation worker before permitting automated settlement.
- Because PayHere callbacks can be replayed concurrently, verify behavior against actual isolated PostgreSQL. Source-level regression tests alone are insufficient.


## Payment listing and support-ticket follow-up
- The administrator payment listing now rejects unsupported filters and limits each page to 1–100 records with offsets up to 10,000; this prevents unbounded list retrieval, but analytics currently still scan all completed payments and need a future database-aggregation refactor.
- Cancellation review tickets reuse an existing open ticket when available. **Concurrent new requests can still create duplicate tickets** until a carefully reviewed partial unique index or transactional serialization is introduced; do not claim strict deduplication.
- The cancellation UI intentionally does not describe a support request as an executed refund. Staff must verify gateway records before changing balances or entitlements.
- Read-only reconciliation reports sample up to 50 entries per anomaly type; the response is not a complete ledger audit.
