# Credits and payments (Lemon Squeezy) - design

Status: draft for the owner's approval. Date: 2026-11-11.
Calls I made without the owner are marked **[my call]**. Items to verify before launch are marked **[verify]**.

## Intent

Photographers pay per event. One credit buys one event. Credits are sold in packs through Lemon Squeezy (merchant of record, so it handles VAT and the card payment). Every Google account gets one free credit, so a photographer can try a real event before paying.

Why credits and not a subscription: photographers earn per job, usage is uneven across the year, bundles reward repeat buyers, and the build is small (one-time products and one webhook).

## Goals

- A photographer buys a pack, sees the credits on the dashboard, and spends one by creating an event.
- An event stays online for a fixed time from creation (30 days for the free credit, 90 for a purchased one), with fixed photo limits (300 and 3,000), then expires.
- The webhook is safe: signed, repeat-proof, and unable to credit the wrong account silently.
- The dashboard shows the Romanian legal links and the company identity.

## Non-goals (v1)

- Subscriptions (a Pro plan can later grant credits monthly).
- Paid extensions of the 90 days. **[my call]** Left out to keep three products; the owner may add a 4th product later.
- Invoices and VAT logic: Lemon Squeezy is the merchant of record and issues the receipt.
- Email reminders before expiry (an in-app banner only; there is no email sending in the app yet).
- Anti-abuse beyond "one free credit per Google account".

## Anti-goals

- A credit must never be lost or double-spent because of a repeated webhook, a double click, or a refresh.
- A webhook must never be accepted without a valid signature.
- Customers must not be able to get paid features by editing a checkout link in a way that costs someone else.

## The three packs  **[my call, owner to confirm]**

| Pack | Price (before VAT) | Per event |
|---|---|---|
| 1 credit | EUR 19 | 19 |
| 5 credits | EUR 85 | 17 |
| 10 credits | EUR 150 | 15 |

Lemon Squeezy takes about 5% + EUR 0.50 per sale **[verify the current fee]**. At the 10-pack that is about EUR 8 per pack, so a 10-pack still leaves about EUR 14 per event after storage (about EUR 1.50 per event for 90 days). If the owner prefers prices that already include VAT, set them in Lemon Squeezy so the shown price is the final one.

## What a credit includes (decided by the owner)

There are two kinds of credit, and the kind decides the event's limits:

| | Free credit (trial event) | Purchased credit (full event) |
|---|---|---|
| Photos (camera and guest photos together) | **300** | **3,000** |
| Online for | **30 days** | **90 days** |
| Cameras | **1** | no limit |
| Storage safety cap **[my call]** | 4 GB | 40 GB |
| Features | per the free/unlocked table below | per the free/unlocked table below |

- The photo limit is the real limit. The storage cap only stops a few huge files from using a whole event's budget (3,000 camera JPEGs of about 10 MB is about 30 GB).
- The limits are stored on the event when it is created (`max_photos`, `max_bytes`, `expires_at`), so changing the numbers later does not change events that already exist.
- **Which credit is spent:** creating an event spends a purchased credit if the account has one, otherwise the free credit. So a customer who just bought a pack never gets a trial-sized event by accident. The free credit is kept for accounts that have nothing else.
- A trial event can have only **one camera** (owner's rule). Adding a second answers 403 "Trial events support 1 camera. Buy a pack to create full events with more cameras." and the dashboard shows the same text next to a disabled "Add camera" button with a "Buy credits" button.
- **Credits are always visible:** the signed-in header of every dashboard page shows the balance ("3 credits") and a "Buy credits" button, not only the events list.
- A trial event cannot be upgraded to a full event in v1 (a possible later feature).

## Rules

- **Free credit:** one per Google account, granted the first time the account signs in to the backend (when the profile is created). Only for tokens with a verified email. Ledger entry reason `welcome`, reference `welcome:<sub>`, unique, so it can never be granted twice. Someone with many Google accounts can get many free credits; accepted for v1.
- **Spending:** creating an event costs 1 credit. With 0 credits the API answers 402 and the dashboard shows the buy dialog. The check and the spend happen in one transaction, serialized per account (`pg_advisory_xact_lock(hashtext(owner_sub))`), so a double click cannot spend twice or go negative.
- **Confirmation before spending (owner's rule):** the user must confirm before a credit is used. The create-event dialog ends with a confirmation step that says, in plain words: "This uses 1 credit (you have N)", which kind of event it is (full or trial) and its limits, the event date, and the date the gallery stays online until (today + 90 or 30 days). It says that the date the gallery stays online until is fixed once the credit is used, and that changing the event date later does not move it **[my reading of "the date can change"; the owner to confirm]**. The button reads "Use 1 credit and create event". The server also requires `confirmed: true` in the request and answers 400 without it, so no client can spend a credit by accident.
- **If creating the event fails after the spend,** the transaction rolls back, so the credit is not lost.
- **Credit validity:** credits do not expire in v1 **[my call; simplest, and avoids consumer-law questions about expiring prepaid credit; revisit with a lawyer]**.
- **Existing events (owner's rule):** events created before launch keep working for **30 days after launch** with full features, then `expires_at = purge_after = launch date + 30 days`: the gallery closes and the batch job deletes the images, keeping only the details. They count as full events (3,000 photos); one with more photos keeps them but accepts no new ones. The dashboard shows a banner from launch so photographers can download what they need.
- **Expiry and deletion:** at `expires_at` (30 days for a trial event, 90 for a full one) the public gallery stops showing photos (HTTP 410) and the dashboard shows "Expired". A scheduled **batch job** (daily) deletes the images of every event whose `purge_after` has passed. For a new event `purge_after = expires_at + 14 days` (grace period, **my call**). For events that existed at launch `purge_after = launch date + 30 days` (the owner's rule, no extra grace). The job deletes the photos in R2 (originals and small copies), the guests' photos and guest records (they hold names, so no reason to keep them), and the cameras' SFTPGo users and camera rows. **Only the details stay:** the event row (name, date, icon, address), now marked `purged_at`; the dashboard shows "Photos deleted on <date>". The photographer sees "X days left" on each event and a banner at 14 days left (7 days for a trial event).
- **Camera access at expiry:** the SFTPGo users of an expired event are disabled or deleted at expiry, so cameras cannot keep filling storage.
- **Limits:** guest uploads are refused above the event's photo/size limit (the backend counts them), with a clear message. Camera uploads: set the SFTPGo user quota fields when creating the camera **[verify the exact field names `quota_size` and `quota_files` and that quotas work with the R2 (S3) provider]**; if they do not, count objects in a scheduled job and disable the camera when over the limit.
- **Refunds:** a refund made in Lemon Squeezy arrives as `order_refunded`. The ledger gets a negative entry for the credits of that order. If some were already spent the balance can go negative; a negative balance blocks creating new events but does not touch existing ones. **[my call]**

## Free account vs unlocked account  **[owner's idea; the split below is my call]**

An account is **unlocked** once it has bought at least one pack. An account that only used its free credit is **free**. The free credit gives a complete first event so the photographer can see the product, but the personal touches are for paying customers.

| Feature | Free account | Unlocked account |
|---|---|---|
| Create events with a credit, cameras, QR code, public gallery, guest uploads, plain download | yes | yes |
| Profile personalization: brand look, frames, social button colour, tags | locked (default look) | yes |
| Photographer logo (upload and stamping on downloads) | locked | yes |
| Photo editor for guests (crop, looks, brightness/contrast, "Edit and download") | locked; "Download" only | yes |

Rules:
- **Derived, not stored:** `unlocked` is true when the ledger has a `purchase` entry for the account that has no matching `refund` entry. A fully refunded purchase locks the account again. No separate flag to keep in sync.
- **Nothing is deleted when locked.** Saved profile settings and the logo stay in the database and come back when the account unlocks. While locked they are simply not shown to guests and not editable.
- **The gate is on the event owner,** because guests are the ones who see the editor. The public gallery payload gains `features: { personalized, editor, logo }`, computed from the owner's state. When `editor` is false the viewer shows only "Download" (no "Edit and download"); when `logo` is false camera photos are downloaded without the stamp and the viewer does not draw the logo overlay.
- **The server enforces it,** not only the UI: the profile save and logo upload endpoints answer 403 `locked` for a free account. The dashboard shows locked tabs with a short "Buy any pack to unlock" explanation and the buy button.
- **Timing:** unlocking happens when the webhook is processed (a few seconds after payment); the dashboard polls as described below.
- **Existing accounts at launch:** they keep what they already use for 30 days, then are treated as free unless they have bought a pack **[my call, to avoid breaking current users abruptly; the owner may prefer to unlock all current accounts]**.

## Data model (Flyway V18)

```
credit_ledger(
  id uuid pk,
  owner_sub text not null,
  delta int not null,            -- +N purchase/welcome, -1 event, -N refund
  kind text not null,            -- 'trial' (free credit) | 'full' (purchased credit)
  reason text not null,          -- welcome | purchase | event | refund
  ref text unique,               -- 'welcome:<sub>' | 'ls-order:<orderId>' | 'ls-refund:<orderId>'; null for events
  event_id uuid null,
  created_at timestamptz not null default now()
)
events add columns plan text,               -- 'trial' | 'full'
                   max_photos int, max_bytes bigint,
                   expires_at timestamptz,  -- set at creation = now() + 30 or 90 days
                   purge_after timestamptz, -- when the batch job deletes the images (expires_at + 14 days; launch + 30 days for old events)
                   purged_at timestamptz;   -- set by the batch job; the event row stays, the images are gone
payment_events(                              -- every webhook received, for support
  id uuid pk, order_id text, event_name text, outcome text, payload jsonb, received_at timestamptz default now())
```

Balance is `sum(delta)` for the owner. `ref` unique makes the webhook idempotent: a repeat delivery inserts nothing.

## API

- `GET /api/v1/credits` -> `{ balance, unlocked, history[] }`.
- `ProfileDto` gains `unlocked`; `PUT /profile` and `POST/DELETE /profile/logo` answer 403 `locked` for a free account.
- The public gallery payload gains `features { personalized, editor, logo }` (see above).
- `GET /api/v1/credits/checkout?pack=1|5|10` -> `{ url }` Lemon Squeezy checkout link for the pack's variant, with the account email prefilled and the account id in custom data. Variant ids stay in server config.
- `POST /api/v1/events` -> now spends one credit; 402 with a clear message at zero.
- `POST /api/v1/webhooks/lemonsqueezy` -> public (`permitAll`), described below.

Checkout link form: `https://<STORE>.lemonsqueezy.com/checkout/buy/<VARIANT_ID>?checkout[email]=<email>&checkout[custom][owner_sub]=<sub>`. A user who edits `owner_sub` can only buy credits for another account at their own cost, which is harmless.

## Webhook handler

Per the Lemon Squeezy docs: requests are `POST` with headers `X-Event-Name` and `X-Signature`; the signature is the **HMAC-SHA256 hex digest of the raw request body** with the signing secret; only HTTP 200 counts as success; failed deliveries are retried 3 more times (about 5 s, 25 s, 125 s) and then dropped, but can be resent from the dashboard.

1. Read the body as raw bytes. Compute HMAC-SHA256 with `LEMONSQUEEZY_WEBHOOK_SECRET`, compare with `X-Signature` in constant time (check lengths first). Bad signature: 401, nothing stored.
2. Parse JSON after verification. Store a row in `payment_events`.
3. `order_created`: require `data.attributes.status == "paid"` and `data.attributes.store_id` equal to the configured store. Map `first_order_item.variant_id` to credits (1/5/10); an unknown variant is stored with outcome `unknown_variant` and answers 200. Read `meta.custom_data.owner_sub`; if the account does not exist yet, store with outcome `unknown_account` and answer 200 (the owner fixes it by hand from `payment_events`). Otherwise insert `+N`, ref `ls-order:<data.id>`; a duplicate ref is a no-op.
4. `order_refunded`: insert `-N`, ref `ls-refund:<data.id>`, same idempotence.
5. Test-mode orders (`first_order_item.test_mode == true`) are ignored in production and accepted otherwise, controlled by `LEMONSQUEEZY_ALLOW_TEST`.
6. Always answer 200 quickly after a valid signature, including for events we ignore.

The exact `order_refunded` payload is not in the pages I read **[verify against Lemon Squeezy's "Event types" and "Example payloads" pages, or the first test refund]**.

## Configuration (environment variables, backend)

```
LEMONSQUEEZY_WEBHOOK_SECRET=<6-40 chars, random>
LEMONSQUEEZY_STORE_ID=<numeric store id>
LEMONSQUEEZY_STORE_SLUG=<subdomain of the store>
LEMONSQUEEZY_VARIANT_1=<variant id of the 1-credit pack>
LEMONSQUEEZY_VARIANT_5=<variant id of the 5-credit pack>
LEMONSQUEEZY_VARIANT_10=<variant id of the 10-credit pack>
LEMONSQUEEZY_ALLOW_TEST=false    # true only while testing
```

## Dashboard UI

- A credits chip in the dashboard header: "3 credits" with a "Buy credits" button. At zero the chip is highlighted.
- Buy dialog: the three packs with price and price per event; "Pay securely with Lemon Squeezy".
- Creating an event shows "This uses 1 credit (you have N)". At zero, the buy dialog opens.
- Event card: "Online for 41 more days", "Expired" state, the 14-day banner.
- Right after paying, the balance refreshes by polling `GET /credits` for up to 30 s (the webhook can arrive a few seconds after the redirect).

## Legal links and identity in the dashboard (not the profile)

A footer on the dashboard (and the public home page) with:

- **Company identity (given by the owner, shown exactly like this):**
  - HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ
  - Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5
  - Cod unic de înregistrare: 54766547, din data 26.05.2026
  - Still missing: the trade register number of the PFA (the "F" number, for example F40/…/2026), a contact email and a phone number. Keep them in one config object (frontend `legal.js`) so they are added in one place. **[owner to supply]**
  - The owner is a sole trader (PFA): the owner answers personally for the business. Worth mentioning to the accountant together with the VAT status (Lemon Squeezy collects the VAT on sales as merchant of record).
- **ANPC link:** https://www.anpc.ro/?ref=footer_3_6 **[verify]**
- **SAL pictogram:** 250 x 50 px image, downloaded from the ANPC site, linking to https://reclamatiisal.anpc.ro/Despre-noi/ref/footer_3_5. This follows Ordin 449/2022 as amended by Ordin 270/2026 (found on legislatie.just.ro and anpc.ro). **[verify the consolidated text and download the official image from anpc.ro]**
- **Do not add the old EU "SOL / ODR" link.** The ANPC amendment says the European platform was repealed (Regulation 2024/3228). **[verify]**
- **Terms and conditions, privacy policy, refund and withdrawal policy, cookie information.** Privacy already exists; terms and refund policy are to be written.
- **Withdrawal:** consumer law gives 14 days to withdraw, and for digital services that start immediately the buyer must give express consent and acknowledge the loss of the right. Lemon Squeezy's checkout and terms cover part of this as seller of record, but a Romanian lawyer should confirm who the "trader" is for ANPC purposes and what the site itself must show. A June 2026 article on OUG 18/2026 says a "simple click" withdrawal function is required from the customer account; I could not verify it from primary sources. **[needs a lawyer]**
- Photographers are businesses as well as consumers; the terms should say the service is for professional use.

## Operations: setting up Lemon Squeezy

See the owner's checklist (given in chat on 2026-11-11): create the store, create 3 one-time products/variants, create the webhook at Settings > Webhooks with callback `https://api.imemories.eu/api/v1/webhooks/lemonsqueezy`, a signing secret, and events `order_created` and `order_refunded`; copy the secret and ids into Coolify; test in test mode first, then repeat in live mode.

## Left to the builder

Class and table names, the exact copy of messages, the expiry job's schedule, and the visual design of the chip, dialog and footer (use the existing app style).

## Open questions for the owner

All answered by the owner on 2026-11-11, except where noted:
1. Prices 19 / 85 / 150: confirmed. Limits: trial 300 photos / 30 days, full 3,000 photos / 90 days.
2. No extension product in v1.
3. Company identity: given (see the footer section). Still missing: the PFA's F number, a contact email, a phone number.
4. Is the free/unlocked split in the table right (personalization, logo and the guest editor locked until the first purchase)?
5. (Answered: the free-credit event has 300 photos and 30 days.)
6. Existing accounts: answered by the owner on 2026-11-11: 30 days of full access, then locked; the images are then deleted in a batch and only the details of the event are kept (see "Expiry and deletion").
