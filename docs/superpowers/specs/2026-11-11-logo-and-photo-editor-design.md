# Photographer logo and download editor: design

Date: 2026-11-11. Repos: `memoriesfe` (React/Vite), `memoriesbe` (Spring Boot). Status: draft for approval.

## Intent

A photographer wants every photo that leaves imemories to carry their brand, and wants guests to be able to take a photo straight to Instagram or Facebook in the right shape. Today "Download" saves the raw file (`Lightbox.jsx`, a plain `<a download>`).

The new Download opens a small, simple photo editor: logo already applied, then crop/resize for a social format, then a one-tap look. The result is saved to the person's device.

## Goals

- The photographer uploads one logo in the profile editor (same place and feel as the profile picture).
- A downloaded photo shows that logo on the right side, over the photo.
- Before saving, the person can crop and resize to a social format, and apply a simple look and two sliders.
- Works for guests on the public gallery without signing in, and for the photographer.
- Phone first: most guests download on a phone.

## Non-goals

- No logo position/size/opacity settings (fixed, sensible values).
- No editing of originals in storage. No server-side image processing. No editing history.
- No other social formats than the list below. No text, stickers, drawing or rotation.
- No logo on guest-uploaded photos (decided by the product owner).
- No logo on photos shown in the gallery grid or lightbox. Only the downloaded/edited image has it.

## Anti-goals (failure even if it works)

- A guest can remove, move or shrink the logo inside the editor.
- A downloaded photo is visibly soft or low resolution because the editor re-encoded it badly.
- The editor is heavy or confusing; it should feel like three taps.

## Decisions (made with the product owner)

1. **Logo setting.** One image per profile, managed in the profile editor: upload, replace, remove.
2. **Logo placement.** On the right side of the photo, over it. Applied at download time, never to stored files, so changing or removing the logo affects every later download.
3. **Which photos.** Only photos from the photographer's cameras. Guest uploads are downloaded without the logo (they can still use crop and looks).
4. **Editor flow.** Logo applied first, then crop/resize, then filters. The logo is locked.
5. **Social formats.** Original, Instagram post square (1:1, 1080x1080), Instagram post portrait (4:5, 1080x1350), Instagram story (9:16, 1080x1920), Facebook post (1.91:1, 1200x630). The person drags and zooms the photo inside the frame to choose what stays.
6. **Filters.** A few one-tap looks (for example Original, Black and white, Warm, Cool, Vivid) plus brightness and contrast sliders.
7. **Where it runs.** In the browser, on the person's device (canvas). No new server work for editing. Rationale: no re-upload, free to run, same code on both galleries.

## Builder's calls (mine, not agreed; check these)

- **Logo size and position:** about 18% of the output width, with a margin of about 3% from the edges, in the bottom-right corner. The owner said "in the right"; I read that as the right side and chose the bottom corner because a logo vertically centered on the right edge would cover faces. One line to change.
- **Logo format:** PNG, WebP or JPEG up to 2 MB (same rules and sniffing as the profile picture); transparent PNG recommended and said in the UI.
- **Output:** JPEG, quality 0.92, longest edge capped at the preset size; for "Original" keep the source size up to 4000 px long edge. File name `<original-name>-<preset>.jpg`.
- **Logo is baked after crop,** so it always sits at the same spot in the final frame regardless of crop.
- **Looks are applied with canvas filters** before the logo is drawn, so the logo is never tinted.
- **Low-end phones:** limit the working canvas to 4000 px long edge to avoid out-of-memory.

- **Small sources:** the crop frame is always filled. Minimum zoom fits the frame, there is no letterboxing, and output is never larger than the source allows: if the source is smaller than the preset, the output is the largest exact-ratio size the source can fill (the ratio is kept, the pixel size may be smaller). "Exact pixel size" in the verification list applies to sources big enough.
- **Original:** output is the source size (capped at 4000 px long edge); the logo is 18% of that width.
- **Logo shape:** upload is validated to at most 2000 px per side; at render time the logo height is capped at 12% of the photo height (width shrinks to keep the ratio), so a tall logo can't swallow the photo.
- **Contrast:** no shadow or outline in version one. If a pale logo vanishes on bright photos, that is a follow-up.
- **Payloads:** the Lightbox is used by `PhotoStream` (event pages, profile) and `PublicGallery`. The builder confirms each surface receives `logoUrl` and each photo's `kind` and adds the missing fields to the backend payloads. The photographer's own views get the logo the same way as the public ones.
- **Logo upload rules** are the avatar endpoint's (`ProfileController.uploadAvatar`): JPEG, PNG or WebP, magic-byte sniffed, size cap 2 MB.

## Constraints and technical notes

- Backend: new column `profiles.logo_key` (migration V17), endpoints `POST /api/v1/profile/logo` and `DELETE /api/v1/profile/logo` mirroring the avatar ones (magic-byte sniff, 2 MB cap, delete old object). Key layout `profiles/<publicToken>/logo/<uuid>.<ext>`. Public profile and event payloads expose a `logoUrl` (presigned) only when a logo exists, and each photo exposes `kind` already (`camera` vs `guest`) so the frontend decides whether to stamp.
- **R2 CORS is required.** Drawing a cross-origin image on a canvas and exporting it needs the image to be served with CORS headers. The R2 bucket needs a CORS rule allowing GET from `https://imemories.eu` (and the dev origin), and images must be loaded with `crossOrigin="anonymous"`. Without it the canvas is tainted and export fails. This is a manual Cloudflare setting, not code. If the owner prefers not to touch bucket CORS, the fallback is a backend endpoint that proxies the image bytes.
- Presigned URLs expire; the editor fetches the image when opened, so this is fine.
- HEIC does not apply (originals from cameras are JPEG; guest uploads are already converted).
- Privacy page: mention that editing happens on-device and nothing is sent. The logo is photographer-provided public content.

## Left to the builder

Component structure, gesture handling for drag/zoom (pointer events, pinch on touch), visual design of the editor (use the existing app styling), preview rendering performance, exact copy, test layout.

## Verification the owner will care about

- Download from a camera photo with a logo set: the file has the logo on the right.
- Same photo with no logo set: no logo, nothing broken.
- Download of a guest photo: no logo.
- Each social preset gives the exact pixel size.
- Works on a phone-width screen.
