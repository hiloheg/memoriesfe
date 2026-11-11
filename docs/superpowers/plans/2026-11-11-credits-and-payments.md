# Credits and Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photographers buy credit packs through Lemon Squeezy; one credit creates one event with fixed limits and a lifetime; the first purchase unlocks personalization, the logo and the guest photo editor; expired events lose their images in a daily batch.

**Architecture:** An append-only `credit_ledger` table (backend, Neon/Flyway V18) is the single source of truth for balances and for the derived "unlocked" state. A Lemon Squeezy webhook (HMAC-verified, idempotent on the order id) writes purchases and refunds. Event creation spends a credit in one transaction and stores the event's plan and limits. The public API tells the frontend which features are on; the dashboard shows the credit balance, a confirmation step before spending, the expiry state and the Romanian legal footer.

**Tech Stack:** Spring Boot 4.1.2 / Java 21 / JdbcClient / Flyway (`D:\WorkspaceGit\memoriesbe`, tests are JUnit 5 + MockMvc + Mockito, repositories are mocked, there is no database in tests); React 19 + Vite (`D:\WorkspaceGit\memoriesfe`, tests are `node --test` for pure `.js` files only).

**Spec:** `D:\WorkspaceGit\memoriesfe\docs\superpowers\specs\2026-11-11-credits-and-payments-design.md`

## Global Constraints

- Packs: 1 credit EUR 19, 5 credits EUR 85, 10 credits EUR 150 (before VAT). Prices live in Lemon Squeezy; the app only maps variant ids to credit counts 1 / 5 / 10.
- Trial event (free credit): 300 photos, 4 GB, online 30 days, **1 camera**. Full event (purchased credit): 3,000 photos, 40 GB, online 90 days, no camera limit.
- The balance ("N credits") and a "Buy credits" button are visible in the header of every dashboard page.
- Every Google account gets exactly one free credit (ledger `kind='trial'`, `ref='welcome:<sub>'`, unique).
- Creating an event spends a purchased (`full`) credit if the account has one, otherwise the free (`trial`) credit.
- The client must send `confirmed: true` to create an event; the server answers 400 without it and 402 when there are no credits.
- Unlocked = at least one purchase without a matching refund, OR within 30 days of the launch row in `credit_launch`. Free accounts cannot change appearance (accent, background, pattern, effect, frame, social colour) or the logo (HTTP 403, body message starts with `locked:`). Name, address, tagline, bio, picture and follow buttons stay editable.
- Webhook: `POST /api/v1/webhooks/lemonsqueezy`, public. Signature = HMAC-SHA256 hex digest of the raw body with `LEMONSQUEEZY_WEBHOOK_SECRET`, header `X-Signature`, constant-time compare, length checked first. Event name in header `X-Event-Name`. Answer 200 after a valid signature even for events we ignore. Bad signature: 401.
- Ledger refs: `ls-order:<data.id>`, `ls-refund:<data.id>`, `welcome:<sub>`. A duplicate ref inserts nothing.
- Expired events answer HTTP 410 on the public gallery endpoints. A daily batch job deletes images of events past `purge_after`: new events `expires_at + 14 days`; events that existed at launch `launch + 30 days`. Only the event row stays (marked `purged_at`).
- Company identity text, exactly: "HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ", "Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5", "Cod unic de înregistrare: 54766547, din data 26.05.2026".
- ANPC link `https://anpc.ro`; SAL pictogram 250 x 50 px linking to `https://reclamatiisal.anpc.ro`; do NOT add the old EU SOL/ODR link.
- Backend style: package `ro.ghil.memoriesbe`, `JdbcClient` (no JPA), `ResponseStatusException` for errors, tests mock repositories with `@MockitoBean`. UI copy: plain sentence case, no jargon, the same action keeps the same name everywhere.
- Never commit `.env`; new variables go into `.env.example` with placeholders.

## Review Focus

1. **Double click or two tabs on "create event":** two simultaneous requests must not spend the same credit twice or take the balance below zero (Task 2: advisory lock per owner, test with a stubbed repository that reports a balance of 1).
2. **Webhook delivered twice, out of order, or for an unknown account:** no double credit; refund before order is ignored safely; unknown account is stored, answers 200 (Task 6 tests).
3. **Tampered or missing signature, empty body, a signature of the wrong length:** 401 and nothing stored, no exception (Task 6).
4. **Free account with a saved logo or look from before launch:** nothing is deleted; the public pages simply show the default look and no logo (Task 8 tests).
5. **Event created while credits arrive late:** the user pays, returns to the dashboard before the webhook is processed: the balance chip must refresh by polling and the buy dialog must not claim failure (Task 11: the dialog polls after checkout opens, and `shouldStopPolling(before, after, elapsedMs)` in `credits.js` is unit-tested: true when the total changed or 60 s passed).

---

## Backend (`D:\WorkspaceGit\memoriesbe`)

### Task 1: Plans, ledger table and repository

**Files:**
- Create: `src/main/resources/db/migration/V18__credits.sql`
- Create: `src/main/java/ro/ghil/memoriesbe/credits/Plan.java`
- Create: `src/main/java/ro/ghil/memoriesbe/credits/CreditRepository.java`
- Modify: `src/main/java/ro/ghil/memoriesbe/events/EventRepository.java`
- Test: `src/test/java/ro/ghil/memoriesbe/CreditsTests.java`

**Interfaces:**
- Produces:
  - `enum Plan { TRIAL, FULL }` with `int maxPhotos()`, `long maxBytes()`, `int days()`, `int maxCameras()`, `String key()` ("trial" / "full"), `static Plan of(String key)`. TRIAL = 300 / 4 GB / 30 / 1 camera; FULL = 3000 / 40 GB / 90 / `Integer.MAX_VALUE` cameras (GB = 1024^3).
  - `record Balance(int trial, int full)` with `int total()`.
  - `CreditRepository`: `void lock(String ownerSub)`, `Balance balance(String ownerSub)`, `boolean insert(String ownerSub, int delta, String kind, String reason, String ref, UUID eventId)` (returns false when `ref` already exists), `boolean hasUnrefundedPurchase(String ownerSub)`, `Instant launchedAt()`, `List<LedgerRow> history(String ownerSub, int limit)` with `record LedgerRow(int delta, String kind, String reason, OffsetDateTime createdAt)`, `void insertPaymentEvent(String orderId, String eventName, String outcome, String payloadJson)`, `void deleteNonFinancial(String ownerSub)`.
  - `EventRepository`: `record Limits(UUID eventId, String plan, int maxPhotos, long maxBytes, OffsetDateTime expiresAt, OffsetDateTime purgeAfter, OffsetDateTime purgedAt)`, `void applyPlan(UUID id, Plan plan, OffsetDateTime expiresAt, OffsetDateTime purgeAfter)`, `Optional<Limits> limitsOf(UUID eventId)`, `Map<UUID, Limits> limitsOfOwner(String ownerSub)`, `List<UUID> dueForPurge(OffsetDateTime now, int limit)`, `void markPurged(UUID id)`.
- The `Event` record is NOT changed (tests build it with 12 arguments); limits are read through `Limits`.

- [ ] **Step 1: Write the failing test** `planLimitsMatchTheOwnersNumbers` in `CreditsTests`: `Plan.TRIAL` is 300 photos, 4 GiB, 30 days, 1 camera; `Plan.FULL` is 3000 photos, 40 GiB, 90 days, `Integer.MAX_VALUE` cameras; `Plan.of("full") == FULL`; `Plan.of("x")` throws `IllegalArgumentException`; `new Balance(1, 2).total() == 3`.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=CreditsTests` (use `mvnw.cmd` on Windows). Expected: FAIL, compile error (Plan missing).
- [ ] **Step 3: Implement** `Plan`, `Balance` (nested in `CreditRepository` or its own file, your choice, but referenced as `CreditRepository.Balance`) and the repository methods with JdbcClient. Migration V18, exactly these objects:
  - `credit_ledger(id uuid primary key default gen_random_uuid(), owner_sub text not null, delta int not null, kind text not null check (kind in ('trial','full')), reason text not null check (reason in ('welcome','purchase','event','refund')), ref text unique, event_id uuid, created_at timestamptz not null default now())` plus an index on `owner_sub`.
  - `payment_events(id uuid primary key default gen_random_uuid(), order_id text, event_name text not null, outcome text not null, payload jsonb, received_at timestamptz not null default now())`.
  - `credit_launch(launched_at timestamptz not null)` with one row inserted as `now()`.
  - `alter table events add column plan text, add column max_photos int, add column max_bytes bigint, add column expires_at timestamptz, add column purge_after timestamptz, add column purged_at timestamptz`.
  - Backfill existing events: `update events set plan='full', max_photos=3000, max_bytes=42949672960, expires_at=now()+interval '30 days', purge_after=now()+interval '30 days'`.
  - `balance` = per kind `coalesce(sum(delta),0)`. `lock` = `select pg_advisory_xact_lock(hashtext(?))`. `hasUnrefundedPurchase` = a purchase row with no refund row whose `ref` is `'ls-refund:' || substr(p.ref, 10)`. `insert` uses `on conflict (ref) do nothing` and returns `update() == 1`. `deleteNonFinancial` deletes rows with reason `welcome` or `event` only.
- [ ] **Step 4: Run** the same command. Expected: PASS (1 test). Then `./mvnw -q test`: all existing tests still pass (the migration is not executed in tests; Flyway is disabled there).
- [ ] **Step 5: Commit** `git add` the new files and `EventRepository.java`; message `feat: credit ledger, plans and event limits`.

### Task 2: CreditService (grant, spend, purchase, refund, unlocked)

**Files:**
- Create: `src/main/java/ro/ghil/memoriesbe/credits/CreditService.java`
- Test: `src/test/java/ro/ghil/memoriesbe/CreditsTests.java` (add)

**Interfaces:**
- Consumes: `CreditRepository`, `Plan`, `Balance` from Task 1.
- Produces `@Service CreditService` with constructor `CreditService(CreditRepository repo, TransactionOperations tx, Clock clock)` (a second `@Autowired` constructor takes `PlatformTransactionManager` and builds `TransactionTemplate` and `Clock.systemUTC()`):
  - `void grantWelcome(String sub)`
  - `Balance balance(String sub)`
  - `boolean unlocked(String sub)`
  - `<T> T runSpending(String sub, UUID eventId, Function<Plan, T> work)`: in one transaction: `repo.lock(sub)`, read balance, choose FULL if `full > 0`, else TRIAL if `trial > 0`, else throw `ResponseStatusException(402, "You have no credits left. Buy a pack to create an event.")`; insert delta -1 reason `event` with `eventId`; return `work.apply(plan)`. An exception from `work` propagates (the transaction rolls back).
  - `boolean applyPurchase(String sub, int credits, String orderId)` (insert +credits, kind full, reason purchase, ref `ls-order:<orderId>`; returns false for a duplicate)
  - `boolean applyRefund(String sub, int credits, String orderId)` (insert -credits, kind full, reason refund, ref `ls-refund:<orderId>`)
  - `List<CreditRepository.LedgerRow> history(String sub)` (limit 50)

- [ ] **Step 1: Write failing tests** (Mockito mock of `CreditRepository`, `TransactionOperations.withoutTransaction()`, fixed `Clock`):
  - `welcomeCreditIsInsertedOncePerAccount`: `grantWelcome("s1")` calls `repo.insert("s1", 1, "trial", "welcome", "welcome:s1", null)`.
  - `spendsAPurchasedCreditBeforeTheFreeOne`: balance (1 trial, 2 full): `runSpending` passes `Plan.FULL` to the function and inserts `(-1, "full", "event", null, eventId)`.
  - `spendsTheFreeCreditWhenNothingElseIsLeft`: balance (1, 0) gives `Plan.TRIAL`.
  - `noCreditsIs402AndNothingIsInserted`: balance (0, 0): `ResponseStatusException` with status 402; `repo.insert` never called; the function never called.
  - `lockIsTakenBeforeTheBalanceIsRead`: `InOrder` verify `repo.lock("s1")` then `repo.balance("s1")`.
  - `failureInsideTheWorkPropagates`: the function throws `IllegalStateException`; it is rethrown (with a real rollback the insert disappears; note in the test comment that rollback is the transaction manager's job).
  - `purchaseAddsCreditsAndADuplicateIsIgnored`: `applyPurchase("s1", 5, "77")` inserts `(5, "full", "purchase", "ls-order:77", null)`; when the repo returns false the method returns false.
  - `refundIsNegativeWithItsOwnRef`: `applyRefund("s1", 5, "77")` inserts `(-5, "full", "refund", "ls-refund:77", null)`.
  - `unlockedByPurchaseOrByTheLaunchWindow`: purchase present -> true; no purchase and clock 29 days after `repo.launchedAt()` -> true; 31 days after -> false.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=CreditsTests`. Expected: FAIL (CreditService missing).
- [ ] **Step 3: Implement** `CreditService`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: credit service with spending, purchase and refund`.

### Task 3: Create event with confirmation, plan and limits

**Files:**
- Modify: `src/main/java/ro/ghil/memoriesbe/events/EventController.java`, `EventRepository.java` (done in Task 1)
- Modify: `src/test/java/ro/ghil/memoriesbe/MemoriesbeApplicationTests.java`
- Test: same file

**Interfaces:**
- Consumes: `CreditService.runSpending`, `EventRepository.applyPlan`, `limitsOf`, `limitsOfOwner`.
- Produces: `CreateEventRequest` gains `Boolean confirmed`. `EventDto` gains `String plan, int maxPhotos, int maxCameras, OffsetDateTime expiresAt, boolean expired, OffsetDateTime purgedAt`. Add `OffsetDateTime`-based helper `static OffsetDateTime expiryFor(Plan plan, OffsetDateTime now)` = `now.plusDays(plan.days())`; `purge_after` = `expiry + 14 days`.

- [ ] **Step 1: Test setup in `MemoriesbeApplicationTests`:** add `@MockitoBean ro.ghil.memoriesbe.credits.CreditService credits;`, and a `@BeforeEach` that stubs `credits.runSpending(any(), any(), any())` to apply the function with `Plan.FULL` (`thenAnswer(inv -> ((Function) inv.getArgument(2)).apply(Plan.FULL))`) and `credits.unlocked(any())` to `true`. Existing tests that create events keep passing once their request bodies include `"confirmed":true` (update `eventNeedsADate` bodies that must reach later validation, and the `wedding` creation test).
- [ ] **Step 2: Write failing tests:**
  - `creatingAnEventNeedsConfirmation`: body without `confirmed` and with `"confirmed":false` -> 400; `credits.runSpending` never called.
  - `creatingAnEventSpendsOneCreditAndStoresThePlan`: with `confirmed:true`, verify `repo.applyPlan(any(), eq(Plan.FULL), any(), any())` where `expiresAt` is within 1 minute of now+90 days and `purgeAfter` is `expiresAt`+14 days; response 201.
  - `trialEventGetsTrialLimits`: stub `runSpending` to apply `Plan.TRIAL`; `applyPlan` is called with `Plan.TRIAL` and an expiry of about 30 days.
  - `noCreditsGives402`: stub `runSpending` to throw `ResponseStatusException(402)`; response status 402; `repo.insertEvent` not called.
  - `eventListShowsPlanAndExpiry`: `repo.limitsOfOwner("s1")` returns a `Limits` with a past `expiresAt`; the `GET /api/v1/events` JSON has `$[0].expired == true` and `$[0].maxPhotos == 3000`.
- [ ] **Step 3: Run** `./mvnw -q test -Dtest=MemoriesbeApplicationTests`. Expected: the new tests FAIL.
- [ ] **Step 4: Implement** in `EventController.create`: validation first (name, date, icon, visibility, password hash), then `Boolean.TRUE.equals(req.confirmed())` check (400 "Confirm that this uses 1 credit"), then `credits.runSpending(sub, id, plan -> { repo.insertEvent(...); setAccessPassword; repo.applyPlan(id, plan, expiry, purge); return dto(...); })`. Extend `dto(...)` and the list/get paths to read `Limits` (an event without limits, which should not happen after the backfill, is shown as not expired with `plan` null).
- [ ] **Step 5: Run** `./mvnw -q test`. Expected: all tests pass.
- [ ] **Step 6: Commit** `feat: creating an event confirms and spends one credit`.

### Task 4: Enforce expiry and the photo limit

**Files:**
- Modify: `events/EventAccess.java` (or a new `events/EventLifetime.java`), `events/PublicEventController.java`, `events/GuestUploadService.java`, `events/EventController.java` (camera creation and reset), `storage/PhotoStorage.java`
- Test: `GuestUploadTests.java`, `MemoriesbeApplicationTests.java`

**Interfaces:**
- Produces: `EventLifetime` (`@Component`): `void requireOpen(UUID eventId)` throws `ResponseStatusException(410, "This gallery has expired")` when `limitsOf(eventId)` has `expiresAt` in the past or `purgedAt` set; `Optional<EventRepository.Limits> limits(UUID)`.
- `PhotoStorage.Usage usage(String prefix)` with `record Usage(int photos, long bytes)`, cached 60 seconds per prefix (use the existing 30-minute signed-URL cache style: a small `ConcurrentHashMap` with timestamps). Counts only image keys under the prefix (originals, not `thumbs/`).

- [ ] **Step 1: Write failing tests:**
  - `expiredGalleryIs410`: `limitsOf` returns an expired `Limits`; `GET /api/v1/public/events/{token}` and `/photographers/{slug}/events/{eventSlug}/photos` -> 410.
  - `guestCannotUploadToAnExpiredEvent` (GuestUploadTests style): 410.
  - `guestUploadRefusedWhenTheEventIsFull`: `storage.usage("events/<id>/")` returns `Usage(3000, 1)` with `Limits.maxPhotos` 3000 -> 403 with message "This event has reached its photo limit".
  - `guestUploadRefusedWhenTheEventIsOverItsStorageCap`: `Usage(10, 41L*1024*1024*1024)` with `maxBytes` 40 GiB -> 403 with the same message.
  - `cannotAddACameraToAnExpiredEvent`: `POST .../cameras` -> 410 and `sftpgo` not called.
  - `trialEventAllowsOnlyOneCamera`: `limitsOf` returns plan `trial`; with `repo.cameras(id)` already holding one camera, `POST .../cameras` -> 403 with the message "Trial events support 1 camera. Buy a pack to create full events with more cameras." and `sftpgo` not called; with zero cameras it is 201.
  - `fullEventAllowsManyCameras`: plan `full` with 5 existing cameras -> 201.
- [ ] **Step 2: Run** the three test classes. Expected: FAIL.
- [ ] **Step 3: Implement** `requireOpen` calls at the top of the public gallery handlers (before the password check), in `GuestUploadService.upload` (before reading bytes), and in `addCamera` / `resetCredentials`. In `GuestUploadService.upload`, after the existing checks, compare `storage.usage(prefix)` with the event limits. Update the `GuestUploadTests` constructor wiring for the new dependency.
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: expired events close and events respect their photo limit`.

### Task 5: SFTPGo quotas for cameras

**Files:**
- Modify: `sftpgo/SftpGoClient.java`, `events/EventController.java` (both `createUser` calls), `src/test/java/.../SftpGoClientTests.java`, `MemoriesbeApplicationTests.java` (the `createUser` verification)

**Interfaces:**
- Changes `createUser(String username, String password, String keyPrefix, Instant expiresAt)` to `createUser(String username, String password, String keyPrefix, Instant expiresAt, int maxFiles, long maxBytes)`; adds `"quota_files": maxFiles` and `"quota_size": maxBytes` to the request body.

- [ ] **Step 1: Write failing test** in `SftpGoClientTests`: the same MockRestServiceServer flow now also expects `$.quota_files` = 3000 and `$.quota_size` = 42949672960 for a call with those arguments. Update the verification in `cameraLoginExpiresThreeDaysAfterTheEvent` to the 6-argument form (the controller passes the event's `maxPhotos` / `maxBytes`, FULL values in that test).
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=SftpGoClientTests+MemoriesbeApplicationTests`. Expected: FAIL.
- [ ] **Step 3: Implement.** If an event has no limits row, fall back to `Plan.FULL`.
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: pass.
- [ ] **Step 5: Manual check (owner, before launch):** create a camera in a local SFTPGo and confirm in its admin UI that the user shows the quota values, and that an S3/R2-backed user is stopped at the quota. If SFTPGo ignores quotas for the S3 provider, record it in the ledger as a deferred minor; the guest-upload limit (Task 4) still holds, and a later job can count camera photos.
- [ ] **Step 6: Commit** `feat: set SFTPGo quotas from the event plan`.

### Task 6: Lemon Squeezy webhook, credits API and checkout link

**Files:**
- Create: `credits/LemonSqueezyProps.java` (record bound to `app.lemonsqueezy`: `webhookSecret, storeId, storeSlug, variant1, variant5, variant10, allowTest`), `credits/LemonSqueezySignature.java`, `credits/LemonSqueezyWebhookController.java`, `credits/CreditsController.java`
- Modify: `config/AppConfig.java` (register props), `SecurityConfig.java` (`.requestMatchers("/api/v1/webhooks/**").permitAll()`), `application.yml`, `.env.example`
- Test: `src/test/java/ro/ghil/memoriesbe/WebhookTests.java`

**Interfaces:**
- Consumes: `CreditService.applyPurchase`, `applyRefund`, `ProfileRepository.bySub`, `CreditRepository.insertPaymentEvent`.
- Produces:
  - `LemonSqueezySignature.valid(byte[] body, String header, String secret)`: HMAC-SHA256 hex of the raw body, compared with `MessageDigest.isEqual` on equal-length byte arrays; false for a null/blank header or a wrong length.
  - `POST /api/v1/webhooks/lemonsqueezy`, `@RequestBody byte[] body`, headers `X-Signature`, `X-Event-Name`.
  - `GET /api/v1/credits` -> `{ balance: {trial, full, total}, unlocked, history: [{delta, kind, reason, createdAt}] }`.
  - `GET /api/v1/credits/checkout?pack=1|5|10` -> `{ url }` = `https://<storeSlug>.lemonsqueezy.com/checkout/buy/<variantId>?checkout[email]=<url-encoded email>&checkout[custom][owner_sub]=<url-encoded sub>`; any other `pack` -> 400.
  - Webhook logic in this order: verify signature (401), parse JSON, store a `payment_events` row, then for `order_created`: `data.attributes.status == "paid"`, `data.attributes.store_id` equals `storeId` (string compare), skip when `first_order_item.test_mode` is true and `allowTest` is false, map `first_order_item.variant_id` to 1/5/10 credits (unknown -> outcome `unknown_variant`), read `meta.custom_data.owner_sub`, require `profiles.bySub(sub)` present (else outcome `unknown_account`), then `applyPurchase(sub, credits, data.id)`; for `order_refunded`: look up the credits by the same variant mapping and call `applyRefund`; any other event name -> outcome `ignored`. Always 200 after a valid signature.

- [ ] **Step 1: Write failing tests** in `WebhookTests` (`@SpringBootTest @AutoConfigureMockMvc`, `@MockitoBean CreditService credits`, `ProfileRepository profiles`, `CreditRepository creditRepo`, plus the other repository mocks the context needs, copied from `MemoriesbeApplicationTests`; test properties set `app.lemonsqueezy.webhook-secret=test-secret`, `store-id=42`, `store-slug=memories`, `variant1=11`, `variant5=55`, `variant10=1010`, `allow-test=false`). A helper `sign(String body)` computes the real HMAC with `test-secret`.
  - `badSignatureIs401AndStoresNothing`, `missingSignatureIs401`, `wrongLengthSignatureIs401NotAnException`.
  - `paidOrderAddsCredits`: variant 55, `meta.custom_data.owner_sub` = "s1", profile exists -> `credits.applyPurchase("s1", 5, "9001")`, response 200.
  - `duplicateDeliveryIsHarmless`: `applyPurchase` returns false the second time; still 200, no exception.
  - `unknownVariantIsStoredNotCredited`, `unknownAccountIsStoredNotCredited` (verify `insertPaymentEvent` with those outcomes; `applyPurchase` never called).
  - `unpaidOrWrongStoreIsIgnored`: status `pending`, or `store_id` 43 -> no credits.
  - `testModeOrderIsIgnoredInProduction`: `first_order_item.test_mode=true` with `allow-test=false`.
  - `refundTakesCreditsBack`: `order_refunded` for variant 55 -> `credits.applyRefund("s1", 5, "9001")`.
  - `checkoutLinkHasVariantEmailAndOwner`: `GET /api/v1/credits/checkout?pack=5` with a jwt (sub `s1`, email `a@b.c`) -> url contains `/checkout/buy/55`, `checkout%5Bemail%5D=a%40b.c` or the unencoded bracket form your builder produces (assert on `checkout[custom][owner_sub]` after URL-decoding), `pack=7` -> 400.
  - `creditsEndpointReturnsBalanceAndUnlocked`.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=WebhookTests`. Expected: FAIL.
- [ ] **Step 3: Implement.** Env names in `application.yml` / `.env.example`: `LEMONSQUEEZY_WEBHOOK_SECRET, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_STORE_SLUG, LEMONSQUEEZY_VARIANT_1, LEMONSQUEEZY_VARIANT_5, LEMONSQUEEZY_VARIANT_10, LEMONSQUEEZY_ALLOW_TEST` (defaults empty / false so local start-up works; an empty webhook secret must make every webhook answer 401, never accept).
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: pass.
- [ ] **Step 5: Commit** `feat: Lemon Squeezy webhook, credits API and checkout link`.

### Task 7: Welcome credit at sign-in

**Files:** Modify `MeController.java`, `profile/ProfileController.java` (`current` stays unchanged), test in `MemoriesbeApplicationTests.java`.

- [ ] **Step 1: Write failing test** `signingInGrantsTheWelcomeCredit`: `GET /api/v1/me` -> `credits.grantWelcome("s1")` called once with a verified-email jwt.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=MemoriesbeApplicationTests`. Expected: FAIL.
- [ ] **Step 3: Implement:** in `MeController.me`, after `profiles.ensure(...)`, call `credits.grantWelcome(sub)` (tokens are already required to have `email_verified=true` by `GoogleTokens`). The grant is idempotent, so calling it on every load is safe.
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: pass. **Step 5: Commit** `feat: every account gets one free credit`.

### Task 8: Lock personalization, logo and editor for free accounts

**Files:** Modify `profile/ProfileController.java`, `profile/ProfileViews.java`, `profile/PublicProfileController.java`, `events/PublicEventController.java`; tests in `MemoriesbeApplicationTests.java`.

**Interfaces:**
- `ProfileDto` gains `boolean unlocked` (appended last; update the test helper construction if any).
- Public gallery payloads (`Gallery`, `PhotoPage`) gain `Features features` where `record Features(boolean personalized, boolean editor, boolean logo)` = all equal to `credits.unlocked(ownerSub)`; when false, `logoUrl` is "" (the logo is not sent).
- `PublicProfileController.Page` returns the default accent and `new Background("default","","none","none","none","")` when the owner is not unlocked.

- [ ] **Step 1: Write failing tests** (stubbing `credits.unlocked("s1")`):
  - `freeAccountCannotSaveALook`: `PUT /api/v1/profile` with `bgKind":"gradient","bgValue":"dawn"` while locked -> 403, message starts with `locked:`; the same request with only name/slug/tagline/links and default look values -> 200.
  - `freeAccountCannotUploadOrRemoveALogo`: `POST /api/v1/profile/logo` and `DELETE` -> 403.
  - `unlockedAccountCanSaveALook`: 200.
  - `publicProfileShowsTheDefaultLookToGuestsOfAFreeOwner`: the owner's profile has a gradient saved; with `unlocked` false the JSON has `background.kind == "default"` and the default accent; with true it shows the gradient.
  - `publicGalleryHidesLogoAndEditorForAFreeOwner`: `features.editor == false`, `features.logo == false`, `logoUrl == ""` when locked; all true and `logoUrl` non-empty when unlocked.
  - `meReportsUnlocked`: `$.unlocked`.
- [ ] **Step 2: Run** the class. Expected: FAIL.
- [ ] **Step 3: Implement.** In `ProfileController.update`, if not unlocked and the cleaned look/accent differ from the profile's current values, throw 403 `locked: Buy any pack to change the look of your page` (a free account re-sending its existing saved values still succeeds, so the editor can keep saving the basic fields). Logo endpoints throw 403 `locked: Buy any pack to add your logo` when not unlocked. `ProfileViews.dto(profile, email)` takes `unlocked` as a second computed value (add an overload with `boolean unlocked`; update callers).
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: pass. **Step 5: Commit** `feat: free accounts keep the default look; first purchase unlocks it`.

### Task 9: Daily purge of expired events, account export and deletion

**Files:**
- Create: `events/EventPurger.java` (`@Component`), `events/EventPurgeJob.java` (`@Component` with `@Scheduled(cron = "0 30 3 * * *", zone = "UTC")`)
- Modify: `MemoriesbeApplication.java` (`@EnableScheduling`), `GuestRepository.java` (`void deleteAllFor(UUID eventId)`), `AccountController.java`
- Test: `src/test/java/ro/ghil/memoriesbe/PurgeTests.java`

**Interfaces:**
- `EventPurger.purgeDue(OffsetDateTime now)` returns the number of events purged: for each id from `repo.dueForPurge(now, 50)`: remove every camera's SFTPGo user (ignore `NotFound`), `storage.deleteAll("events/<id>/")` (also removes the small copies; check `PhotoStorage.deleteAll` purges `thumbs/`), delete camera rows, `guests.deleteAllFor(id)`, `repo.markPurged(id)`. One failing event is logged and skipped; the next night retries it.
- `AccountController`: export gains `credits` (balance and ledger rows without refs); account deletion calls `credits.deleteNonFinancial(sub)` and keeps purchase/refund rows **[ruling: financial records; owner to confirm with the accountant]**.

- [ ] **Step 1: Write failing tests** (`PurgeTests`, plain Mockito, no Spring): `purgesPhotosCamerasAndGuestsButKeepsTheEvent` (verify `storage.deleteAll("events/<id>/")`, `sftpgo.deleteUser` per camera, `repo.deleteCamera` per camera, `guests.deleteAllFor(id)`, `repo.markPurged(id)`, and `repo.deleteEvent` never called); `oneFailureDoesNotStopTheBatch` (the first event's `deleteAll` throws; the second is still purged; the method returns 1); `nothingDueDoesNothing`; `alreadyGoneCameraUserIsIgnored` (`HttpClientErrorException.NotFound`).
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=PurgeTests`. Expected: FAIL.
- [ ] **Step 3: Implement** purger, job (calls `purgeDue(OffsetDateTime.now())` and logs the count), repository methods (`dueForPurge`: `purged_at is null and purge_after < ?` ordered by `purge_after`, limited), and the AccountController changes with a test in `MemoriesbeApplicationTests` (`exportIncludesCredits`).
- [ ] **Step 4: Run** `./mvnw -q test`. Expected: pass. **Step 5: Commit** `feat: daily purge of expired events keeps only the details`.

### Task 10: Backend smoke test against the real database (manual, one person)

- [ ] **Step 1:** In `memoriesbe`, run the app against the dev Neon database with the new `.env` values. Expected: Flyway logs `Migrating schema "public" to version "18 - credits"` and the app starts. If V11-V17 were never applied, they run first; read the log.
- [ ] **Step 2:** With a real Google token (copy it from the browser network tab), call `GET /api/v1/me` then `GET /api/v1/credits`. Expected: `balance.trial == 1`, `unlocked` true (launch window).
- [ ] **Step 3:** `POST /api/v1/events` without `confirmed` -> 400; with it -> 201 and `balance.trial == 0`; again -> 402.
- [ ] **Step 4:** Send a hand-made webhook with a valid signature (script `curl` with `openssl dgst -sha256 -hmac`) twice; the balance rises once. Record the commands in the ledger.

---

## Frontend (`D:\WorkspaceGit\memoriesfe`)

### Task 11: Credits state, balance chip and buy dialog

**Files:**
- Create: `src/credits.js` (pure helpers, tested), `src/credits.test.js`, `src/components/CreditsChip.jsx`, `src/components/BuyCreditsDialog.jsx`
- Modify: `src/App.jsx` (`PhotographerShell` header, next to `UserMenu`, so the chip shows on every dashboard page: events, event detail, share, profile), `src/App.css`

**Interfaces:**
- Produces in `credits.js`: `PACKS = [{ pack: 1, credits: 1, price: 19 }, { pack: 5, credits: 5, price: 85 }, { pack: 10, credits: 10, price: 150 }]`, `perEvent(pack)` (price / credits, rounded to 2 decimals, returned as a number), `describePlan(plan)` -> `{ photos, days }` (trial 300/30, full 3000/90), `expiryDate(plan, from = new Date())` -> `Date` (adds 30 or 90 days), `daysLeft(expiresAt, now = new Date())` -> integer, 0 when past, `shouldWarn(plan, daysLeft)` -> true at <= 14 days for full, <= 7 for trial.
- The chip always shows two things: the balance text ("3 credits", "1 credit", "0 credits") and a visible "Buy credits" button (not only a click on the number). On narrow screens the chip is a compact pill with the number and the button label shortens to "Buy"; both stay visible without opening the user menu. `Events.jsx` and `NewEventDialog` get the credits state through a React context (`CreditsProvider` in `PhotographerShell`) so there is one fetch and one polling loop.
- `useCredits()` hook in `CreditsChip.jsx` file or its own file: `{ data, reload, startPolling }` using `apiFetch('/api/v1/credits')`; `startPolling()` reloads every 3 s for up to 60 s or until the balance changes; it also reloads when the tab becomes visible.
- `BuyCreditsDialog({ onClose })`: three pack cards (credits, price, "per event" price), button "Pay securely with Lemon Squeezy" calls `apiFetch('/api/v1/credits/checkout?pack=N')` and opens the returned `url` in a new tab, then `startPolling()`; text "Prices exclude VAT. Payment is handled by Lemon Squeezy."; a line "Buying any pack also unlocks your page look, your logo and the photo editor for guests."

- [ ] **Step 1: Write failing tests** in `credits.test.js` (`node --test`): `perEvent(5) === 17`, `perEvent(10) === 15`, `perEvent(1) === 19`; `describePlan('trial')` is `{photos:300, days:30}`; `expiryDate('full', new Date('2026-12-01T00:00:00Z'))` is `2027-03-01` (90 days); `daysLeft` is 0 for a past date and 41 for a date 41 days ahead; `shouldWarn('full', 14) === true`, `shouldWarn('full', 15) === false`, `shouldWarn('trial', 8) === false`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `credits.js`, then the chip ("3 credits", highlighted at 0, click opens the dialog), the dialog, and place the chip in the `Events.jsx` header next to the existing actions. Follow the existing `Modal.jsx` and button styles; mobile first: the dialog's pack cards stack in one column below 560 px.
- [ ] **Step 4: Run** `npm test` (expected: all pass) and `npx vite build` (expected: succeeds). Manually check the dialog at 375 px and 1280 px wide in the browser.
- [ ] **Step 5: Commit** `feat: credits balance, buy dialog`.

### Task 12: Confirmation step when creating an event

**Files:** Modify `src/components/NewEventDialog.jsx`, `src/pages/Events.jsx` (pass the credits state), `src/App.css`; tests extend `src/credits.test.js`.

**Interfaces:**
- Consumes: `useCredits`, `describePlan`, `expiryDate`, `BuyCreditsDialog`. The balance gives the plan: `data.balance.full > 0 ? 'full' : 'trial'`.
- The dialog is two steps: details (existing fields), then **Confirm**. The confirm step shows: "This uses 1 credit" with "You have N credits" (N = total), "Full event" or "Trial event" with "Up to {photos} photos, online for {days} days", "Event date: {formatted event date}", "Online until: {formatted expiryDate}", and the sentence "The online-until date is fixed once the credit is used. You can still change the event name and icon later." The button reads "Use 1 credit and create event"; secondary button "Back". `POST /api/v1/events` sends `confirmed: true`.
- A 402 response closes the confirm step and opens `BuyCreditsDialog`; with a total of 0 credits the first step's primary button reads "Buy credits" instead.

- [ ] **Step 1: Write failing test** `confirmCopyNamesTheCreditTheDatesAndTheLimits` as a pure function `confirmSummary({ plan, eventDate, today, balanceTotal })` in `credits.js` returning `{ title, lines }`; assert for `plan:'full'`, `eventDate:'2026-12-20'`, `today: new Date('2026-12-01T00:00:00Z')`, `balanceTotal: 3`: `title === 'This uses 1 credit'`, a line `You have 3 credits`, a line containing `3000 photos` and `90 days`, a line containing `20 Dec 2026` and a line containing `1 Mar 2027`; for `balanceTotal: 1` the line is `You have 1 credit` (singular).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `confirmSummary` (use `src/dates.js` for date formatting if it fits, otherwise `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`) and the two-step dialog using it.
- [ ] **Step 4: Run** `npm test`, `npx vite build`. Manually: create an event end to end in the browser against the local backend; confirm the credit drops by one and the event card appears; try a second event with 0 credits and see the buy dialog.
- [ ] **Step 5: Commit** `feat: confirm the credit and the dates before creating an event`.

### Task 13: Expiry state on events

**Files:** Modify `src/pages/Events.jsx` (event cards), `src/pages/EventDetail.jsx` (header), `src/App.css`; extend `src/credits.test.js`.

**Interfaces:** Event payloads now carry `plan, maxPhotos, expiresAt, expired, purgedAt`. A pure helper `eventStatus(event, now)` in `credits.js` returns `{ kind: 'active' | 'warning' | 'expired' | 'purged', text }` with texts "Online for {n} more days" (n = 1: "1 more day"), "Expires in {n} days. Download what you need" (warning, using `shouldWarn`), "Expired. Photos are deleted on {date}", "Photos deleted on {date}".

- [ ] **Step 1: Write failing tests** for `eventStatus` for each kind (use fixed `now`; the expired text shows the `purgeAfter` date, so the helper also receives `purgeAfter`; the purged text shows `purgedAt`).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the helper, show the status on each card and on the event page. On the event page, when `event.maxCameras` is reached (`cameras.length >= maxCameras`), the "Add camera" button is disabled and a note beside it says "Trial events support 1 camera. Buy a pack to create full events with more cameras." with a "Buy credits" button that opens `BuyCreditsDialog`; a 403 from the add-camera call shows the server message. For `purged` hide the camera/QR/guest tools and show only the details; for `expired` show a notice that the public link no longer works.
- [ ] **Step 4: Run** `npm test`, `npx vite build`. **Step 5: Commit** `feat: show how long each event stays online`.

### Task 14: Locked profile tabs and locked guests' editor

**Files:** Modify `src/pages/ProfileEditor.jsx`, `src/components/Lightbox.jsx`, `src/components/PhotoStream.jsx`, `src/pages/PublicGallery.jsx`, `src/pages/PublicProfile.jsx` (only the 410 message), `src/App.css`.

**Interfaces:**
- `ProfileDto.unlocked` from `/api/v1/me`. In `ProfileEditor`, when `!unlocked`: the tabs that change the look and the logo tab show a notice "Buy any pack to unlock this" with a button that opens `BuyCreditsDialog`, and their controls are disabled; the basic tabs stay editable; a 403 whose message starts with `locked:` shows that message (without the `locked:` prefix) and opens the buy dialog.
- Public payloads carry `features { personalized, editor, logo }`. `Lightbox` takes a prop `canEdit` (from `features.editor`): when false, the Download button downloads directly and the "Edit and download" sheet is not shown. When `features.logo` is false no logo is drawn or stamped (the backend already sends an empty `logoUrl`).
- `PublicGallery`/`PhotoStream`: a 410 shows "This gallery has expired" with the sentence "The photographer's photos are no longer online."

- [ ] **Step 1: Write failing test** in `credits.test.js`: `lockedMessage('locked: Buy any pack to change the look of your page')` returns `Buy any pack to change the look of your page` and `lockedMessage('Something else')` returns `null` (pure helper in `credits.js`).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the helper, the locked tab notices, and the `canEdit` prop plumbing.
- [ ] **Step 4: Run** `npm test`, `npx vite build`. Manually (two accounts or by stubbing `unlocked`): a locked owner's gallery shows plain Download and no logo; an unlocked owner's gallery shows the sheet.
- [ ] **Step 5: Commit** `feat: free accounts see locked tabs; guests get the editor only on unlocked galleries`.

### Task 15: Legal footer, terms and refund pages

**Files:**
- Create: `src/legal.js`, `src/components/LegalFooter.jsx`, `src/pages/Terms.jsx`, `src/pages/Refunds.jsx`, `src/assets/sal.png` (**the owner downloads the official 250x50 pictogram from anpc.ro and saves it here**; until then the footer renders a text link, see below)
- Modify: `src/App.jsx` (routes `/terms`, `/refunds` outside the shell, and the footer inside `PhotographerShell`), `src/components/Landing.jsx` (footer links), `src/pages/Privacy.jsx` (payments paragraph), `src/App.css`

**Interfaces:**
- `legal.js` exports `LEGAL = { name: 'HILOHE GIGI PERSOANĂ FIZICĂ AUTORIZATĂ', address: 'Sediu profesional: București, Sectorul 1, Bulevardul Bucureştii Noi, Nr. 136, PARTER, Ap. 5', cui: 'Cod unic de înregistrare: 54766547, din data 26.05.2026', registry: '', email: '', phone: '', anpcUrl: 'https://anpc.ro', salUrl: 'https://reclamatiisal.anpc.ro' }` and `legalLines(legal)` returning the non-empty identity lines in order (registry, email and phone are added when the owner supplies them).
- `LegalFooter`: identity lines, links Terms, Privacy, Refunds and withdrawal, "ANPC" (opens `anpcUrl`), and the SAL pictogram (`<a href={salUrl}><img src={sal} width="250" height="50" alt="Alternative dispute resolution (SAL)"/></a>`; if `src/assets/sal.png` does not exist yet the build must still pass, so import it with `new URL('./assets/sal.png', import.meta.url)` only after the owner adds the file; until then render the text link "Alternative dispute resolution (SAL)").
- `Terms.jsx` and `Refunds.jsx`: plain-language English pages marked "Draft, to be reviewed by a lawyer" in a comment (not shown to users). Terms cover: who we are (identity lines), what the service is, credits and packs, event limits and lifetime (300/30, 3000/90, deletion after expiry, only details kept), unlock rules, guests' photos, payments through Lemon Squeezy as merchant of record, professional use, liability, contact. Refunds cover: 14-day withdrawal and the digital-service consent, unused credits refundable within 14 days of purchase on request by email, credits that were used are not refundable except when the service failed, how to ask (email), refunded credits are removed from the account.

- [ ] **Step 1: Write failing test** `src/legal.test.js`: `legalLines(LEGAL)` returns exactly the three identity strings above in order while `registry`, `email` and `phone` are empty; with `registry:'F40/1234/2026'` it appears after the CUI line; `LEGAL.salUrl === 'https://reclamatiisal.anpc.ro'`; `LEGAL.anpcUrl === 'https://anpc.ro'`; no value in `LEGAL` contains `ec.europa.eu` (guards against the repealed SOL link).
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; add `Terms` / `Refunds` links next to the existing Privacy link in the gallery footers; add a payments paragraph to `Privacy.jsx` (Lemon Squeezy processes payments; the app keeps a credit ledger with account id, amounts and dates; purchase records are kept for accounting).
- [ ] **Step 4: Run** `npm test`, `npx vite build`. Manually check the footer at 375 px (no horizontal scroll) and 1280 px.
- [ ] **Step 5: Commit** `feat: Romanian legal footer, terms and refund pages`.

### Task 16: Operations and release checklist (no code; owner with Claude)

- [ ] **Step 1: Lemon Squeezy:** create the store, the three one-time variants (EUR 19 / 85 / 150), in the product settings set the confirmation redirect to `https://imemories.eu/`, and create the webhook at Settings > Webhooks: callback `https://api.imemories.eu/api/v1/webhooks/lemonsqueezy`, a signing secret of 6-40 characters, events `order_created` and `order_refunded`. Repeat in live mode after testing (assume test and live webhooks are separate).
- [ ] **Step 2: Coolify (backend):** set `LEMONSQUEEZY_WEBHOOK_SECRET, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_STORE_SLUG, LEMONSQUEEZY_VARIANT_1, LEMONSQUEEZY_VARIANT_5, LEMONSQUEEZY_VARIANT_10`, `LEMONSQUEEZY_ALLOW_TEST=true` while testing, then `false`. Deploy the backend first, then the frontend.
- [ ] **Step 3: Test mode end to end:** buy the 1-credit pack with a Lemon Squeezy test card; see the balance change within 60 seconds; create an event; refund the order in the dashboard and see the credit removed; resend the webhook from the Lemon Squeezy log and see no double credit. Record the real `order_refunded` payload shape in the ledger and fix Task 6 if it differs.
- [ ] **Step 4: Owner supplies** the PFA registry (F) number, a contact email and a phone number for `legal.js`, and the official SAL pictogram. A lawyer reviews the Terms, Refunds and the withdrawal wording.
- [ ] **Step 5: Go live:** switch Lemon Squeezy to live mode, set `LEMONSQUEEZY_ALLOW_TEST=false`, make a real small purchase and refund it.

## Self-review notes

- Spec coverage: packs and prices (Global Constraints, Task 11); free credit (Tasks 2, 7); two credit kinds and limits (Tasks 1, 3, 4, 5); confirmation (Tasks 3, 12); expiry, 410, batch deletion keeping only details (Tasks 4, 9, 13); unlock rules and the 30-day launch window (Tasks 1, 2, 8, 14); webhook, checkout and ledger (Tasks 2, 6); legal links and identity (Task 15); Lemon Squeezy setup (Task 16); account export/deletion (Task 9).
- Known gaps recorded as deferred: aggregate camera photo count across several cameras is only enforced by per-camera SFTPGo quotas and the guest-upload cap (a nightly counting job is not planned); no email reminders; trial events cannot be upgraded.
- Rulings: spending runs inside one transaction through `runSpending` (so a failed event insert returns the credit); the `Event` record is unchanged and limits are read through `EventRepository.Limits`; during the 30 days after launch every account counts as unlocked; purchase and refund ledger rows are kept when an account is deleted (financial records; confirm with the accountant).
