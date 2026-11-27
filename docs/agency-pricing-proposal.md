# UmrahConnect Agency Pricing Proposal

_Draft for discussion · 2026-11-27_

## Summary

Charge agencies a monthly subscription plus paid "Featured" boosts, and take no commission on bookings for now. The platform never handles the customer's money, so we should charge for what we control: how many packages an agency can list, how visible those packages are, and the tools around them.

The prices below are starting points, not final decisions.

## Why not a commission yet

Today a quotation is only a seat request. The agency confirms it and collects payment off the platform, by bank transfer, cash or WhatsApp.

- **Commission or fee per confirmed seat:** agencies can decline the request on the platform and close the deal privately. It also penalises them for pressing "Confirm", the action we most want them to take.
- **Fee per quotation (per lead):** easier to enforce, but customers can send requests to several agencies at once. Agencies would argue about lead quality from day one.

A commission becomes fair and enforceable only once customer money passes through the platform (see Rollout).

## Proposed plans

Three tiers, priced in Pakistani rupees, with the free tier kept so new agencies can try the platform.

| Feature | Starter | Growth | Pro |
| --- | --- | --- | --- |
| Monthly price (PKR) | Free | 9,999 | 24,999 |
| Annual price (PKR, 2 months free) | Free | 99,990 | 249,990 |
| Live (published) packages | 2 | 15 | Unlimited |
| Quotation inbox | Yes | Yes | Yes |
| Basic stats (views, requests) | No | Yes | Yes |
| Featured credits included | None | None | 2 package-weeks per month |
| Staff logins | 1 | 3 | 10 |

Annual billing suits how agencies plan, season by season, and brings cash in up front.

## Featured boosts (add-on)

Any agency can pay PKR 2,000–3,000 per package per week to pin that package near the top of its departure-city results.

- Show a clear "Featured" label on boosted packages. Hidden pay-for-ranking would undermine the trust that agency verification builds.
- Charge about 1.5× during peak demand: Ramadan and the school holidays.
- Limit the number of featured slots per city so the label keeps its value.

## Do the numbers make sense?

An agency covers the Growth plan with about 2–3 confirmed pilgrims a month from the platform. The market figures below are approximate estimates, not sourced data, and should be checked with agencies.

| Figure | Estimate |
| --- | --- |
| Package price per person | PKR 250,000–600,000 |
| Agency margin per pilgrim | PKR 10,000–30,000 |
| Growth plan cost per pilgrim, at 10–20 pilgrims a month | PKR 500–1,000 |
| That cost as a share of package price | Under 1% |

## Rollout

Stay free until agencies see real demand, then switch on paid plans. A commission comes only if customers start paying deposits through the platform.

1. **Free launch (now):** Pro features free for every verified agency for about 3–6 months. This builds listings and quotation volume, and the quotation inbox becomes the proof of value.
2. **Founding offer (end of free period):** agencies that sign up early lock in a 50% discount (length to decide). Offering it just before paid plans start pushes agencies to commit early.
   - **Gate: demand proven** — the monthly quotation target is met.
3. **Paid plans:** Starter, Growth and Pro, plus Featured boosts, with manual invoicing.
   - **Gate: deposits live** — customers pay deposits through the platform.
4. **Commission (later, optional):** a 2–3% fee on customer deposits taken on the platform.

## Collecting payment

Start with manual invoices and automate later. Stripe doesn't support merchant accounts based in Pakistan.

1. Send each agency an invoice for its plan.
2. The agency pays by bank transfer, JazzCash or Easypaisa.
3. An admin records the payment in the admin panel, which turns on the plan until its end date.
4. Once volume justifies it, add a local payment gateway so agencies can pay and renew on their own.

## What it would take to build

The work is moderate and builds on the existing agency, package and admin features.

- **Agency plan:** a plan and an end date on each agency, defaulting to Starter.
- **Package limit:** block publishing past the plan's live-package limit, with a prompt to upgrade.
- **Featured packages:** a featured flag with an end date on each package, used in search ranking and shown as a label.
- **Admin tools:** a screen to set an agency's plan, record payments and grant featured weeks.
- **Staff logins:** several users per agency. This is the largest piece, because today each agency has one owner account.

## Open questions

- [ ] Are the margin and package-price estimates right? Ask 3–5 agencies.
- [ ] How long is the free launch period: a fixed 3–6 months, or until a target number of monthly quotations?
- [ ] What quotation volume counts as "proven demand" before we start charging?
- [ ] Founding-agency discount: 50% for life, or for the first year only?
- [ ] Should the free Starter tier allow 2 live packages, or fewer?
- [ ] Is multi-user staff access worth building for Pro, or should we drop it from the first version?
- [ ] Do we want to take customer deposits on the platform at some point, which would make a commission possible?
