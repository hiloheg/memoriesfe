# Guest uploads and photo tags: design

Date: 2026-11-11. Status: draft for approval. Spans `memoriesbe` (Spring Boot, Neon, R2) and `memoriesfe` (React).

## Intent

At a wedding or party the photographer's cameras are not the only source of good photos. Guests take their own. This feature lets the event creator invite guests to add photos straight into the event's gallery, so everyone's photos end up in one place, behind the same QR code. Because photos now come from several people and cameras, visitors also need a way to narrow the gallery to one person or one camera.

## Goals

- The event creator can switch guest uploads on for an event and set how many photos each guest may add (0 to 50).
- A guest opens the event, taps an upload button, signs in with Google, then either takes a photo with the phone camera or picks one from the device, confirms, and the photo is in the gallery immediately.
- The event gallery and the photographer's profile page both show tags, one per camera and one per guest (the guest's real Google name). Picking tags filters the photos.
- Only the event creator can delete guest photos.

## Non-goals

- No approval queue. Photos go live on upload (the creator's decision).
- Guests cannot delete or edit their photos once confirmed.
- No tags typed by hand, no captions, no albums.
- No change to the camera and SFTP flow.
- No video.

## Anti-goals

- A guest must not be able to upload more than their limit by retrying, racing requests, or editing the page.
- Guest sign-in must not open up photographer features. A guest's Google token only works for guest uploading.
- Guest photos must not be reachable by anyone who has not passed the event's existing access rules (password-protected events stay protected).

## What the user decided

1. Per event, a checkbox "Let guests upload photos" and a number, minimum 0, maximum 50.
2. The limit is per guest per event (decided as a guess and confirmed). 0 means nobody can upload.
3. Flow: upload button on the event page, Google sign-in, choose "take a photo" or "upload from device", confirm, upload.
4. Photos appear in the gallery immediately.
5. Only the event creator can delete guest photos.
6. Tags show the guest's real Google name.
7. Profile page photos filter by who took them (camera or guest).

## Parts of the design I decided (my calls, change any)

- **Storage.** Guest photos go in the existing R2 bucket under `events/<eventId>/guests/<guestId>/`, next to the camera prefixes `events/<eventId>/<cameraId>/`. The backend receives the file and writes it (this is the existing pattern used for profile pictures in `PhotoStorage.put`).
- **Accepted files.** JPEG, PNG, WebP and iPhone HEIC. HEIC is converted to JPEG in the browser before upload, because the gallery only lists web image types. Maximum about 15 MB per file. The backend checks the real file type, not just the extension. The current multipart limit is 3 MB (`application.yml`), so the upload endpoint needs a higher limit.
- **Upload sizes.** The frontend downsizes very large photos before sending (long edge about 3000 px) to keep uploads fast on mobile data. This is a convenience, not a security measure.
- **Counting the limit.** A new table `guest_uploads` records each upload (event, guest, file key, time). The limit check and the insert happen in one database transaction, so two simultaneous requests cannot both slip past the limit.
- **Guest identity.** The guest is identified by their Google account `sub`. The table `event_guests` stores `sub`, display name and event, created on first upload.
- **Tags.** A tag is derived, not stored: camera name for camera photos, guest name for guest photos. The photo list response gains a `by` field (tag label plus kind, camera or guest). The frontend builds the tag chips from the photos it received, and the backend also accepts `?by=` filters so paging stays correct when a filter is on. Multiple tags selected means "any of these".
- **Profile page.** The photographer's profile photo stream (already paged and locked behind the consent gate) gets the same tag chips and filter.
- **Upload button visibility.** Shown on the public event page only when guest uploads are on and the limit is above 0. After the limit is reached it reads "You've used all your uploads".
- **Guest sign-in and the allow-list.** `SecurityConfig` currently accepts only tokens whose email is in `ALLOWED_EMAILS` (when that list is set). Guests must not need to be on that list. I will keep the allow-list for photographer endpoints and apply it only there; the guest upload endpoints accept any verified Google account for this app's client ID.
- **Token lifetime.** Google ID tokens last about an hour. If a guest's token expires mid-session, the page asks them to sign in again and keeps the chosen photo.
- **Abuse limits.** Beyond the per-guest limit: a hard cap of 2000 guest photos per event, and basic request rate limiting on the upload endpoint.
- **Privacy notice.** The upload confirmation screen states that the guest's Google name will be shown next to the photo and that only the event creator can remove it. The privacy page gains a section on guest uploads (what is stored: name, Google account id, photos, upload times; retention follows the event). A guest can request erasure of their data through the existing contact address. I'll flag this to the owner as something a lawyer should review.
- **Deleting.** The creator gets a delete action on each guest photo in the event page. Deleting an event deletes the guest prefix too, reusing `PhotoStorage.deleteAll`.
- **Camera capture.** Uses the phone's own camera through a file input with `capture`, plus a second input for choosing from the device. No custom camera UI.
- **Database.** New Flyway migration V11: `events.guest_uploads_enabled boolean default false`, `events.guest_upload_limit int default 0 check (0..50)`, tables `event_guests` and `guest_uploads`.

## Constraints from the existing system

- Public gallery endpoints are `permitAll` under `/api/v1/public/**`; the photo listing is built from cameras only (`PublicEventController.photos`), so it must also read the guest prefix.
- `PhotoStorage.entries` lists at most 1000 objects per prefix.
- Event access rules (`EventAccess`, password header `X-Event-Password`) must apply to guest photos exactly as to camera photos.
- The frontend has no logged-in state on public pages today; sign-in there is new and must not block anonymous viewing.

## Left to the builder

- Exact endpoint names and response shapes, as long as they follow the existing `/api/v1` style.
- Visual design of the upload button, confirm screen and tag chips (the frontend-design skill applies, matching the current look).
- How to convert HEIC in the browser.
- Test plan: limit enforcement under concurrent requests, a guest token cannot call photographer endpoints, protected events hide guest photos, file-type spoofing is rejected.

## Open for the owner

- Whether a legal review of the guest name display and erasure wording is done before launch.
