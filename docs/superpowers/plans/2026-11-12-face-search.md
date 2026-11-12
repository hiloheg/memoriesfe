# Face Search ("Included myself") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest opens an event gallery, taps "Find my photos", takes a selfie, and the gallery narrows to the photos they appear in, shown as an "Included myself" tag.

**Architecture:** The backend (`memoriesbe`, Spring Boot 4 / Java 21, JdbcClient, Flyway) detects faces and computes 128-number embeddings with OpenCV's YuNet (detector) and SFace (recognizer), on the VPS CPU, with no paid service. A scheduled job indexes the photos of events that have the feature on; photos live only in R2 (no photo table), so the index is keyed by `(event_id, object_key, modified)`. A search endpoint embeds the selfie in memory, compares it with that event's embeddings (brute-force cosine) and returns the matching photos; the selfie and its embedding are never stored. The frontend (`memoriesfe`, React + Vite) adds the button, a consent and scan dialog, and the tag in `PublicGallery.jsx`.

**Tech Stack:** Java 21, Spring Boot 4.1.2, `org.openpnp:opencv` (OpenCV Java with bundled natives), YuNet + SFace ONNX models from OpenCV Zoo (MIT / Apache 2.0), Postgres (Neon) + Flyway, R2, React 19 + Vite, `node --test`.

**Spec:** none written (the user skipped the questions). The "Decisions" section below is the spec; the user's own words are: a button guests click to scan their face, a nice UI, photos sorted/filtered to the guest, a new tag "Included myself", free for photographers who paid for at least one credit, running free on the VPS.

## Decisions

User decisions:
- Feature is free for any photographer whose account is unlocked (has bought at least one credit). Uses the existing `CreditService.unlocked(ownerSub)`.
- Guest taps a button, scans their face, and a tag "Included myself" appears and filters the gallery.
- Everything runs on the VPS with open-source models. No paid API.

My calls (check these):
- Models: YuNet + SFace through OpenCV (permissive licenses). Not InsightFace (its pretrained models are non-commercial).
- It runs inside `memoriesbe`, not as a new service. If Task 1 shows OpenCV does not run on the VPS, stop and switch to a small Python sidecar (decide then).
- Off by default per event; the photographer switches it on in the event settings.
- A guest must tick a consent box before every scan. The selfie is processed in memory and discarded. Matching never crosses events.
- Gallery page only (`PublicGallery.jsx`). The profile photo stream (`PhotoStream.jsx`, newest 33) does not get it.
- During the 30-day launch window `unlocked()` is true for everyone, so the feature is also on for everyone then. That matches the other paid features.
- The match threshold is cosine similarity 0.363 (OpenCV's documented SFace value), configurable.

## Global Constraints

- Backend conventions (from `memoriesworker/CLAUDE.md` and the existing code): English identifiers and logs; config only through environment variables mapped in `application.yml`; Conventional Commits; UTC time; data access with Spring `JdbcClient` (no JPA); every public class gets a one-line purpose comment; pin exact dependency versions.
- Never log or store a selfie, a selfie embedding, or a person's identity. Stored data is only embeddings of faces found in event photos.
- Face data is deleted with the event: `on delete cascade` plus an explicit delete in `EventPurger`.
- Models come from OpenCV Zoo (`face_detection_yunet_2023mar.onnx`, `face_recognition_sface_2021dec.onnx`). Verify the download source and record the SHA-256 of each file in the `Dockerfile`.
- The Docker heap stays `-Xmx768m`; OpenCV memory is off-heap, so only one image is processed at a time in the indexer and one in the search path.
- Frontend copy: sentence case, plain words, no jargon. Buttons say what happens ("Find my photos", "Scan my face"). Errors say what to do.
- Tests: backend JUnit 5 + Mockito in `src/test/java/ro/ghil/memoriesbe/`; frontend `node --test` in `src/**/*.test.js`.

## Review Focus

- Selfie with no face, or with two similar-size faces: reject with a clear message (Task 4).
- A photo the photographer deleted after indexing must not appear in results (Task 4).
- A photo that cannot be decoded or resized must not stall the indexer forever; give up after 3 attempts (Task 3).
- Event with a password: the search must demand the same password as the gallery (Task 4).
- Feature off, owner not unlocked, or event expired/purged: search returns an error and nothing is indexed (Tasks 3 and 4).
- Same search spammed: rate limited per client (Task 4).
- Photos added after the first index (cameras keep uploading): picked up on the next tick, and the UI says scanning is still in progress (Tasks 3 and 4).

---

## File Structure

Backend, new package `src/main/java/ro/ghil/memoriesbe/faces/`:
- `FaceEngine.java`: interface, the only thing the rest of the code knows about OpenCV.
- `OpenCvFaceEngine.java`: YuNet + SFace implementation.
- `FaceMath.java`: cosine similarity and byte/float conversion. Pure, easy to test.
- `FaceRepository.java`: the two tables.
- `FaceIndexer.java`: indexes pending photos of one event.
- `FaceIndexJob.java`: scheduled caller.
- `FaceSearchService.java`: selfie → matching photos.
- `FaceSearchController.java`: the public endpoint.
- `FaceSearchRateLimiter.java`: per-client limit.

Backend, modified: `db/migration/V19__face_search.sql` (new), `events/EventRepository.java`, `events/EventController.java`, `events/PublicEventController.java` (flag in `Gallery`), `events/EventPurger.java`, `Dockerfile`, `pom.xml`, `application.yml`, `.env.example`.

Frontend, new: `src/faceSearch.js` (pure helpers), `src/faceSearch.test.js`, `src/components/FaceSearch.jsx`. Modified: `src/pages/PublicGallery.jsx`, `src/components/TagFilter.jsx` (or a sibling chip), `src/pages/EventDetail.jsx`, `src/pages/Privacy.jsx`, `src/App.css`.

---

### Task 1: Prove OpenCV face recognition runs here (go / no-go spike)

**Files:**
- Modify: `D:\WorkspaceGit\memoriesbe\pom.xml`, `D:\WorkspaceGit\memoriesbe\Dockerfile`
- Create: `src/main/java/ro/ghil/memoriesbe/faces/FaceEngine.java`, `src/main/java/ro/ghil/memoriesbe/faces/OpenCvFaceEngine.java`
- Test: `src/test/java/ro/ghil/memoriesbe/FaceEngineTests.java`
- Test resources: `src/test/resources/faces/` (two photos of the same person, one of a different person, one with no face; use the user's own or license-free images, never real guests)

**Interfaces:**
- Produces:
  ```java
  public interface FaceEngine {
      /** A face found in an image: position and size in pixels, and the 128 numbers that describe it. */
      record Face(int x, int y, int width, int height, float[] embedding) {}
      /** Every face in the JPEG/PNG bytes, largest first. Empty when none. */
      List<Face> faces(byte[] image);
  }
  ```
  `OpenCvFaceEngine(Path modelDir)` implements it.

- [ ] **Step 1: Write the failing test.** `sameAndDifferentPeople`: with the engine built on the real models, `faces(a1)` and `faces(a2)` each return 1 face; cosine(a1,a2) ≥ 0.363 and cosine(a1,b) < 0.363; `faces(noFace)` is empty. Skip the test with `Assumptions.assumeTrue(Files.exists(modelDir))` when the models are not present locally, and say so in the output.
- [ ] **Step 2: Run it and see it fail** (`./mvnw -q test -Dtest=FaceEngineTests`): fails with compile error, `FaceEngine` missing.
- [ ] **Step 3: Add the dependency** `org.openpnp:opencv` at an exact version that exists on Maven Central and ships Linux natives for the VPS architecture (check `uname -m` on the VPS through the operator; cite the artifact page in the commit message). Load natives with `nu.pattern.OpenCV.loadLocally()` once.
- [ ] **Step 4: Implement `OpenCvFaceEngine.faces`** using `FaceDetectorYN` (input resized so the long side is at most 1600) and `FaceRecognizerSF` (`alignCrop` then `feature`, which gives 128 floats). Return faces sorted by area, largest first. Free every `Mat`.
- [ ] **Step 5: Download the models in the `Dockerfile` run stage** into `/app/models` with `curl` and `sha256sum -c`, and set `ENV FACE_MODEL_DIR=/app/models`. Locally, download the same two files into `models/` (git-ignored) to run the test.
- [ ] **Step 6: Run the test.** Expected: PASS.
- [ ] **Step 7: Build the Docker image and run the same check inside it** (`docker build`, then a one-off `java -cp` call or a throwaway main). Record the time for one 1600px photo and the container's peak memory in the commit message. **Go / no-go:** if it cannot load the natives on the VPS architecture, or takes more than 2 seconds per photo, stop and report; do not continue to Task 2.
- [ ] **Step 8: Commit** `feat: face detection and embeddings with OpenCV YuNet and SFace`

---

### Task 2: Store the faces and the on/off switch

**Files:**
- Create: `src/main/resources/db/migration/V19__face_search.sql`, `src/main/java/ro/ghil/memoriesbe/faces/FaceMath.java`, `src/main/java/ro/ghil/memoriesbe/faces/FaceRepository.java`
- Modify: `events/EventRepository.java` (the `Event` record and queries), `events/EventController.java` (new endpoint, `EventDto`), `events/PublicEventController.java` (`Gallery`), `events/EventPurger.java`
- Test: `src/test/java/ro/ghil/memoriesbe/FaceMathTests.java`, `src/test/java/ro/ghil/memoriesbe/FaceSwitchTests.java`

**Interfaces:**
- Consumes: `FaceEngine.Face` from Task 1.
- Produces:
  ```java
  public final class FaceMath {
      public static double cosine(float[] a, float[] b);       // 0 when either vector is all zeros
      public static byte[] toBytes(float[] v);                  // little-endian floats
      public static float[] fromBytes(byte[] b);
  }
  public class FaceRepository {
      public record IndexedPhoto(String objectKey, long version) {}
      public record StoredFace(String objectKey, float[] embedding) {}
      public Map<String, Long> indexedVersions(UUID eventId);                     // objectKey -> version, only rows with done = true
      public int attempts(UUID eventId, String objectKey);
      public void markFailedAttempt(UUID eventId, String objectKey);             // attempts + 1; done = true once attempts reach 3
      public void savePhoto(UUID eventId, String objectKey, long version, List<float[]> embeddings); // replaces old faces of this photo, sets done = true
      public List<StoredFace> faces(UUID eventId);
      public void deleteAllFor(UUID eventId);
  }
  ```
  `EventRepository.setFaceSearch(UUID id, boolean enabled)`; `Event` gains `boolean faceSearchEnabled` as its last component; `EventDto` gains `boolean faceSearchEnabled`; `PublicEventController.Gallery` gains `boolean faceSearch` (true only when the event has it on and the owner is unlocked). Endpoint: `PUT /api/v1/events/{id}/face-search` with body `{ "enabled": true }`, owner only, 402-style `403` "Face search comes with your first purchase." when the owner is not unlocked and `enabled` is true.

Migration:
```sql
alter table events add column face_search_enabled boolean not null default false;
create table event_face_photos (
    event_id   uuid   not null references events (id) on delete cascade,
    object_key text   not null,
    version    bigint not null,
    faces      int    not null default 0,
    attempts   int    not null default 0,
    done       boolean not null default false,
    primary key (event_id, object_key)
);
create table event_faces (
    id         uuid primary key default gen_random_uuid(),
    event_id   uuid not null references events (id) on delete cascade,
    object_key text not null,
    embedding  bytea not null
);
create index event_faces_event_idx on event_faces (event_id);
```

- [ ] **Step 1: Write failing tests.** `FaceMathTests`: `cosine` of identical vectors is 1.0 (±1e-6), of orthogonal vectors 0.0, of a zero vector 0.0; `fromBytes(toBytes(v))` equals `v`. `FaceSwitchTests` (same style as `CreditsTests`/`GuestUploadTests`): owner enables it with a purchase → `200` and `faceSearchEnabled` true; owner without a purchase after the launch window → `403`; another owner's event → `404`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement `FaceMath`.**
- [ ] **Step 4: Add `V19__face_search.sql` exactly as above.**
- [ ] **Step 5: Implement `FaceRepository`** with `JdbcClient`. `savePhoto` runs delete-then-insert in one transaction.
- [ ] **Step 6: Extend `EventRepository`, `EventController`, `PublicEventController`** as listed.
- [ ] **Step 7: In `EventPurger.purgeDue`, call `faces.deleteAllFor(id)` before `repo.markPurged(id)`** (inject `FaceRepository`). Add an assertion to `PurgeTests` that the call happens.
- [ ] **Step 8: Run the new tests and the whole backend suite.** Expected: all PASS.
- [ ] **Step 9: Commit** `feat: per-event face search switch and face storage`

---

### Task 3: Index the photos in the background

**Files:**
- Create: `faces/FaceIndexer.java`, `faces/FaceIndexJob.java`
- Modify: `application.yml`, `.env.example`
- Test: `src/test/java/ro/ghil/memoriesbe/FaceIndexerTests.java`

**Interfaces:**
- Consumes: `FaceEngine`, `FaceRepository` (Task 2), `PhotoStorage.entries(prefix, folder)`, `ThumbService.serve(key, version, 1600)` returning `Served(bytes, redirect)`, `CreditService.unlocked(sub)`, `EventRepository` (cameras, event list).
- Produces:
  ```java
  public class FaceIndexer {
      /** Indexes up to `limit` photos of the event that are new or changed; returns how many it handled. */
      public int indexSome(Event event, int limit);
      /** How many of the event's photos are indexed (or given up on) and how many exist. */
      public record Progress(int done, int total) {}
      public Progress progress(Event event);
  }
  ```
  Add `EventRepository.faceSearchEvents()` returning events with the switch on and not purged or expired. Config: `FACE_INDEX_BATCH` (default 10 photos per tick), `FACE_MODEL_DIR`, `FACE_MATCH_THRESHOLD` (default 0.363), in `application.yml` under `app.faces`.

How a photo is found: the event's photos are the union of camera and guest prefixes, exactly as `PublicEventController.sources` builds them; extract that into a shared method rather than copying it. A photo is "pending" when its `(objectKey, modified epoch seconds)` is not in `indexedVersions`.

- [ ] **Step 1: Write failing tests** with a fake `FaceEngine`, a mocked `PhotoStorage`/`ThumbService` and an in-memory or mocked `FaceRepository`:
  - `indexesOnlyNewPhotos`: 3 photos, 1 already indexed at the same version → engine is called twice.
  - `changedPhotoIsIndexedAgain`: same key, newer modified → indexed again and old faces replaced.
  - `photoWithoutFacesIsDone`: engine returns empty → `savePhoto` called with an empty list (so it is not retried).
  - `brokenPhotoGivesUpAfterThreeAttempts`: `ThumbService` returns a redirect each time → after the third `indexSome`, the photo counts as done and no more calls are made.
  - `respectsLimit`: 25 pending, limit 10 → exactly 10 handled.
  - `skipsWhenOwnerNotUnlocked`: the job does not call the indexer for such an event.
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement `FaceIndexer.indexSome` and `progress`.** Process photos one at a time, newest first. Use the 1600px copy from `ThumbService`; a redirect or an exception counts as a failed attempt (`markFailedAttempt`).
- [ ] **Step 4: Implement `FaceIndexJob`** with `@Scheduled(fixedDelayString = "${app.faces.interval-ms:30000}")`. Each tick: for each event from `faceSearchEvents()` whose owner `credits.unlocked(...)`, call `indexSome(event, batch)` and stop the tick after `batch` photos in total. Catch and log per event so one failure does not stop the rest.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: background face indexing of event photos`

---

### Task 4: The search endpoint

**Files:**
- Create: `faces/FaceSearchService.java`, `faces/FaceSearchController.java`, `faces/FaceSearchRateLimiter.java`
- Modify: `events/PublicEventController.java` only if a helper must be shared (event lookup, `sources`)
- Test: `src/test/java/ro/ghil/memoriesbe/FaceSearchTests.java`

**Interfaces:**
- Consumes: `FaceEngine`, `FaceRepository.faces`, `FaceIndexer.progress`, `EventAccess.require`, `EventLifetime.requireOpen`, `ImageSniffer`, `ImageResizer`, `PhotoStorage.entries`.
- Produces: `POST /api/v1/public/photographers/{slug}/events/{eventSlug}/face-search`, `multipart/form-data` with part `selfie` and field `consent=true`, optional header `X-Event-Password`. Response:
  ```java
  record Match(String folderId, String name, double score) {}
  record FaceSearchResult(List<Match> matches, int indexed, int total) {}
  ```
  `folderId` is the camera or guest id and `name` is the file name under that folder, the same pair `PublicEventController.Folder` + `GalleryPhoto.name` use, so the frontend can match without new ids.
  Errors (status, message): `400` "Please agree to the face scan first." when consent is missing; `404` when the event is unknown, the switch is off, or the owner is not unlocked; `401` / `403` for the password, as in the gallery; `422` "We could not see a face. Look at the camera in good light and try again."; `422` "More than one face is in the picture. Take it with only you in it."; `429` "Too many tries. Wait a minute."; `415` for a non-image.

- [ ] **Step 1: Write failing tests** with a fake engine that returns scripted embeddings:
  - `returnsPhotosWithAMatchingFace`: faces stored for photos p1 (similar), p2 (different), p3 (similar, two faces) → matches p1 and p3, each once, best score kept, sorted by score descending.
  - `ignoresPhotosThatNoLongerExist`: a stored face whose `object_key` is not in the current listing is not returned.
  - `needsConsent`: no `consent` → `400`, and the engine is never called.
  - `noFaceIs422` and `twoFacesIs422` (second face area above 60% of the largest).
  - `passwordIsRequired`: protected event, no header → `401`; wrong → `403`.
  - `switchOffOrOwnerNotUnlockedIs404`.
  - `rateLimited`: the 6th call in a minute from one client → `429`. Limit is 5 per minute per client; the key is the `CF-Connecting-IP` header, falling back to the remote address.
  - `reportsProgress`: `indexed` and `total` come from `FaceIndexer.progress`.
  - `selfieIsNeverKept`: after the call, nothing was written to `PhotoStorage.put` or to the repository (verify with `never()`).
- [ ] **Step 2: Run and see them fail.**
- [ ] **Step 3: Implement `FaceSearchRateLimiter`** (sliding window like `UploadRateLimiter`, `tryAcquire(String who)`, 5 per 60 seconds).
- [ ] **Step 4: Implement `FaceSearchService.search(Event event, byte[] selfie)`** → `FaceSearchResult`. Reject non-images with `ImageSniffer`, downscale with `ImageResizer` to at most 1000px, call `engine.faces`, apply the 422 rules, compare with `FaceMath.cosine` against `repo.faces(event.id())`, keep photos whose best score ≥ the configured threshold, intersect with the current listing, sort by score. Serialize searches (one at a time) with a `Semaphore(1)` and answer `429` rather than queue when it is busy for more than 3 seconds.
- [ ] **Step 5: Implement `FaceSearchController`** with the access checks in this order: event lookup → `lifetime.requireOpen` → `access.require` → switch and unlock → consent → rate limit → search.
- [ ] **Step 6: Run the tests and the whole backend suite.** Expected: PASS.
- [ ] **Step 7: Commit** `feat: public face search endpoint`

---

### Task 5: Frontend helpers and the scan dialog

**Files:**
- Create: `src/faceSearch.js`, `src/faceSearch.test.js`, `src/components/FaceSearch.jsx`
- Modify: `src/App.css`

**Interfaces:**
- Produces in `src/faceSearch.js`:
  ```js
  export async function searchFace({ apiUrl, slug, eventSlug, password, selfie }) // Blob -> { matches: [{ folderId, name, score }], indexed, total }; throws Error(message) with the server's message
  export function matchKey(folderId, name)            // `${folderId}/${name}`
  export function filterFolders(folders, matches)     // folders with only the photos in matches, same order; matches=null returns folders unchanged
  ```
  `FaceSearch.jsx` default export: `FaceSearch({ open, onClose, onFound, searchOptions })` where `searchOptions` is `{ apiUrl, slug, eventSlug, password }` and `onFound(result)` receives the result of `searchFace`.

- [ ] **Step 1: Write failing tests** in `faceSearch.test.js`: `matchKey('c1','a.jpg') === 'c1/a.jpg'`; `filterFolders` keeps only matching photos and keeps the folders' order; `filterFolders(folders, null)` returns the same folders; a folder with no matches is dropped; `searchFace` with a stubbed `fetch` returning `{ ok:false, status:422, json: async () => ({ message: 'We could not see a face.' }) }` rejects with that message (read how the existing code reads error bodies, e.g. in `GuestUpload.jsx`, and copy that).
- [ ] **Step 2: Run `npm test` and see them fail.**
- [ ] **Step 3: Implement `faceSearch.js`.**
- [ ] **Step 4: Implement `FaceSearch.jsx` using `Modal.jsx`.** Flow in one dialog: (1) a short plain explanation and a required checkbox "I agree to a scan of my face to find my photos. The picture is not saved." with a link to `/privacy#faces`; (2) after consent, live camera preview from `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` inside an oval frame; a button "Scan my face" that grabs one frame to a canvas (max 1000px, JPEG 0.85) and uploads it; a secondary "Choose a photo instead" file input for phones that deny the camera; (3) a scanning state with a moving scan line that respects `prefers-reduced-motion` (no animation then, a static frame and the words "Looking for you…"); (4) errors from the server shown in place with "Try again"; (5) when `indexed < total`, after a result the dialog says "Still looking through the newest photos (X of Y). Try again in a minute for more." Stop the camera tracks on close.
- [ ] **Step 5: Style it in `App.css`** using the existing tokens (look at `Modal` and `.tab` styles; do not invent a new palette). Mobile first, visible focus, 44px touch targets.
- [ ] **Step 6: Run `npm test` and `npx vite build`.** Expected: PASS and a successful build.
- [ ] **Step 7: Commit** `feat: face search dialog and helpers`

---

### Task 6: Wire the button and the "Included myself" tag into the gallery

**Files:**
- Modify: `src/pages/PublicGallery.jsx`, `src/components/TagFilter.jsx`, `src/App.css`
- Test: add cases to `src/faceSearch.test.js`

**Interfaces:**
- Consumes: `gallery.faceSearch` (boolean from Task 2), `FaceSearch`, `filterFolders`, `matchKey` (Task 5).
- Produces: `TagFilter` accepts an optional prop `mine` shaped `{ active: boolean, count: number, onClear: () => void }`; when `mine.active` it renders one extra chip labelled "Included myself" with the count and an "x" to clear, using the same `tab` classes and `aria-pressed`.

- [ ] **Step 1: Write a failing test** for a helper `visibleFolders(gallery.folders, selectedIds, matches)` in `faceSearch.js`: camera/guest tags and the face result combine as AND (a photo must be in a selected folder and in the matches); no tags and `matches=null` returns everything.
- [ ] **Step 2: Run and see it fail.**
- [ ] **Step 3: Implement `visibleFolders`.**
- [ ] **Step 4: Edit `PublicGallery.jsx`:** keep `matches` in state (`null` = no face filter). Show a "Find my photos" button above the tags only when `gallery.faceSearch` is true. On a result, set `matches`, close the dialog, and scroll to the top. Use `visibleFolders` where the current code filters `gallery.folders`. When there are zero matches, show "We did not find you yet. Try a closer picture, or check again later." with a "Try again" button. Show the existing `{shown} photos match your choice` status for the face filter too. Pass the `password` the page already holds into `searchOptions`.
- [ ] **Step 5: Edit `TagFilter.jsx`** to render the "Included myself" chip. It must render even when `tags.length < 2` (today it returns `null` then), so change the early return to `tags.length < 2 && !mine?.active`.
- [ ] **Step 6: Run `npm test` and `npx vite build`.** Then open the gallery in the browser with a test event and check by eye: the button shows only with the switch on, the camera opens, a scan filters the photos, the chip clears it, keyboard focus works, and 360px width has no horizontal scroll. Report what you saw; do not claim it works from the build alone.
- [ ] **Step 7: Commit** `feat: Find my photos and the Included myself tag in the gallery`

---

### Task 7: Photographer switch and privacy text

**Files:**
- Modify: `src/pages/EventDetail.jsx` (`SettingsPanel`, `saveSettings`), `src/pages/Privacy.jsx`

**Interfaces:**
- Consumes: `event.faceSearchEnabled` (Task 2), `PUT /api/v1/events/{id}/face-search`.

- [ ] **Step 1: In `SettingsPanel`, add a checkbox "Let guests find their photos by scanning their face"** next to the guest-uploads one, with a hint: "Guests agree to a face scan first; their picture is not saved. Included with your first purchase." If the account is not unlocked, show it disabled with the existing `LockedNotice`/credits pattern (look at how other locked features do it). Include it in the `dirty` check and in `saveSettings` (`call('/face-search', 'PUT', { enabled })`), following the guest-uploads code at `EventDetail.jsx:315`.
- [ ] **Step 2: Add a section `id="faces"` to `Privacy.jsx`** in the same style as `id="photos"`: what is processed (face measurements of people in the event photos and of the guest's own picture while they search), why (to let a guest find their photos, only when the photographer switched it on and the guest agreed), that the guest's picture and its measurements are not stored, that the photo measurements are deleted with the event, that the photographer is the controller of the photos and imemories the processor, and how to object. Mark it clearly for legal review before launch and update `UPDATED`.
- [ ] **Step 3: Run `npm test` and `npx vite build`.** Then in the browser: toggle the switch, save, reload, and see it persist.
- [ ] **Step 4: Commit** `feat: photographers can switch face search on; privacy text`

---

### Task 8: Rollout check on the VPS

**Files:** `memoriesbe/.env.example`, `memoriesworker/deploy/vps-setup.md` (operator notes; per the worker's rules, nothing is run on the VPS outside the deploy workflow).

- [ ] **Step 1: Document in `.env.example`** `FACE_MODEL_DIR`, `FACE_INDEX_BATCH`, `FACE_MATCH_THRESHOLD`, `FACE_INDEX_INTERVAL_MS` with placeholders.
- [ ] **Step 2: Note in `vps-setup.md`** the extra memory the container may use, and that the image downloads about 40 MB of models at build time.
- [ ] **Step 3: Staging test with a real event of at least 200 photos:** record indexing speed (photos per minute), peak container memory, and match quality at 0.363 (miss and false-match counts for 5 volunteer faces). If quality is poor, tune `FACE_MATCH_THRESHOLD` and write the chosen value and the numbers in the PR description.
- [ ] **Step 4: Open the PR** with the test results, the numbers from Task 1 and Step 3, and the list of "My calls" from the Decisions section.

---

## Self-review

- Spec coverage: button and scan UI (Tasks 5, 6), tag "Included myself" (Task 6), free for paying photographers (Tasks 2, 3, 4 use `unlocked`), free and on the VPS (Tasks 1, 8), consent and privacy (Tasks 4, 5, 7), deletion with the event (Task 2).
- Type consistency: `FaceEngine.Face`, `FaceRepository` methods, `Match(folderId, name, score)` and `FaceSearchResult(matches, indexed, total)` are used with the same names in Tasks 3 to 6; `faceSearchEnabled` (event/DTO) vs `faceSearch` (gallery flag) are different on purpose.
- Open risk: Task 1 may fail on the VPS architecture; it is the first task so nothing else is built on a bad assumption.
- Not covered on purpose: the profile photo stream, searching across events, remembering a guest's face between visits, a Python fallback.
