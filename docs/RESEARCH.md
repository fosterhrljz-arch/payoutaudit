# Research and product decisions

Public primary-source product documentation reviewed before implementation, November 14, 2026 (America/Denver). No authenticated competitor accounts were accessed. Interaction analysis is based on documented screens and workflows, not hands-on account testing.

| Product | Observed workflow and interactions | Adopted in PayoutAudit |
|---|---|---|
| [Shopify Payments](https://help.shopify.com/en/manual/payments/shopify-payments/payouts) | Payout detail, transaction exports, fee and refund information; timing is distinct from sales activity. | Payout register, original record drill-down, explicit date-basis labels. |
| [Stripe payout reconciliation](https://docs.stripe.com/reports/payout-reconciliation) | Date-filtered balance/settlement summaries and itemized downloads; automatic payouts link to batches; instant payouts need separate allocation. | Exact payout-reference matching, summary-to-evidence navigation, CSV exports; no inferred manual allocation. |
| [A2X settlement posting](https://support.a2xaccounting.com/en/articles/6997538-step-by-step-guide-posting-your-a2x-summaries-to-quickbooks-online-xero-netsuite-or-sage) | Settlement list, click date to inspect invoice/accounts/taxes, review then post to accounting and match deposits. | Review before accepting imported data, settlement-level summaries. Accounting posting is outside V1. |
| [Link My Books payment gateways](https://help.linkmybooks.com/en/articles/6271569-shopify-payment-gateways) | Gateway-specific settlement and clearing-account flows; timing, missing fees, duplicate channel handling, and incomplete evidence explain apparent gaps. | Scope matches by platform/currency; explanatory evidence-gap states and practical next steps. |

## Opportunity (product inference)

A seller working from exports needs to answer “what happened, what supports this, and what should I do next?” without first configuring accounting software. This is a design opportunity inferred from the documented workflows, not a claim that the researched products lack discrepancy investigation features.

V1 prioritizes financial-impact sorting, plain-language possible causes, immutable original rows, investigation notes, and explicit uncertainty. Recognition is deterministic header aliasing with human confirmation; this is not a claim of an AI model or universal format recognition.

## Design system

Image-generated full overview concept guided the implementation. White surfaces on a cool near-white #f7f9f8 canvas, emerald #087f68 primary actions, mint active navigation, charcoal-green text, amber review signals. DM Sans with system fallback, 10px panel corners, thin borders, 224px desktop sidebar. Reusable table, metric, badge, modal, drawer, field, and filter components. Mobile collapses navigation and uses horizontally scrollable data tables.

The implementation uses derived sample totals rather than illustrative concept numbers. A settlement health ring counts payouts, while the flow separates payment activity from payout timing. A cash trend chart extends the shared design language to fulfill the requested trend analysis. No decorative photography or bitmap UI controls.
