# Photographer logo and download editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A photographer uploads a logo; downloading a camera photo opens an on-device editor (logo, social crop, looks) and saves the result.

**Architecture:** The backend stores one logo per profile (R2, like the avatar) and exposes a presigned `logoUrl` in the public photo payloads. The frontend editor runs entirely in the browser on a canvas: pure geometry in `editorMath.js` (unit tested with `node --test`), drawing in `renderEdit.js`, UI in `PhotoEditor.jsx` opened from the Lightbox's Download button.

**Tech Stack:** Spring Boot 4.1.2 / Java 21 / JdbcClient / Flyway / MockMvc + Mockito (backend `D:\WorkspaceGit\memoriesbe`); React 19 + Vite, no test runner yet, so `node --test` on plain ES modules (frontend `D:\WorkspaceGit\memoriesfe`).

**Spec:** `D:\WorkspaceGit\memoriesfe\docs\superpowers\specs\2026-11-11-logo-and-photo-editor-design.md`

## Global Constraints

- Logo: one per profile; JPEG, PNG or WebP; magic-byte sniffed; 2 MB cap; at most 2000 px per side where the image can be decoded.
- Logo is drawn only at download time, never on stored files, never in the gallery or lightbox view, never on `kind: "guest"` photos.
- Logo placement: bottom-right, width 18% of output width, margin 3% of output width, height capped at 12% of output height (width shrinks to keep ratio). The editor cannot move, resize or remove it.
- Presets: Original (source size, long edge capped at 4000), Instagram post square 1:1 1080x1080, Instagram post portrait 4:5 1080x1350, Instagram story 9:16 1080x1920, Facebook post 1.91:1 1200x630.
- Crop frame is always filled (no letterboxing); a source smaller than the preset yields the largest exact-ratio size it can fill, never an upscale.
- Looks: Original, Black and white, Warm, Cool, Vivid, plus brightness and contrast sliders; applied before the logo is drawn so the logo is never tinted.
- Output: JPEG quality 0.92, file name `<original-name>-<preset-key>.jpg`.
- Photos are fetched with CORS (the owner configured the R2 CORS rule for `https://imemories.eu`, `https://www.imemories.eu`, `http://localhost:5173`); no backend proxy.
- No new runtime dependencies. No commits unless the owner asks (this repo's working rule): the "Commit" steps below mean stage nothing and skip if not asked.

## Review Focus

1. Photographer has no logo: download must still work, with no logo and no errors (Task 2 test, Task 4 math test for `logoRect(null)`).
2. Guest photo: never stamped (Task 5 `shouldStamp` test).
3. Tall or huge logo: clamped to 12% height (Task 3 test).
4. Source smaller than the preset: frame still filled, no upscale (Task 3 tests).
5. Image already cached by the grid without CORS headers makes the canvas fail: fetch with `cache: 'reload'` (Task 4 note, manual check in Task 6).

---

### Task 1: Backend logo storage and endpoints

**Files:**
- Create: `memoriesbe/src/main/resources/db/migration/V17__profile_logo.sql`
- Modify: `profile/ProfileRepository.java` (record `Profile`, `COLUMNS`, new `setLogoKey`), `profile/ProfileViews.java` (`ProfileDto`, new `logoUrl(Profile)`), `profile/ProfileController.java` (new endpoints)
- Modify tests: every `new Profile(...)` / `profile(...)` helper in `MemoriesbeApplicationTests.java` gets the new `logoKey` argument
- Test: `memoriesbe/src/test/java/ro/ghil/memoriesbe/MemoriesbeApplicationTests.java`

**Interfaces:**
- Produces: `Profile.logoKey()` (String, nullable); `ProfileRepository.setLogoKey(String ownerSub, String key)`; `ProfileViews.logoUrl(Profile p): String` (presigned URL or `""`); `ProfileDto` gains `String logo` (the same URL or `""`); `POST /api/v1/profile/logo` (multipart `file`) and `DELETE /api/v1/profile/logo`, both returning `ProfileDto`.

- [ ] **Step 1: Write failing tests** in `MemoriesbeApplicationTests`:
  - `logoUploadStoresItAndReplacesTheOldOne`: multipart PNG bytes (valid PNG header + IHDR 100x40) → 200, `repo` `setLogoKey` called with key starting `profiles/<publicToken>/logo/` and ending `.png`; `storage.delete(oldKey)` called when a previous key existed.
  - `logoRejectsWrongTypeAndTooBig`: bytes `{1,2,3}` → 400; 2 MB + 1 byte PNG → 400.
  - `logoRejectsOversizedDimensions`: PNG header declaring 2001x100 → 400.
  - `logoCanBeRemoved`: DELETE → `setLogoKey(sub, null)` and `storage.delete(key)`.
  - `profileDtoCarriesLogoUrlOrEmpty`: with a key, `$.logo` equals the mocked `storage.signedUrl`; without, `$.logo` is `""`.
- [ ] **Step 2: Run** `./mvnw test -Dtest=MemoriesbeApplicationTests` → Expected: new tests FAIL (compile error on `logoKey`).
- [ ] **Step 3: Implement.** `V17__profile_logo.sql`: `alter table profiles add column logo_key text;`. Add `logo_key` to `COLUMNS` and `String logoKey` to `Profile` (next to `avatarKey`). Controller methods mirror `uploadAvatar`/`removeAvatar` (reuse `extensionOf`, `contentType`, `bad`), with the key layout `profiles/<publicToken>/logo/<uuid>.<ext>`. Dimension check: read width/height straight from the PNG IHDR or JPEG SOF header in a small `ImageSniffer`-style helper `ImageDimensions.of(byte[]): int[]` (returns null if unknown, e.g. WebP, which then skips the check); reject if either side > 2000.
- [ ] **Step 4: Run** the same command → Expected: all PASS, whole suite green (`./mvnw test`).
- [ ] **Step 5: Commit** (only if asked).

### Task 2: Backend `logoUrl` in public payloads

**Files:**
- Modify: `events/PublicEventController.java` (records `PhotoPage`, `Gallery`; methods `photos`, `gallery`), plus whatever resolves the owner's profile (inject `ProfileRepository` and `ProfileViews`)
- Test: `MemoriesbeApplicationTests.java`

**Interfaces:**
- Consumes: `ProfileViews.logoUrl(Profile)`, `ProfileRepository.bySub(String)`.
- Produces: `PhotoPage` and `Gallery` each gain a final `String logoUrl` component (`""` when the owner has no logo). `StreamPhoto.kind` and `Folder.kind` already exist.

- [ ] **Step 1: Write failing tests:** `photoStreamIncludesTheOwnersLogoUrl` (owner profile has logoKey → `$.logoUrl` equals signed URL), `photoStreamLogoUrlIsEmptyWithoutLogo`, `tokenGalleryIncludesLogoUrl` (`/api/v1/public/events/{token}` → `$.logoUrl`).
- [ ] **Step 2: Run** `./mvnw test -Dtest=MemoriesbeApplicationTests` → Expected: FAIL (no `logoUrl`).
- [ ] **Step 3: Implement** by loading `profiles.bySub(event.ownerSub())` once per request and appending `views.logoUrl(profile)`; a missing profile yields `""`.
- [ ] **Step 4: Run** `./mvnw test` → Expected: all green.
- [ ] **Step 5: Commit** (only if asked).

### Task 3: Editor geometry (pure functions, unit tested)

**Files:**
- Create: `memoriesfe/src/editor/editorMath.js`, `memoriesfe/src/editor/editorMath.test.js`
- Modify: `memoriesfe/package.json` (script `"test": "node --test src/editor"`)

**Interfaces:**
- Produces (all pure, no DOM):
  - `PRESETS`: array of `{ key, label, ratio, width }`; `key` in `original`, `ig-square`, `ig-portrait`, `ig-story`, `fb-post`; `original` has `ratio: null, width: null`.
  - `outputSize(preset, srcW, srcH): { width, height }`: preset with ratio → largest exact-ratio size not above the preset width and not above what the source can fill; `original` → source size scaled down so the long edge is at most 4000.
  - `minZoomCrop(frameRatio, srcW, srcH): { w, h }`: the largest source-pixel rectangle of that ratio inside the source (the crop at zoom 1).
  - `cropRect(frameRatio, srcW, srcH, zoom, cx, cy): { x, y, w, h }`: crop of `minZoomCrop / zoom` (zoom ≥ 1), centered on `(cx, cy)` in source pixels, clamped so it stays inside the source.
  - `logoRect(outW, outH, logoW, logoH): { x, y, w, h } | null`: null when `logoW`/`logoH` are falsy; width 18% of `outW`, margin 3% of `outW`, height capped at 12% of `outH` with width reduced to keep ratio; positioned bottom-right.
  - `shouldStamp(photo, logoUrl): boolean`: true only when `logoUrl` is non-empty and `photo.kind !== 'guest'`.
  - `LOOKS`: `{ key, label, filter }` list (`original` filter `''`, `bw` `grayscale(1)`, `warm` `sepia(0.35) saturate(1.2)`, `cool` `hue-rotate(185deg) saturate(0.9)`, `vivid` `saturate(1.5) contrast(1.1)`); `filterString(look, brightness, contrast): string` composing the look filter with `brightness(b) contrast(c)` (sliders are 0.5..1.5, default 1).

- [ ] **Step 1: Write failing tests** with `node:test` and `assert`:
  - `outputSize` ig-story with a 4000x3000 source → `{ width: 1080, height: 1920 }` (the largest 9:16 crop of the source is 1687x3000, bigger than the preset, so no downscale below the preset); source 800x600 + ig-story → `{ width: 337, height: 600 }` (largest 9:16 crop, not upscaled); source 800x600 + ig-square → `{ width: 600, height: 600 }`; source 1200x800 + `original` → `{1200, 800}`; source 8000x4000 + `original` → `{4000, 2000}`.
  - `cropRect`: zoom 1 equals `minZoomCrop`; zoom 2 halves w and h; center near an edge is clamped inside `[0, srcW-w]`.
  - `logoRect`: 1000x1000 output with a 400x100 logo → w 180 h 45, x = 1000-30-180, y = 1000-30-45; a 100x1000 tall logo → h 120 (12%), w 12; `logoRect(…, 0, 0)` → null.
  - `shouldStamp`: guest photo false; camera photo with logoUrl true; camera photo with `''` false.
  - `filterString(LOOKS[0], 1, 1)` contains `brightness(1)` and `contrast(1)`.
- [ ] **Step 2: Run** `npm test` → Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the functions above in `editorMath.js` (ES module, no imports).
- [ ] **Step 4: Run** `npm test` → Expected: all PASS.
- [ ] **Step 5: Commit** (only if asked).

### Task 4: Render pipeline and the logo setting in the profile editor

**Files:**
- Create: `memoriesfe/src/editor/renderEdit.js`
- Modify: `memoriesfe/src/pages/ProfileEditor.jsx` (logo upload/replace/remove next to the picture, near the avatar handlers around line 268), `memoriesfe/src/App.css`

**Interfaces:**
- Consumes: everything from `editorMath.js`.
- Produces:
  - `loadImage(url): Promise<ImageBitmap>`: `fetch(url, { mode: 'cors', cache: 'reload' })` → blob → `createImageBitmap`. The `reload` is deliberate: the grid may have cached the same URL without CORS headers.
  - `renderEdit({ photo, logo, preset, zoom, cx, cy, lookKey, brightness, contrast, target }): void`: draws the crop to `target` (a canvas sized by `outputSize`), applying `filterString` to the photo draw only, then draws `logo` (an ImageBitmap or null) at `logoRect`.
  - `exportJpeg(canvas): Promise<Blob>` (quality 0.92).
  - ProfileEditor uses `POST/DELETE /api/v1/profile/logo` and reads `user.logo`; it follows the avatar handler pattern, shows the current logo on a checkerboard so transparency is visible, and says: "Transparent PNG works best. Added to the right of each photo people download."

- [ ] **Step 1: Implement** `renderEdit.js` as above.
- [ ] **Step 2: Implement** the logo control in ProfileEditor (state from the profile DTO field `logo`; upload via `apiFetch` with `FormData`, same error display as the avatar).
- [ ] **Step 3: Verify** `npx vite build` → Expected: builds without errors; `npm run lint` clean for new files.
- [ ] **Step 4: Manual check** (owner or builder): upload a PNG in the profile editor, reload, see it; remove it.
- [ ] **Step 5: Commit** (only if asked).

### Task 5: The editor dialog and the Lightbox Download button

**Files:**
- Create: `memoriesfe/src/editor/PhotoEditor.jsx`
- Modify: `memoriesfe/src/components/Lightbox.jsx` (Download opens the editor), `memoriesfe/src/components/PhotoStream.jsx`, `memoriesfe/src/pages/PublicGallery.jsx` (pass `logoUrl`; photos need `kind`), `memoriesfe/src/App.css`, `memoriesfe/src/pages/Privacy.jsx`

**Interfaces:**
- Consumes: Task 2 payload fields (`logoUrl`, `kind`), Task 3/4 modules.
- Produces: `<PhotoEditor photo={{ url, name, kind }} logoUrl={string} onClose={() => void} />`; `Lightbox` gets an optional prop `logoUrl` (default `''`); its Download button is a `<button>` that opens the editor.

- [ ] **Step 1: PhotoStream** keeps `info.logoUrl` from the page response and passes `logoUrl={info.logoUrl}` to `Lightbox`; photos already carry `kind`. **PublicGallery** adds `kind: f.kind` when flattening folder photos and passes `logoUrl={gallery.logoUrl}`.
- [ ] **Step 2: Implement `PhotoEditor.jsx`:** modal with a canvas preview (max viewport size, redrawn on change), format chips from `PRESETS`, drag to pan and pinch/wheel (or a Zoom slider) to zoom via pointer events, look chips from `LOOKS`, Brightness and Contrast sliders, **Save** (exports with `exportJpeg`, triggers an `<a download>` using an object URL, file name `<name without extension>-<preset.key>.jpg`) and **Cancel**. Loads the photo and the logo with `loadImage`; the logo is loaded only when `shouldStamp(photo, logoUrl)`. If loading fails (CORS or network), show "Could not prepare this photo. Download the original instead." with a plain link to the original URL.
- [ ] **Step 3: Lightbox:** replace the Download anchor with a button "Download" that sets `editing` state and renders `<PhotoEditor>`; keyboard nav (arrows/Esc) is disabled while the editor is open so Esc closes the editor first.
- [ ] **Step 4: Privacy page:** add one sentence under the photos section: editing happens on the visitor's device, the edited image is not uploaded anywhere; the logo is provided by the photographer.
- [ ] **Step 5: Verify** `npx vite build` and `npm test` → Expected: both succeed.
- [ ] **Step 6: Commit** (only if asked).

### Task 6: End-to-end check (manual, owner's browser)

- [ ] Start backend and `npm run dev`; upload a logo; open a camera photo; Download → editor shows the logo bottom-right; choose Instagram story, pan/zoom, pick Black and white; Save; the file is 1080x1920 JPEG with a colored logo.
- [ ] Same photo with no logo set: no logo, Save still works.
- [ ] A guest-uploaded photo: editor opens without a logo.
- [ ] Open DevTools console on a photo that was already visible in the grid: no CORS error (confirms `cache: 'reload'`); if one appears, the R2 CORS rule is missing the origin.
- [ ] Check at phone width (about 390 px): format chips scroll horizontally, Save stays visible.
- [ ] Final: `./mvnw test`, `npm test`, `npx vite build` all green.
