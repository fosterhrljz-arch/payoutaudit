# PayoutAudit workflow redesign

Public primary documentation reviewed before implementation. No competitor accounts accessed.

- [Stripe](https://docs.stripe.com/reports/payout-reconciliation): distinct balance summaries, payout batches and itemized records. Adopted scoped reports and drill-down into the same batch.
- [Shopify](https://help.shopify.com/en/manual/payments/shopify-payments/payouts/view-details): payout lists, status/date filters, fees and export scopes. Adopted payout register and distinction between payout records and bank receipt.
- [QuickBooks](https://quickbooks.intuit.com/learn-support/en-global/help-article/reconciliation-reports/learn-reconcile-workflow-quickbooks/L8ZibUuVE_ROW_en): upload, compare, investigate differences and retain reconciliation history. Adopted guided import, dedicated investigation and activity trail. Bank statement matching remains outside scope.
- [A2X](https://support.a2xaccounting.com/en/articles/4301104-how-do-i-get-started-with-a2x-for-walmart-step-5-send-your-first-a2x-invoice-or-journal): settlement review and expanded detail before accounting handoff. Adopted focused settlement detail with supporting records and related issues.

## Architecture

Overview → Data imports → Reconciliation → Discrepancies → Reports. Transactions is the evidence register. Settings and Help are secondary. Hash routes support refresh, browser history and filter context. The overview answers what needs attention, reconciliation owns payout math, discrepancies owns investigation and resolution, reports owns filtered summaries and exports.

## Visual specification

Primary overview and investigation concepts generated before coding. White canvas; #f7f8fa sidebar; #182230 text; #635bff actions; #e5e7ec borders; emerald matched/resolved and amber review states. Readable 13–14px controls, 28px titles and 28–30px metrics. Unified metric rails, compact tables, actual-value charts, full-page investigation and original-record drawers. Illustrative concept numbers, quotas and platforms are replaced by real derived values. Business selector opens editable workspace settings.

## Usability work

Contextual exports; dedicated reports; explicit import completion; column sample preview; evidence-first investigation; required resolution reasons; preserved existing local storage; reopen resolved cases when evidence changes; pagination; keyboard and mobile navigation; explicit unknown expected amounts; no fabricated chart values.
