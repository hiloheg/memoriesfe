# GDPR audit: imemories (Instant Memories)

**Controller:** HILOHE GIGI PFA, CUI 54766547, Romania
**Audit date:** 10 November 2026
**Scope:** `memoriesfe` (React site), `memoriesbe` (Java API), `memoriesworker` (SFTPGo) and the services they use (Google sign-in, Neon, Cloudflare R2).
**Basis:** Regulation (EU) 2016/679 (GDPR), Romanian Law 190/2018, and ePrivacy as applied in Romania by Law 506/2004.

> This is a technical audit written from the code and configuration, not legal advice. Have the policy text and the open items below checked by a lawyer or a data-protection consultant before launch. Items marked **YOU** need a decision or information only the company has.

---

## 1. Summary

| | |
|---|---|
| Overall | The app collects little data and has no ads or analytics, so the base position is good. The main gaps were missing legal pages, third-party calls made before consent, and no way to exercise erasure and access. The code gaps are fixed; the remaining ones are company actions and one product decision (photo retention). |
| Fixed in this change | Privacy policy page, cookie/storage banner with consent gate for Google, Google Fonts removed (self-hosted), "Download my data" and "Delete my account", Google no longer loaded for guests. |
| Needs you before launch | Contact email and address in the policy, processing agreements with providers, a Terms page that makes the photographer-controller / you-processor split binding, a decision on photo retention, log retention set up to match the policy, a data-breach procedure. |

---

## 2. Roles

| Data | Controller | Your role |
|---|---|---|
| Photographer account, page, events, cameras, logs | HILOHE GIGI PFA | Controller |
| Photos uploaded through cameras (may show guests, children, people at religious ceremonies) | The photographer | Processor (Art. 28) |
| Google account data used for sign-in | Google (independent controller) and you, for the part you keep | Both |

The photographer decides who is photographed and who sees the photos. This split is described in the privacy policy, but a **processor agreement (Art. 28(3))** between you and each photographer is required: the simplest way is a Terms of Service that every photographer accepts at first sign-in. See action A3.

---

## 3. Data inventory and record of processing (Art. 30)

A sole trader with fewer than 250 staff is formally exempt from the record of processing, but not when processing is regular, as here, so keep this table as your record.

| # | Data | Where it is stored | Purpose | Legal basis | Retention | Recipients |
|---|---|---|---|---|---|---|
| 1 | Google account ID (`sub`), email, name, picture URL | Neon DB (`profiles`) | Sign-in, account | Contract, Art. 6(1)(b) | Until account deleted | Neon (processor), Google |
| 2 | Page content: name, address, tagline, bio, website, follow links, colours, picture | Neon DB; uploaded picture in R2 | Public page | Contract | Until account deleted | Public, by the photographer's choice |
| 3 | Events: name, date, icon, visibility; password of protected events (encrypted) | Neon DB | Run events | Contract | Until deleted | Neon |
| 4 | Cameras: name, FTP username, FTP password (encrypted); SFTPGo user with hashed password | Neon DB; SFTPGo DB (Neon) | Let cameras upload | Contract | Until camera/event/account deleted; login expires 3 days after the event | Neon |
| 5 | Photos | Cloudflare R2 (private bucket) | Share with guests | Photographer decides; you are processor | Until event/camera/account deleted | Cloudflare (sub-processor), guests with access |
| 6 | IP address and technical data of visitors and cameras | Server and SFTPGo logs | Security, delivery, fixes | Legitimate interests, Art. 6(1)(f) | Policy says 30 days (see F7) | Hosting provider |
| 7 | Choices in the browser (sign-in token, opened follow buttons, event password, consent choice) | Visitor's browser only | Site works | Strictly necessary / requested by the user | Session, or until browser data is cleared | None |
| 8 | Emails sent to you | Your mailbox | Answer requests | Legitimate interests | As long as needed | Your mail provider |

Special categories: photos at baptisms or weddings can reveal religion, and photos can show children. You do not intend to process special-category data and cannot see it by design, so Art. 9 is a risk to note, not a basis you rely on; the responsibility sits with the photographer (Terms, A3). A full DPIA is **not** required on the current design (no large-scale monitoring, no profiling, no automated decisions), but re-check if you add face recognition, search by person or analytics.

DPO: not required (no large-scale monitoring or special-category processing as your core activity).

---

## 4. Third parties and transfers

| Party | What it does | Contact with visitors | Action |
|---|---|---|---|
| Google (sign-in) | Identity; sets its own cookies | **Only after consent now** (was: every visitor, every page) | Done. Mention in policy: done |
| Google Fonts | Fonts | **Removed.** Fonts are bundled with the site, so no visitor IP goes to Google (German courts have held this unlawful without consent) | Done |
| Neon | Postgres hosting | Backend only | **YOU:** sign the DPA; pick an EU region (check the region of the connection string) |
| Cloudflare R2 | Photo storage; guests load photos through short-lived links | Visitors' browsers contact Cloudflare | **YOU:** accept the Cloudflare DPA; create the bucket in the **EU jurisdiction** if it is not already; see F6 |
| Hosting provider (site, API, SFTPGo) | Runs the servers | Yes | **YOU:** DPA; prefer an EU datacentre |

Transfers outside the EEA are covered in the policy by the EU-US Data Privacy Framework or Standard Contractual Clauses. Confirm per provider that this is true (providers publish their certification).

---

## 5. Findings

Severity: **High** = fix before launch, **Medium** = fix soon, **Low** = improve.

### Fixed in this change

| ID | Finding | Fix |
|---|---|---|
| F1 (High) | No privacy policy or identity of the controller (Art. 13) | `/privacy` page: controller, roles, data and legal bases, browser storage, recipients, retention, rights, complaint to ANSPDCP, photo takedown, security. Linked from the landing page, guest pages and the account tab |
| F2 (High) | Google's script was loaded for **every visitor** on every page, including guests who only view photos | Google loads only after the visitor allows it; guests never load it |
| F3 (High) | Google Fonts requested from Google's servers on every page view | Fonts self-hosted (npm packages), `<link>` tags removed |
| F4 (High) | No way to exercise erasure (Art. 17) | Account tab: **Delete my account** removes camera logins, all photos, events, picture, follow buttons, profile. Endpoint `DELETE /api/v1/me` |
| F5 (Medium) | No way to exercise access and portability (Art. 15, 20) | Account tab: **Download my data** (JSON). Endpoint `GET /api/v1/me/export`. Passwords are deliberately not included |
| F8 (Medium) | No cookie/storage notice | Banner with equal "Not now" and "Allow Google sign-in" buttons, a "Cookie settings" link to change the choice, and a table of every item the site stores. Nothing else needs consent: no ads, no analytics |

### Open

| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| F6 | Medium | A photographer without an uploaded picture shows their **Google picture URL** (`lh3.googleusercontent.com`) on the public page, so every guest's browser contacts Google | Copy the picture into your own storage at first sign-in, or require an uploaded picture. Until then it is a third-party call on guest pages |
| F7 | Medium | The policy promises logs are kept **30 days at most**. Nothing in the repo enforces it. SFTPGo's container logs and any host or CDN logs have no limit by default | Set log rotation (Docker `max-size`/`max-file`, or journald) and a 30-day limit in the hosting panel. If you cannot, change the policy wording to match reality |
| F9 | Medium | **Photos are kept forever** until the photographer deletes them. Storage limitation (Art. 5(1)(e)) is easier to defend with an end date | Product decision: auto-delete 12 months after the event with an email warning, or ask photographers to choose. Then update "How long we keep it" |
| F10 | Medium | No rate limit on protected-event passwords or any public endpoint (Art. 32) | Add a limit (for example 10 attempts per IP per 15 minutes) on `X-Event-Password` checks; in front, use Cloudflare rate limiting |
| F11 | Low | Camera and event passwords are encrypted with a key derived from the **SFTPGo admin password** | Use a dedicated random `CREDENTIALS_KEY` in `.env`, kept separate from admin credentials |
| F12 | Low | The sign-in token is kept in `sessionStorage`, readable by any script injected into the page | Keep third-party scripts at zero and add a Content-Security-Policy header on the site |
| F13 | Low | The "follow before you see the photos" gate asks visitors to open social links. We record nothing, but it makes the photos conditional on visiting third-party sites | Keep it client-side only (as now) and say so; it is the photographer's choice. Do not add click tracking without a legal basis |
| F14 | Low | The policy is in English only, while the company and likely most guests are in Romania | Add a Romanian version (Art. 12 requires clear language the person understands) |

---

## 6. Actions for you

| # | Action | Why |
|---|---|---|
| A1 | Set `VITE_CONTACT_EMAIL` and `VITE_COMPANY_ADDRESS` in the frontend `.env` (see `.env.example`) and rebuild | Art. 13 needs the controller's contact details. The page currently shows a red placeholder until you do |
| A2 | Accept the data processing terms of Neon, Cloudflare and your host; keep copies | Art. 28 |
| A3 | Add Terms of Service that every photographer accepts: they are the controller of the photos, must have a legal basis and tell people they are photographed, must not upload unlawful content, and you act as processor on their instructions (Art. 28(3) clauses). Show them at first sign-in | Without a binding agreement the role split in the policy has no effect |
| A4 | Write a short breach procedure: who decides, record every incident, notify ANSPDCP within **72 hours** if there is a risk to people (Art. 33), tell affected people when the risk is high (Art. 34) | Required |
| A5 | Decide F9 (photo retention) and F7 (log retention), then make the policy match | Art. 5(1)(e) |
| A6 | Choose how requests reach you (the contact email) and answer within one month; keep a simple log of requests | Art. 12, 15 to 22 |
| A7 | Have the policy text reviewed, and have a Romanian version made | Legal accuracy |

---

## 7. What the site stores in the visitor's browser

| Item | Type | Needs consent? |
|---|---|---|
| `memories.idToken` | Session storage, sign-in | No, strictly necessary |
| `memories.follow.*` | Local storage, remembers opened follow buttons | No, requested by the visitor's own action |
| `memories.eventPassword.*` | Session storage, protected event password | No, strictly necessary |
| `memories.consent` | Local storage, remembers the cookie choice | No, strictly necessary |
| Google's cookies | Third party, only after the visitor allows Google sign-in | Yes, given through the banner |

The site sets no cookies of its own and uses no analytics, advertising or social-media plugins.

---

## 8. Where this is in the code

| Feature | Files |
|---|---|
| Privacy policy | `memoriesfe/src/pages/Privacy.jsx`, route `/privacy` (the address `privacy` is reserved so no photographer can take it) |
| Consent and banner | `src/consent.js`, `src/components/CookieBanner.jsx`, `src/components/Landing.jsx` (Google loaded only after consent) |
| Fonts | `src/main.jsx` imports `@fontsource-variable/*`; `index.html` has no font links |
| Download and delete | `src/components/YourData.jsx`; backend `memoriesbe/.../AccountController.java` |
| Tests | `MemoriesbeApplicationTests.accountCanBeExportedAndErasedWithEverythingItOwns` |
