# Guest Uploads and Photo Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Event creators can let signed-in guests add photos to an event (0 to 50 per guest), and visitors can filter event and profile photos by camera or guest tags.

**Architecture:** Backend gets a separate `/api/v1/guest/**` area whose tokens only need to be a verified Google account for this app (the photographer allow-list stays on every other route). Guest photos are written by the backend into R2 under `events/<eventId>/guests/<guestId>/`, tracked in two new tables; the public photo endpoints add them as extra tag sources. Frontend adds a self-contained guest sign-in plus upload dialog and tag chips.

**Tech Stack:** Spring Boot 4 / Java 21 / JdbcClient / Flyway / AWS S3 SDK / MockMvc + Mockito (backend, repo `D:\WorkspaceGit\memoriesbe`); React 19 / Vite / `@react-oauth/google` (frontend, repo `D:\WorkspaceGit\memoriesfe`).

**Spec:** `D:\WorkspaceGit\memoriesfe\docs\superpowers\specs\2026-11-11-guest-uploads-design.md`

No commits unless the user asks. The frontend has no test runner: frontend tasks are verified with `npx vite build` plus the manual checks listed in the task.

## Global Constraints

- Limit per guest per event: minimum 0, maximum 50. 0 means nobody can upload.
- Accepted: JPEG, PNG, WebP (HEIC is converted to JPEG in the browser). Max about 15 MB per file. The server checks magic bytes, not the extension.
- Hard cap of 2000 guest photos per event, plus rate limiting on the upload endpoint.
- Guest photos live under `events/<eventId>/guests/<guestId>/<uuid>.<ext>` in the existing bucket.
- Photos are live immediately (no approval). Only the event creator can delete guest photos. Guests cannot delete.
- Tag label = camera name or the guest's real Google name. Several selected tags mean "any of these".
- Event access rules (`EventAccess`, header `X-Event-Password`) apply to guest photos and to guest uploading.
- Guest tokens must never work on photographer endpoints (no `/me`, no `/events/**`).
- Upload confirmation text states the guest's Google name will be shown next to the photo and only the event creator can remove it.
- API style: `/api/v1`, `ResponseStatusException`, copy in plain sentence case, no new libraries on the backend.

## Review Focus

- Two uploads racing at the limit must not both succeed (Task B3 test pins lock-before-count order).
- A file named `.jpg` that is really HTML or SVG is rejected with 400 (Task B3).
- A guest token on `/api/v1/events` or `/api/v1/me` is rejected, and a non-allow-listed email works on `/api/v1/guest/**` (Task B2).
- A protected event refuses guest status and upload without its password (Task B3).
- An owner cannot list or delete another owner's guest photos (404), and a deleted photo still counts toward the guest's limit (Task B5).
- A token with no `name` claim still gets a usable tag label (Task B3).

## File Structure

Backend `src/main/java/ro/ghil/memoriesbe/`:
- `GoogleTokens.java` (new): token validators and the per-path authentication manager resolver; `SecurityConfig.java` uses it.
- `events/GuestRepository.java` (new): SQL for guests and uploads.
- `events/GuestUploadService.java` (new): limit, type, rate and storage logic.
- `events/ImageSniffer.java` (new): magic-byte detection.
- `events/GuestController.java` (new): guest status and upload.
- `events/GuestPhotosController.java` (new): creator moderation.
- Modify `events/EventRepository.java`, `events/EventController.java`, `events/PublicEventController.java`, `application.yml`, `db/migration/V11__guest_uploads.sql` (new).
- Tests: `src/test/java/ro/ghil/memoriesbe/GuestUploadTests.java` (new) and updates to `MemoriesbeApplicationTests.java`.

Frontend `src/`: `guestAuth.js`, `prepareImage.js`, `components/GuestUpload.jsx`, `components/GuestPhotos.jsx`, `components/TagFilter.jsx` (all new); modify `pages/EventDetail.jsx`, `pages/PublicGallery.jsx`, `components/PhotoStream.jsx`, `pages/Privacy.jsx`, `App.css`.

---

## Part 1: Backend (`D:\WorkspaceGit\memoriesbe`)

### Task B1: Database and event settings

**Files:**
- Create: `src/main/resources/db/migration/V11__guest_uploads.sql`, `events/GuestRepository.java`
- Modify: `events/EventRepository.java` (the `Event` record), `events/EventController.java`, `MemoriesbeApplicationTests.java`

**Interfaces:**
- Produces: `EventRepository.Event` gains two trailing components `boolean guestUploadsEnabled, int guestUploadLimit`. `EventRepository.setGuestUploads(UUID id, boolean enabled, int limit)`. `EventDto` gains `boolean guestUploadsEnabled, int guestUploadLimit`. Endpoint `PUT /api/v1/events/{id}/guest-uploads` body `{enabled: boolean, limit: int}` returns `EventDto`.
- Produces `GuestRepository` (`@Repository`, `JdbcClient`) with records `Guest(UUID id, UUID eventId, String sub, String name, OffsetDateTime createdAt)` and `Upload(UUID id, UUID eventId, UUID guestId, String objectKey, OffsetDateTime createdAt, OffsetDateTime deletedAt)` and methods:
  `Guest ensureGuest(UUID eventId, String sub, String name)` (insert, or on conflict `(event_id, sub)` update the name; return the row),
  `Guest lockGuest(UUID guestId)` (`select ... for update`),
  `int usedBy(UUID guestId)` (counts deleted too), `int totalFor(UUID eventId)`,
  `void insertUpload(UUID id, UUID eventId, UUID guestId, String objectKey)`,
  `List<Guest> guestsWithPhotos(UUID eventId)` (guests with at least one non-deleted upload, ordered by name),
  `List<Upload> uploads(UUID eventId)` (non-deleted, newest first), `Optional<Upload> upload(UUID id, UUID eventId)`, `void markDeleted(UUID id)`, `Optional<Guest> guest(UUID id)`.

- [ ] **Step 1: Write the failing test** in `MemoriesbeApplicationTests`: `guestUploadSettingsAreValidatedAndOwnerOnly` — `PUT /api/v1/events/{id}/guest-uploads` with `{"enabled":true,"limit":51}` and `{"enabled":true,"limit":-1}` return 400; `{"enabled":true,"limit":50}` returns 200, verifies `repo.setGuestUploads(id, true, 50)` and `$.guestUploadLimit` is 50 (stub `repo.eventOf` to return an event built with the new components); another subject gets 404.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=MemoriesbeApplicationTests` — fails to compile.
- [ ] **Step 3: Write** `V11__guest_uploads.sql`: `alter table events add column guest_uploads_enabled boolean not null default false` and `guest_upload_limit int not null default 0 check (guest_upload_limit between 0 and 50)`; table `event_guests(id uuid pk, event_id uuid not null references events on delete cascade, sub text not null, name text not null, created_at timestamptz not null default now(), unique(event_id, sub))`; table `guest_uploads(id uuid pk, event_id uuid not null references events on delete cascade, guest_id uuid not null references event_guests on delete cascade, object_key text not null, created_at timestamptz not null default now(), deleted_at timestamptz)` with indexes on `event_id` and `guest_id`.
- [ ] **Step 4: Implement** the `Event` record change, `setGuestUploads`, `GuestRepository`, the `EventDto` fields filled in `dto(...)`, and the endpoint (validate 0..50, `owned(jwt, id)` first). Update every `new EventRepository.Event(` call in `MemoriesbeApplicationTests` (append `false, 0`).
- [ ] **Step 5: Run** `./mvnw -q test` — all pass.

### Task B2: Guest tokens without the photographer allow-list

**Files:**
- Create: `GoogleTokens.java`; test in `GuestUploadTests.java`
- Modify: `SecurityConfig.java`

**Interfaces:**
- Produces: `GoogleTokens.validators(String clientId, List<String> allowedEmails)` returning `OAuth2TokenValidator<Jwt>` that checks issuer, audience, verified email, and the allow-list only when the list is non-empty; `GoogleTokens.validators(clientId, List.of())` is the guest variant. `GoogleTokens.GUEST_PREFIX = "/api/v1/guest/"`.

- [ ] **Step 1: Write failing tests** in `GuestUploadTests`: build `Jwt` objects (`Jwt.withTokenValue("t").header("alg","none").claim(...)`) and assert: photographer validator rejects `x@y.z` when allow-list is `[a@b.c]`; guest validator (empty list) accepts it; both reject `email_verified=false`, wrong audience, wrong issuer.
- [ ] **Step 2: Run** `./mvnw -q test -Dtest=GuestUploadTests` — fails.
- [ ] **Step 3: Implement** `GoogleTokens` by moving the three validators out of `SecurityConfig.jwtDecoder` unchanged in behavior. In `SecurityConfig`, build two `NimbusJwtDecoder`s (same JWK URI) and use `oauth2ResourceServer(o -> o.authenticationManagerResolver(req -> req.getRequestURI().startsWith(GoogleTokens.GUEST_PREFIX) ? guestManager : photographerManager))` where each manager is `new JwtAuthenticationProvider(decoder)::authenticate`. Keep the `@Bean JwtDecoder` for photographers so existing wiring and `jwt()` test post-processors keep working.
- [ ] **Step 4: Run** `./mvnw -q test` — pass.

### Task B3: Guest status and upload

**Files:**
- Create: `events/ImageSniffer.java`, `events/GuestUploadService.java`, `events/GuestController.java`, `events/UploadRateLimiter.java`
- Modify: `application.yml` (multipart `max-file-size` and `max-request-size` to `16MB`), check the profile-picture endpoint in `profile/ProfileController.java` enforces its own 3 MB cap and add one if missing
- Test: `GuestUploadTests.java`

**Interfaces:**
- Consumes: Task B1 `GuestRepository`, `EventRepository.Event`, `PhotoStorage.put(String key, byte[] bytes, String contentType)`, `EventAccess.require(Event, String password)`.
- Produces: `ImageSniffer.detect(byte[]): Optional<String>` returning `"jpg"`, `"png"` or `"webp"`. `UploadRateLimiter.tryAcquire(String sub): boolean` (sliding window, 20 uploads per minute per sub). `GuestUploadService.upload(Event event, String sub, String name, byte[] bytes): int` returns remaining uploads and throws `ResponseStatusException`: 403 "Uploads are switched off for this event" when disabled or limit 0, 403 "You've used all your uploads" at the limit or the 2000 event cap, 400 when `detect` is empty, 413 over 15 MB, 429 when rate limited. `GuestUploadService.status(Event, String sub): Status(boolean enabled, int limit, int used)`.
- Endpoints (JWT required, any verified Google account): `GET /api/v1/guest/photographers/{slug}/events/{eventSlug}/status`, `POST .../photos` multipart field `file`, returns `{remaining}`. Both read header `X-Event-Password`. Display name = `name` claim, else the part of `email` before `@`, else "Guest".

- [ ] **Step 1: Write failing tests** in `GuestUploadTests` (Mockito, `GuestRepository`, `PhotoStorage` mocked): `sniffer` accepts JPEG `FF D8 FF`, PNG signature, WebP `RIFF....WEBP`, rejects `<svg`, `<html`, empty; `uploadStoresUnderTheGuestPrefixAndReturnsRemaining`; `rejectsWhenDisabledOrLimitZeroOrReached` (403, nothing stored); `locksTheGuestBeforeCounting` using `InOrder(repo)` that `lockGuest` precedes `usedBy` precedes `insertUpload`; `failedStorageWriteLeavesNoUploadRow` (storage throws, assert the exception propagates and the transaction template rolls back — run the service with a `TransactionTemplate` over a mock `PlatformTransactionManager` and verify rollback); `htmlNamedJpgIs400`; `over15MbIs413`; `missingNameClaimFallsBackToEmailPrefix`; MockMvc: `protectedEventNeedsPasswordForStatusAndUpload` (401 without, 403 wrong), anonymous request to the guest path is 401.
- [ ] **Step 2: Run** them — fail.
- [ ] **Step 3: Implement** the classes above. Inside `TransactionTemplate`: `ensureGuest`, `lockGuest`, check limits against `usedBy` and `totalFor`, `insertUpload`, then `storage.put`. Key: `"events/" + eventId + "/guests/" + guestId + "/" + UUID + "." + ext`; content type from the sniffed type.
- [ ] **Step 4: Run** `./mvnw -q test` — pass.

### Task B4: Tags, filtering and guest photos in the public views

**Files:**
- Modify: `events/PublicEventController.java`
- Test: `MemoriesbeApplicationTests.java` (extend the existing `photoStream...` test setup)

**Interfaces:**
- Consumes: `GuestRepository.guestsWithPhotos`, `EventController.keyPrefix`, new guest prefix helper `EventController.guestPrefix(UUID eventId, UUID guestId): String` (`events/<eventId>/guests/<guestId>/`, add it).
- Produces: `record Tag(String id, String label, String kind, int count)` where `id` is the camera or guest UUID and `kind` is `"camera"` or `"guest"`. `StreamPhoto(String name, String url, String camera, String byId, String kind)` (`camera` keeps the label for compatibility). `PhotoPage` gains `List<Tag> tags` (always for the whole event, unfiltered) and `int guestLimit` (0 when guest uploads are off). `Folder(UUID id, String name, String kind, List<Photo> photos)` in the gallery response, guest folders appended after cameras; `Gallery` gains `int guestLimit`. `photos` endpoint accepts repeated `?by=<id>` filters; `total` and paging reflect the filtered set.

- [ ] **Step 1: Write failing tests**: `photoStreamIncludesGuestPhotosAndTags` (one camera, one guest with 1 photo: `tags` has two entries with counts, guest photo has `kind` "guest"); `photoStreamFiltersByOneOrMoreTags` (`?by=<camId>` gives only camera photos and `total` shrinks, `tags` unchanged; two `by` values give both); `galleryListsGuestFoldersAndGuestLimit`; `protectedEventStillHidesGuestPhotos` (extend the existing 401/403 check). Existing assertions must keep passing.
- [ ] **Step 2: Run** `./mvnw -q test` — new tests fail.
- [ ] **Step 3: Implement** by building a list of tag sources (cameras then guests) per request, listing entries per source with `storage.entries(prefix, label)`, filtering by the `by` set, sorting as today.
- [ ] **Step 4: Run** `./mvnw -q test` — pass.

### Task B5: Creator moderation

**Files:**
- Create: `events/GuestPhotosController.java`
- Test: `GuestUploadTests.java`

**Interfaces:**
- Consumes: `GuestRepository.uploads/upload/markDeleted/guest`, `PhotoStorage.signedUrl/delete`, `EventRepository.eventOf(id, ownerSub)`.
- Produces: `GET /api/v1/events/{id}/guest-photos` returns `[{id, url, guestName, createdAt}]` newest first; `DELETE /api/v1/events/{id}/guest-photos/{uploadId}` returns 204, deletes the R2 object, then `markDeleted` (the row stays so the photo still counts toward the guest's limit).

- [ ] **Step 1: Write failing tests**: owner lists and deletes (verifies `storage.delete(key)` then `markDeleted`); another subject gets 404 on both; an upload id from a different event gets 404; deleting twice is 404 the second time (stub `upload` empty after delete) and never calls storage again.
- [ ] **Step 2: Run** — fail. **Step 3: Implement.** **Step 4: Run** `./mvnw -q test` — all backend tests pass.

---

## Part 2: Frontend (`D:\WorkspaceGit\memoriesfe`)

### Task F1: Guest sign-in and the upload dialog

**Files:**
- Create: `src/guestAuth.js`, `src/prepareImage.js`, `src/components/GuestUpload.jsx`
- Modify: `src/pages/PublicGallery.jsx`, `src/components/PhotoStream.jsx` (render the button), `src/App.css`, `package.json` (add `heic2any`, pin an exact version)

**Interfaces:**
- Produces: `guestAuth.js`: `readGuestToken(): string | null`, `writeGuestToken(token | null)` (sessionStorage key `memories.guestToken`, try/catch wrapped like `social.js`), `guestFetch(path, { token, ...options })` that sets `Authorization` and returns the response. `prepareImage(file: File): Promise<File>` converts HEIC/HEIF to JPEG via `await import('heic2any')`, then downsizes so the long edge is at most 3000 px and re-encodes as JPEG quality 0.88 through a canvas; non-images throw `Error('Choose a photo')`. `<GuestUpload slug eventSlug limit password />`: the "Add your photos" button that opens the dialog (reuse `components/Modal.jsx`), rendered only when `limit > 0`.

- [ ] **Step 1: Implement** the dialog as three steps: (1) sign in with `GoogleLogin` inside its own `GoogleOAuthProvider` (copy the consent handling used around Google scripts in `components/Landing.jsx` and `consent.js`; do not load Google before that consent is given); (2) status fetch (`.../status`) showing "You can add N more photos"; two buttons, "Take a photo" (`<input type="file" accept="image/*" capture="environment">`) and "Choose from device" (`accept="image/*"`); (3) preview of the prepared image, the notice from Global Constraints, a "Upload photo" button, then success with remaining count and "Add another". A 401 clears the guest token, returns to step 1, and keeps the chosen file. Show backend 403/413/429 messages in `role="alert"`. When the limit is used up, show "You've used all your uploads". Send `X-Event-Password` from `passwordHeaders(password)`.
- [ ] **Step 2: Style** with the existing tokens in `App.css` (follow the look of the consent gate rows `.gate-*`: large tappable targets, visible focus, reduced-motion respected). Use the frontend-design skill for the visual pass.
- [ ] **Step 3: Verify** `npx vite build` passes. Manual: with a local backend, an event with guest limit 2, sign in as a non-allow-listed Google account, upload twice from phone-sized viewport, third attempt shows the used-up message, and the photo shows in the gallery after reload.

### Task F2: Creator settings and moderation

**Files:**
- Create: `src/components/GuestPhotos.jsx`
- Modify: `src/pages/EventDetail.jsx` (inside the existing `SettingsPanel`: checkbox "Let guests upload photos" and a number input 0 to 50 shown when ticked, saved with `PUT /api/v1/events/{id}/guest-uploads` through `apiFetch`; render `<GuestPhotos eventId />` below the cameras when enabled), `src/App.css`

**Interfaces:**
- Consumes: Task B1/B5 endpoints; `useAuth().apiFetch`.
- Produces: `<GuestPhotos eventId />` lists thumbnails with the guest name and a "Delete" button with a confirm step, removing the item on success and showing an error on failure.

- [ ] **Step 1: Implement** both pieces. Clamp the number input to 0..50 in the UI and show the server error text otherwise.
- [ ] **Step 2: Verify** `npx vite build`. Manual: ticking saves and persists after reload; a value of 51 cannot be saved; deleting a guest photo removes it from the public gallery after reload.

### Task F3: Tag chips

**Files:**
- Create: `src/components/TagFilter.jsx`
- Modify: `src/pages/PublicGallery.jsx` (replace the camera tabs), `src/components/PhotoStream.jsx` (profile), `src/App.css`

**Interfaces:**
- Consumes: Task B4 shapes (`folders[].kind`, `tags`, `photos[].byId`).
- Produces: `<TagFilter tags selected onChange />` where `tags` is `{id, label, kind, count}[]`, `selected` is a `Set` of ids, chips are toggle buttons with `aria-pressed`, a "Clear" button appears when anything is selected, camera and guest chips are visually distinct.

- [ ] **Step 1: Implement** in `PublicGallery.jsx`: build tags from `gallery.folders` (id, name, kind, `photos.length`), filter folders client-side by the selected set (empty set means all), keep the existing masonry and lightbox offsets working. Also render `<GuestUpload>` in the header when `gallery.guestLimit > 0`.
- [ ] **Step 2: Implement** in `PhotoStream.jsx`: tags come from the first page's `tags`; selecting chips resets `photos`/`next` and refetches with repeated `&by=<id>`; the dedupe key becomes `${p.byId}/${p.name}`; show an empty message "No photos for these tags" when a filter returns nothing; render `<GuestUpload>` when the page reports `guestLimit > 0`.
- [ ] **Step 3: Verify** `npx vite build`. Manual: two tags selected shows photos of both, clearing restores all, filters survive scrolling to the next page, keyboard focus is visible on chips.

### Task F4: Privacy page and final check

**Files:**
- Modify: `src/pages/Privacy.jsx`

- [ ] **Step 1: Add** a section "Photos added by guests": what is stored (Google name, Google account id, photos, upload times), that the name is shown next to the photo, that data is deleted with the event, who can remove a photo (the event creator), that guests can request erasure through the contact address already on the page, and a row for the `memories.guestToken` session-storage entry in the browser-storage table.
- [ ] **Step 2: Verify** `npx vite build`, then `./mvnw -q test` in the backend. Report anything not checked in a real browser.

---

## Self-review notes

- Spec coverage: settings and 0..50 (B1, F2); sign-in and take/choose/confirm/upload (B2, B3, F1); immediate publish (B3); creator-only deletion (B5, F2); tags in event gallery and profile (B4, F3); real Google name (B3); privacy notice and page (F1, F4); file rules (B3, F1); 2000 cap and rate limit (B3); allow-list split (B2).
- My calls beyond the spec: deleted photos still count toward the limit (soft delete); gallery filtering is client-side while the profile stream filters on the server; `camera` stays in the photo response next to the new `byId`/`kind` so nothing existing breaks; guest uploads are not limited to the camera-access window after the event date.
