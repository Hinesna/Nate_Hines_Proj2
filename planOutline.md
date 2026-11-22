# Card Collection App: Plan Outline

A minimal multi-user card collection app. Users log in, add, edit and delete their own cards (name, rarity, element, card set, optional image), and browse them in a searchable, page-flipping 3x3 library. Data is served by an Express API running as a Netlify Function and stored in MongoDB Atlas through Mongoose.

---

## 1. Scope and Constraints

| Requirement | How the plan meets it |
|---|---|
| Frontend in a `front_end` folder | All static files live in `front_end/` and are published directly (no build step). |
| Native HTML forms + Constraint Validation API with inline feedback | Every input uses native attributes (`required`, `maxlength`, `pattern`, `type=file`) plus `setCustomValidity()` and per-field error `<span>`s. |
| Static input section, dynamic library entries | The add/edit form is plain HTML in `library.html`. Library entries are cloned from a `<template>` element. |
| Image above, text below, via `textContent` | Template order is `<img>` then a `<dl>`. Text is set only with `textContent`, never `innerHTML`. |
| Express (latest) with GET and POST endpoints | Express 5.x. Only GET and POST are used (see section 5). |
| Express exposed through `serverless-http` on Netlify Functions | One function, `netlify/functions/api.js`, wraps the Express app. |
| ESM only | `"type": "module"` in `package.json`; `import`/`export` everywhere. |
| MongoDB Atlas, one environment variable | `MONGODB_URI` is the only variable. Compass is used to inspect data. |
| One `CCLE_[Username]` collection per user | Per-user Mongoose model bound to an explicit collection name. |
| Mongoose (latest) schema, validation and casting | `Card` schema: `name` and `element` required, other fields optional, image field included. |
| Send Mongo data to the browser as is | Responses return `.lean()` documents through `res.json()` with no mapping or reshaping. |
| Netlify CLI via `npx`, not a dependency | `"dev": "npx netlify-cli dev"`. |
| GitHub + Netlify Dashboard deploy | Push to GitHub, connect the repo in Netlify, add `MONGODB_URI` in the dashboard. |
| Manual testing only | Checklist in section 10. |
| No visual design | One tiny `style.css` covering only functional layout (3x3 grid, page-flip mechanics). |

---

## 2. Project Structure

```
/
├─ front_end/
│  ├─ index.html          # login + register forms
│  ├─ library.html        # static card form, search form, <template>, book view
│  ├─ style.css           # functional layout only
│  └─ js/
│     ├─ api.js           # fetch wrappers (credentials: same-origin)
│     ├─ validation.js    # Constraint Validation helpers (inline errors)
│     ├─ login.js
│     └─ library.js       # form handling, template rendering, paging/flip
├─ netlify/
│  └─ functions/
│     └─ api.js           # export const handler = serverless(app)
├─ server/
│  ├─ app.js              # Express app (routes mounted, no listen())
│  ├─ db.js               # cached Mongoose connection
│  ├─ lib/
│  │  ├─ password.js      # scrypt hash/verify (node:crypto)
│  │  └─ cookies.js       # tiny cookie parser
│  ├─ middleware/
│  │  └─ requireAuth.js
│  ├─ models/
│  │  ├─ User.js
│  │  ├─ Session.js
│  │  └─ cardModelFor.js  # card schema + per-user model factory
│  └─ routes/
│     ├─ auth.js
│     └─ cards.js
├─ netlify.toml
├─ package.json
├─ .env                   # local only, git-ignored
├─ .env.example           # MONGODB_URI=
├─ .gitignore             # .env, node_modules, .netlify
└─ planOutline.md
```

---

## 3. Tooling and Dependencies

**Runtime dependencies (3):** `express`, `mongoose`, `serverless-http`. Install without version pins so the latest versions are used (Express 5.x, current Mongoose, current serverless-http). Check with `npm view <pkg> version` at install time and record the versions in the README.

**Dev tooling:** none installed. The Netlify CLI runs through `npx`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "npx netlify-cli dev"
  }
}
```

`netlify dev` loads `.env` automatically, so **`dotenv` is not needed**.

### Reasoning for anything beyond the specified tool list

| Addition | Why |
|---|---|
| `serverless-http` | Explicitly requested; it adapts Express to the Netlify Function handler. |
| `netlify.toml` | Configuration file, not a program. Sets publish dir, functions dir and the `/api/*` redirect. |
| `node:crypto` (built in) | Password hashing (`scrypt`) and session token generation. Using the built-in module avoids adding `bcrypt` or `jsonwebtoken` and keeps the dependency audit trivial. |
| Server-side sessions stored in MongoDB | A signed-token approach (JWT/HMAC) would need a second secret environment variable. Random session IDs stored in a `sessions` collection keep the project at the **single** `MONGODB_URI` variable, and sessions can be revoked on logout. |
| Browser-native Canvas API | Optional client-side image downscaling so base64 images stay small. No image library needed. |
| Browser-native CSS 3D transforms | Page-flip animation without a flip-book library. |
| `.gitignore` / `.env.example` | Keeps secrets out of GitHub and documents the required variable. |

No frontend framework, bundler, CSS library, multer, cookie-parser or CORS package is used.

---

## 4. Database Design (Mongoose + Atlas)

### Connection (`server/db.js`)
- Reads `process.env.MONGODB_URI`.
- The supplied URI has no database name in its path, so Mongoose would default to `test`. The code passes `dbName: "cardcollection"` as a connect option (a constant in code, not a second env var).
- The connection promise is cached at module scope so warm function invocations reuse it; `serverSelectionTimeoutMS: 5000` so failures return quickly.
- **Atlas Network Access** must allow Netlify's dynamic IPs (`0.0.0.0/0`). Do this deliberately and rely on a strong DB user password plus a least-privilege DB user (`readWrite` on `cardcollection` only).

### Collections

| Collection | Purpose | Notes |
|---|---|---|
| `users` | Login accounts | `username` (unique, lowercase, `^[a-z0-9_]{3,24}$`), `passwordHash`, `salt`, `createdAt`. |
| `sessions` | Login sessions | `token` (random 32 bytes, hex), `username`, `expiresAt` with a TTL index so Mongo removes expired sessions. |
| `CCLE_<username>` | One per user, holds that user's cards | Created on first insert. |

The username whitelist matters because the username becomes part of a collection name. It also blocks injection and invalid collection characters.

### Card schema (`server/models/cardModelFor.js`)

| Field | Type | Rules |
|---|---|---|
| `name` | String | **required**, `trim`, `maxlength: 100` |
| `rarity` | String | optional, `trim`, `maxlength: 50` (free text; the form offers a `<datalist>` of suggestions) |
| `element` | String | **required**, `trim`, `maxlength: 50` |
| `setRelease` | String | optional, `trim`, `maxlength: 100`; the card set / release name |
| `image` | String | optional; a data URL (`data:image/(png\|jpeg\|webp\|gif);base64,...`) with a `match` validator and `maxlength: 1_000_000` |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

- **Image storage method:** a base64 data URL stored in the document. It goes to the browser exactly as stored and can be assigned straight to `img.src`, which respects "send data as is". Trade-off: base64 is about 33% larger than binary. It is acceptable for a simple app because the image is capped (about 750 KB binary) and the client downscales large images before upload. If images ever need to be larger, switch to object storage (out of scope).
- Validation and casting come from Mongoose itself (`required`, `trim`, `maxlength`, `match`, automatic String casting). Strict type checking is not added.
- **Per-user model factory:** `cardModelFor(username)` returns `mongoose.models[name] ?? mongoose.model(name, cardSchema, name)` where `name = "CCLE_" + username`. Passing the collection name explicitly stops Mongoose pluralizing it, and the lookup prevents `OverwriteModelError` on warm invocations.

---

## 5. API Design (Express 5, GET and POST only)

HTML forms and the requirement for GET/POST endpoints mean PUT/PATCH/DELETE are not used. Edit and delete are POST actions.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | no | Smoke test that function routing works (no DB). |
| POST | `/api/auth/register` | no | Create user (scrypt hash), start session. |
| POST | `/api/auth/login` | no | Verify password, start session, set cookie. |
| POST | `/api/auth/logout` | yes | Delete the session, clear the cookie. |
| GET | `/api/auth/me` | yes | Returns the current username (lets the frontend redirect to login). |
| GET | `/api/cards` | yes | List/search the caller's cards. Query: `q` (name), `rarity`, `element`, `set`, `page` (default 1), `limit` (default 9, max 50). |
| GET | `/api/cards/:id` | yes | One card. |
| POST | `/api/cards` | yes | Add a card (JSON body). |
| POST | `/api/cards/:id/update` | yes | Edit text and/or image (load doc, `set()`, `save()` so full validation runs). Includes `removeImage` flag. |
| POST | `/api/cards/:id/delete` | yes | Delete a card. |

### Behaviour notes
- **Data as-is:** the list endpoint is `Card.find(filter).sort({ _id: -1 }).skip().limit().lean()` and the array is sent with `res.json()` unchanged. The total count for paging travels in an `X-Total-Count` response header, so the body is never reshaped.
- **Search:** `q`, `rarity`, `element` and `set` are coerced to strings and regex-escaped, then matched case-insensitively. Object values in query strings are rejected, which prevents NoSQL operator injection.
- **Errors:** Mongoose `ValidationError` returns `400` with its `errors` object; `CastError` (bad id) returns `400`; missing doc returns `404`. The frontend maps field errors onto inputs via `setCustomValidity()`.
- **Body limit:** `express.json({ limit: "1100kb" })`. This stays well under Netlify's roughly 6 MB function payload limit.
- **Express 5 specifics:** async handler errors propagate automatically; wildcard route syntax requires named params (e.g. `/*splat`). Avoid legacy v4 patterns.
- **Routing under Netlify:** `netlify.toml` rewrites `/api/*` to `/.netlify/functions/api/:splat` (status 200). The Express router is mounted at both `/api` and `/.netlify/functions/api` so it works locally and deployed.

### Auth details
- Passwords: `crypto.scrypt` with a per-user random salt; compare with `crypto.timingSafeEqual`. Minimum length 8 enforced in both the form and the server.
- Session cookie `ccle_session`: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, 7-day expiry. Set with Express `res.cookie`; read with a ~10-line parser in `lib/cookies.js`.
- `requireAuth` looks up the session token, attaches `req.username`, and all card routes use `cardModelFor(req.username)`, so a user can never address another user's collection.
- CSRF: `SameSite=Lax` plus requiring `Content-Type: application/json` on all POSTs (a cross-site form cannot send that type without a CORS preflight).

---

## 6. Frontend Design (`front_end/`)

Plain browser JavaScript written as ES modules (`<script type="module">`). Node is used for tooling and the backend only; no bundler is required.

### `index.html` (login/register)
- Two native forms: **Login** and **Register** (username, password).
- Constraint Validation: `required`, `pattern="[a-z0-9_]{3,24}"`, `minlength="8"` on the password.
- Inline feedback: each input has a sibling `<span class="error" aria-live="polite">`. `validation.js` listens to `input` and `invalid` events, writes `input.validationMessage` into the span, and toggles `aria-invalid`. Server responses (e.g. "username taken", "wrong password") are applied with `setCustomValidity()` and cleared on the next `input`.
- On success, redirect to `library.html`.

### `library.html`
1. **Static input section (hand-written HTML, never regenerated):**
   - `<form id="card-form">` with: name (required), rarity (with `<datalist>`), element (required), card set, image `<input type="file" accept="image/*">`, hidden `id`, "Remove image" checkbox (shown only when editing), Submit and Cancel-edit buttons.
   - Image handling: JS reads the file with `FileReader`, optionally downsizes it via `<canvas>` (max ~800 px, JPEG ~0.8), and checks size with `setCustomValidity("Image too large")` before submit.
   - The form is submitted with `fetch` (JSON), but the fields, labels and validation are all native form behaviour.
2. **Search form:** `q`, rarity, element, set filters. Submitting resets to page 1.
3. **`<template id="card-template">`:**
   ```html
   <template id="card-template">
     <article class="card" data-id="">
       <img alt="" hidden>
       <dl>
         <dt>Name</dt>    <dd class="name"></dd>
         <dt>Rarity</dt>  <dd class="rarity"></dd>
         <dt>Element</dt> <dd class="element"></dd>
         <dt>Set</dt>     <dd class="set"></dd>
       </dl>
       <button type="button" class="edit">Edit</button>
       <button type="button" class="delete">Delete</button>
     </article>
   </template>
   ```
   `library.js` clones the template per card, sets `img.src` (and unhides it) when an image exists, and fills the `<dd>` elements with `textContent`. Image sits above the text.
4. **Book view:** a container holding one 3x3 CSS grid page at a time (9 cards per page), Previous/Next buttons, and a "Page X of Y" indicator derived from `X-Total-Count`.

### Edit and delete flow
- **Edit:** clicking Edit copies the card's values into the static form, sets the hidden id, and switches the submit target to `POST /api/cards/:id/update`. Cancel resets to add mode.
- **Delete:** `confirm()` then `POST /api/cards/:id/delete`, then re-fetch the current page (step back a page if it became empty).

### Page flip
- Server-side paging: each flip fetches `GET /api/cards?page=N&limit=9&...`, so payloads stay small even with images (important for the function response size limit).
- Animation is CSS only: the outgoing page is a "leaf" with `transform-origin` on its spine edge and `backface-visibility: hidden`; JS adds a class that rotates it `rotateY(-180deg)` (forward) or the reverse (back) while the next page is already rendered underneath, then swaps on `transitionend`.
- `prefers-reduced-motion` skips the animation. The Prev/Next buttons are real buttons, so keyboard use works.

### Auth guard
On load, `library.js` calls `GET /api/auth/me`; a `401` redirects to `index.html`. A Logout button posts to `/api/auth/logout`.

---

## 7. Configuration Files

### `netlify.toml`
```toml
[build]
  publish   = "front_end"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from   = "/api/*"
  to     = "/.netlify/functions/api/:splat"
  status = 200
```
Pin the Node version (current LTS) with `NODE_VERSION` in `[build.environment]` or an `.nvmrc`, so local and Netlify match and meet Mongoose's minimum.

### `.env` (local, never committed)
```
MONGODB_URI=<paste connection string here>
```
`.env.example` contains `MONGODB_URI=` only. In Netlify: **Site configuration > Environment variables > add `MONGODB_URI`**, with scope including Functions.

---

## 8. Security Notes

- **The Atlas connection string, including its password, was pasted into a chat. Treat it as exposed: rotate that database user's password in Atlas** (and use a least-privilege user limited to `cardcollection`) before deploying. Keep the new value only in `.env` and the Netlify dashboard.
- `.env` is in `.gitignore`; verify with `git status` before the first push.
- Never render user text with `innerHTML` (template + `textContent` only).
- Out of scope for this simple app: rate limiting, email verification, password reset, account deletion.

---

## 9. Build Order

1. **Setup:** `npm init`, set `"type": "module"`, install `express mongoose serverless-http`, add `dev` script, `.gitignore`, `.env`, `.env.example`, `netlify.toml`.
2. **Skeleton:** `netlify/functions/api.js` + `server/app.js` with `GET /api/health`; confirm with `npm run dev`.
3. **Database layer:** `db.js`, `User`, `Session`, `cardModelFor`; confirm the connection in Compass.
4. **Auth routes + middleware:** register, login, logout, me.
5. **Card routes:** list/search + paging header, get one, create, update, delete.
6. **Login page:** forms and inline validation.
7. **Library page:** static form, template rendering, search.
8. **Edit/delete + image handling** (file read, downscale, size validation, remove image).
9. **Page flip** and paging controls.
10. **Local manual test pass**, then push to GitHub, connect Netlify, add env var, **deployed manual test pass**.

---

## 10. Manual Test Checklist

Run each item locally (`npm run dev`) and again on the Netlify URL.

**Auth**
- [ ] Register with invalid username/short password shows inline errors.
- [ ] Register succeeds; redirected to library. Duplicate username shows a server error inline.
- [ ] Login with wrong password shows an inline error; correct login works.
- [ ] Visiting `library.html` while logged out redirects to login.
- [ ] Logout ends the session (back button / reload does not show data).

**Cards**
- [ ] Add a card with only name + element works; missing either shows inline errors.
- [ ] Add a card with all fields and an image; image shows above the text.
- [ ] Oversized image is rejected inline.
- [ ] Edit text; edit image (replace, remove). Changes persist after reload.
- [ ] Delete removes the card (with confirmation).
- [ ] Text containing `<script>` or HTML renders as plain text.

**Library**
- [ ] 3x3 grid shows 9 cards per page; with 10+ cards the second page appears.
- [ ] Next/Previous flip animates and the page indicator is correct.
- [ ] Search by name, rarity, element and set narrows results and resets to page 1.
- [ ] Deleting the last card on a page moves back one page.

**Multi-user and data**
- [ ] Two accounts see only their own cards.
- [ ] Compass shows `CCLE_<username>` collections, `users` and `sessions`; documents match what the API returned (no reshaping).
- [ ] Network tab: list response is a plain array and includes `X-Total-Count`.

**Deployment**
- [ ] `GET /api/health` works on the Netlify URL.
- [ ] Cookie is `Secure`, `HttpOnly`; login persists across reload.
- [ ] Atlas network access allows the function; no connection timeouts on cold start.

---

## 11. Assumptions and Open Questions

- **"Set Release" vs "Card Set":** the request uses both phrases. The plan uses a single String field `setRelease` shown as "Card Set" in the UI. If a release *date* is also wanted, add `releaseDate: Date` (Mongoose will cast date strings automatically).
- **Image storage:** base64 data URL inside the document, capped at about 750 KB. Revisit if users need large images.
- **Rarity:** free text with suggestions rather than a fixed enum, matching the "strict type checking is not required" guidance. An `enum` can be added later.
- **Username immutability:** usernames cannot be changed, because the collection name is derived from them.
