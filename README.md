# UmrahConnect — Phase 1

A multi-vendor Umrah packages marketplace for Pakistan. Phase 1 covers accounts and authentication, onboarding for travel agencies and independent operators, and the admin workflow that verifies vendors.

The repository holds three independent applications:

| Folder      | Stack                                                                                  | Default URL                    |
| ----------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| `backend/`  | Node.js · Express 5 · MongoDB/Mongoose · JWT · bcrypt · Joi · Multer · Nodemailer      | http://localhost:5000/api/v1   |
| `frontend/` | Public marketplace for pilgrims and vendors. Next.js 16 (App Router, JavaScript) · React 19 · SCSS modules · Reactstrap/Bootstrap · Redux Toolkit · Axios · Formik + Yup | http://localhost:8080 |
| `admin/`    | Admin panel for platform administrators. Same stack as `frontend/`                     | http://localhost:8090          |

Neither frontend contains API logic, database access or business rules. They talk to the backend only over HTTP, and the backend is the source of truth for roles and permissions.

### How the admin side is separated

Admins and marketplace users share nothing but the database server:

| | Marketplace (`frontend/`) | Admin panel (`admin/`) |
| --- | --- | --- |
| Accounts | `users` collection (`CUSTOMER`, `AGENCY`) | `admins` collection (`SUPER_ADMIN`) |
| Sign-in | `POST /api/v1/auth/login` | `POST /api/v1/admin/auth/login` |
| JWT secrets | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `ADMIN_JWT_ACCESS_SECRET` / `ADMIN_JWT_REFRESH_SECRET` |
| Refresh cookie | `uc_refresh`, path `/api/v1/auth` | `uc_admin_refresh`, path `/api/v1/admin/auth` |
| CORS origin | `CLIENT_URL` (every route except `/admin`) | `ADMIN_CLIENT_URL` (`/admin` routes only) |

An admin cannot sign in on the marketplace and a marketplace user cannot sign in to the admin panel. A user token sent to `/api/v1/admin/*` is rejected as an invalid token, and the reverse is also true.

---

## Prerequisites

- Node.js **20.19+** (needed by Mongoose 9; Next.js 16 needs 20.9+)
- MongoDB **6+**, running locally or reachable via a connection string

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development`, `production` or `test` |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/umrah_connect` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Marketplace user tokens. Long random strings. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_JWT_ACCESS_SECRET` / `ADMIN_JWT_REFRESH_SECRET` | Admin tokens. All four JWT secrets **must be different**; the API refuses to start otherwise |
| `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | Default `15m` / `7d` |
| `ADMIN_ACCESS_TOKEN_EXPIRES_IN` / `ADMIN_REFRESH_TOKEN_EXPIRES_IN` | Default `15m` / `12h` |
| `CLIENT_URL` | Marketplace frontend origin(s), comma-separated. Allowed on every route except `/api/v1/admin` |
| `ADMIN_CLIENT_URL` | Admin panel origin(s), comma-separated (default `http://localhost:8090`). Allowed on `/api/v1/admin` only |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | SMTP settings. **Leave `SMTP_HOST` empty in development** and emails (including OTP codes) are printed to the API console |
| `ADMIN_NOTIFICATION_EMAIL` | Optional; notified when a vendor submits an application |
| `COOKIE_SAMESITE`, `COOKIE_SECURE` | Refresh-cookie settings (see *Deployment notes*) |
| `OTP_EXPIRES_IN_MINUTES`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS` | OTP tuning (defaults 10 / 5 / 60) |
| `UPLOAD_MAX_FILE_SIZE_MB` | Document upload limit (default 5) |
| `AUTH_RATE_LIMIT_MAX` | Login/register/OTP attempts per IP per 15 min (default 20). Admin login gets half of this, minimum 5 |
| `GEOCODER_URL`, `GEOCODER_USER_AGENT` | Optional. Hotel search on the package form, which fills in each hotel's distance from the Haram, uses OpenStreetMap Nominatim (default `https://nominatim.openstreetmap.org`). The public server allows one request per second and requires an identifying User-Agent, ideally with a contact URL. Point `GEOCODER_URL` at a self-hosted Nominatim for heavy use |

### Create the super admin

Admins live in their own `admins` collection and have no public registration route. Create the first one with the seed script. Credentials are read from the environment, never from source code:

```bash
SUPER_ADMIN_NAME="Platform Admin" \
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_PASSWORD='a-strong-password-123' \
npm run seed:admin
```

The script requires a password of at least 12 characters containing letters and numbers. It refuses to run if a super admin already exists. Set `ALLOW_ADDITIONAL_ADMIN=true` to add another one deliberately.

### Upgrading an existing database

Before the split, admins were `users` with role `SUPER_ADMIN`. Move them once with:

```bash
npm run migrate:admins
```

Each admin keeps its `_id` and password, and its audit-log entries are re-linked to it. The script is safe to re-run. Existing admin sessions end, so admins sign in again at the admin panel.

### Run

```bash
npm run dev      # development (nodemon)
npm start        # production
npm test         # integration tests (uses the umrah_connect_test database)
```

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm run dev                     # http://localhost:8080
```

Production build:

```bash
npm run build
npm start
```

## 3. Admin panel setup

```bash
cd admin
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm run dev                     # http://localhost:8090
```

Sign in at http://localhost:8090/login with the super admin's email and password. Production: `npm run build && npm start` (port 8090).

Run the three apps in separate terminals; none depends on another's process.

---

## Trying it out locally

1. Start MongoDB, the backend (`npm run dev`) and the frontend (`npm run dev`).
2. Seed the super admin (see above).
3. Open http://localhost:8080/register/vendor and register as a *Registered Travel Agency*.
4. Copy the 6-digit code from the **backend console** (`[email:dev]`) into the verification page.
5. Complete the 5-step onboarding wizard (PDF/JPG/PNG documents) and submit.
6. Open the admin panel at http://localhost:8090 and sign in as the super admin. Go to **Agencies & operators**, open the application, view and approve each required document, then approve the agency. Or reject it with a reason and resubmit as the vendor.
7. Back as the vendor: the profile page now shows **Publishing enabled**, and **Packages** and **Seat requests** appear in the sidebar. Create a package for a future date and publish it.
8. Register a customer account at http://localhost:8080/register, open **Packages**, pick the package and request seats.
9. As the vendor, open **Seat requests** and confirm (or decline) the request. The customer sees the confirmation and the agency's contact details under **My seat requests**. No payment is involved.

---

## Folder structure

```
umrah-connect/
├── backend/
│   ├── src/
│   │   ├── config/        env loading/validation, MongoDB connection
│   │   ├── constants/     roles, vendor types, statuses, document rules, audit actions
│   │   ├── models/        User, Admin, Agency, AgencyDocument, OTP, AuditLog, Package, Quotation
│   │   ├── validators/    Joi schemas (auth, agency, admin)
│   │   ├── middlewares/   auth/roles, agency status gates, validation, rate limiting, uploads, errors
│   │   ├── services/      business logic (auth, token, otp, agency, admin, audit, notification)
│   │   ├── controllers/   thin HTTP handlers
│   │   ├── routes/        /auth, /agencies, /packages, /quotations, /admin (+ /admin/auth)
│   │   ├── templates/     HTML email templates
│   │   ├── scripts/       seedSuperAdmin.js, migrateAdmins.js
│   │   ├── utils/         ApiError, response helper, pagination, phone, crypto, file streaming
│   │   ├── app.js         Express app (helmet, CORS, parsers, routes, error handler)
│   │   └── server.js      bootstrap + graceful shutdown
│   ├── tests/             node:test + supertest integration suites
│   ├── uploads/           private document storage (git-ignored, never served statically)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/    login, register, register/vendor, verify-otp, forgot-password, reset-password
│   │   │   ├── account/   customer home
│   │   │   ├── agency/    onboarding, documents, submitted, pending-approval, rejected, suspended, profile
│   │   │   ├── layout.js  fonts, Redux provider, global styles
│   │   │   └── page.js    landing page
│   │   ├── components/    common (states, badges, modal, pagination…), forms, layouts (shells, guards)
│   │   ├── features/      auth (slice + forms), agency (context, wizard, uploader), packages
│   │   ├── services/      Axios client with refresh interceptor + API modules
│   │   ├── store/         Redux store + provider
│   │   ├── hooks/         useAuth, useFetch, useLogout, useDebounce, useCountdown
│   │   ├── utils/         validation (Yup), errors, formatting, role routing
│   │   ├── styles/        Bootstrap theme variables + globals
│   │   └── constants/
│   └── .env.example
├── admin/                 standalone admin panel (port 8090)
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/     admin sign-in
│   │   │   ├── (panel)/   dashboard, agencies, agencies/[id], users, audit-logs (guarded)
│   │   │   └── layout.js  fonts, Redux provider, global styles (noindex)
│   │   ├── components/    common UI, forms, DashboardShell, AdminGuard, GuestGuard
│   │   ├── features/      auth (admin session slice + login form), admin (review, audit log)
│   │   ├── services/      Axios client refreshing via /admin/auth + admin API module
│   │   └── …              hooks, store, styles, utils, constants
│   └── .env.example
├── .gitignore
└── README.md
```

---

## API reference

Every response uses the same envelope:

```json
{ "success": true,  "message": "…", "data": { }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
{ "success": false, "message": "…", "code": "VALIDATION_ERROR", "errors": [{ "field": "phone", "message": "…" }] }
```

### Auth: `/api/v1/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | – | Register a `CUSTOMER` or `AGENCY` (with `vendorType`); sends an email OTP |
| POST | `/login` | – | `identifier` (email or PK mobile) + `password`; returns access token and sets the refresh cookie |
| POST | `/verify-otp` | – | Verify `EMAIL_VERIFICATION` / `PHONE_VERIFICATION` OTP; signs the user in |
| POST | `/resend-otp` | – | Resend an OTP (60 s cooldown) |
| POST | `/refresh` | cookie | Rotate the refresh token and return a new access token |
| POST | `/logout` | cookie | Revoke the refresh token and clear the cookie |
| POST | `/forgot-password` | – | Email a reset code (always responds the same way) |
| POST | `/reset-password` | – | `identifier` + `otp` + new password; revokes sessions |
| GET | `/me` | Bearer | Current user (and agency status for vendors) |

### Agency (role `AGENCY`): `/api/v1/agencies`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/me` | Application, documents, document requirements, verification summary, missing items, capabilities |
| PUT | `/me` | Save onboarding fields (only while `DRAFT` / `REJECTED`) |
| POST | `/onboarding` | Submit the application for verification (`DRAFT`/`REJECTED` → `PENDING`) |
| POST | `/documents` | Upload a document (`multipart/form-data`: `documentType`, `file`) |
| GET | `/documents/:documentId/file` | Stream one of your own documents |
| DELETE | `/documents/:documentId` | Remove a document (only while editable) |
| GET | `/verification-status` | Status, reasons, per-category verification, `canPublish` |
| GET | `/publishing-access` | Succeeds only for `APPROVED` vendors |
| GET | `/packages` | Your packages with seat and request counts; filters `status`, `search` |
| POST | `/packages` | Create a package (`status` `DRAFT` or `PUBLISHED`). Departure must be in the future, return after departure |
| GET | `/packages/:packageId` | One of your packages |
| PUT | `/packages/:packageId` | Replace a package. Quota can't drop below confirmed seats; dates are locked once seats are confirmed |
| PATCH | `/packages/:packageId/status` | Publish (`PUBLISHED`) or unpublish (`DRAFT`) |
| DELETE | `/packages/:packageId` | Delete (refused while requests are pending or bookings are confirmed) |
| GET | `/quotations` | Seat requests on your packages; filters `status`, `packageId`; `meta.statusCounts` |
| PATCH | `/quotations/:quotationId/confirm` | Confirm a pending request and reserve its seats (atomic; never exceeds the quota) |
| PATCH | `/quotations/:quotationId/decline` | Decline a pending request with a required `reason` |
| PATCH | `/quotations/:quotationId/cancel` | Cancel a confirmed booking and release its seats |

Package and quotation routes require an `APPROVED` agency.

### Packages (public): `/api/v1/packages`

Only published packages with a future departure from currently approved agencies are visible.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Browse; filters `search`, `departureCity`, `from`, `to`, `maxPrice`; `sort` = `departure` / `price_asc` / `price_desc` / `newest` |
| GET | `/departure-cities` | Cities of currently listed packages |
| GET | `/:packageId` | Package details with public agency info (no contact details) |
| POST | `/:packageId/quotations` | Role `CUSTOMER`: request `seats` (≤ available) with an optional `message`. One pending request per package |

### Customer seat requests (role `CUSTOMER`): `/api/v1/quotations`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Your requests. The agency's contact details are included once a request is confirmed |
| PATCH | `/:quotationId/cancel` | Withdraw a pending request |

### Admin auth: `/api/v1/admin/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/login` | – | `email` + `password` of an account in `admins`; returns an admin access token and sets the `uc_admin_refresh` cookie |
| POST | `/refresh` | admin cookie | Rotate the admin refresh token and return a new access token |
| POST | `/logout` | admin cookie | Revoke the admin refresh token and clear the cookie |
| GET | `/me` | admin Bearer | Current admin |

### Admin: `/api/v1/admin`

Every route requires an **admin** access token from `/admin/auth`. Marketplace user tokens get `401 INVALID_TOKEN`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard` | User counts by role, admin count, agency counts by status/vendor type, review queue, recent activity |
| GET | `/agencies` | Paginated list; filters `status`, `vendorType`, `search` |
| GET | `/agencies/:id` | Full application, documents, owner, audit trail, allowed actions |
| PATCH | `/agencies/:id/review` | `PENDING` → `UNDER_REVIEW` |
| PATCH | `/agencies/:id/approve` | Approve (all required documents must be approved first) |
| PATCH | `/agencies/:id/reject` | Reject with a required `reason` |
| PATCH | `/agencies/:id/suspend` | Suspend an approved vendor with a required `reason` |
| PATCH | `/agencies/:id/reinstate` | `SUSPENDED` → `APPROVED` |
| PATCH | `/agencies/:id/documents/:documentId/review` | Approve/reject one document (`reason` required to reject) |
| GET | `/agencies/:id/documents/:documentId/file` | Stream a document (audit-logged) |
| GET | `/users` | Paginated users; filters `role`, `isActive`, `search` |
| GET | `/audit-logs` | Paginated logs; filters `action`, `entityType`, `entityId` |

`GET /api/v1/health` reports API and database status.

---

## Data models

- **User** (marketplace accounts only): `fullName`, unique `email`, unique `phone` (normalized `+923XXXXXXXXX`), bcrypt `password` (cost 12), `role` (`AGENCY` | `CUSTOMER`), `isEmailVerified`, `isPhoneVerified`, `isActive`, `refreshTokenHash` (SHA-256 of the current refresh token, plus the previous hash for a 30 s rotation grace window), `lastLoginAt`, timestamps. Secrets are excluded from queries and JSON.
- **Admin** (separate `admins` collection): `fullName`, unique `email`, bcrypt `password`, `role` (`SUPER_ADMIN`), `isActive`, refresh-token hash fields, `lastLoginAt`. Never returned by `/admin/users`.
- **Agency**: one per vendor user (`userId` unique). `vendorType` (`REGISTERED_AGENCY` | `INDEPENDENT_OPERATOR`; this is a property of the agency, not a login role), business/contact/address fields (required once the application leaves `DRAFT`), `verificationStatus` (`DRAFT`, `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`), `rejectionReason`, `suspensionReason`, `submittedAt`, `reviewStartedAt`, `approvedAt`, `approvedBy` (Admin), `suspendedAt`. Indexed on status, vendor type, business name and city.
- **AgencyDocument**: `agencyId`, `documentType`, `category` (`IDENTITY` | `BUSINESS_REGISTRATION` | `AUTHORIZATION`), private `documentUrl` (relative storage path, never returned to clients), `originalFileName`, `mimeType`, `size`, `verificationStatus`, `reviewedBy` (Admin), `reviewedAt`, `rejectionReason`.
- **OTP**: `userId`, bcrypt `otpHash`, `purpose`, `expiresAt` (TTL index removes expired codes), `verifiedAt`, `attempts`.
- **Package**: `agencyId`, `title`, `description`, `departureCity`, `departureDate`, `returnDate`, `makkahHotel` / `madinahHotel` (`name`, `stars`, `distanceMeters`, `nights`), `roomType`, `pricePerPerson` (PKR), `inclusions`, `totalSeats` (quota), `bookedSeats` (changed only by confirming or cancelling bookings), `status` (`DRAFT` | `PUBLISHED`). Virtuals: `availableSeats`, `durationDays`, `isExpired`.
- **Quotation**: a customer's seat request. `packageId`, `agencyId`, `customerId`, `seats`, `message`, price snapshot (`pricePerPerson`, `estimatedTotal`), `status` (`PENDING` → `CONFIRMED` / `DECLINED` / `CANCELLED`), `agencyNote`, `cancelledBy`, `respondedAt`. Only the agency can confirm. There is no payment integration.
- **AuditLog**: `performedBy` + `performedByModel` (`User` | `Admin`), `action`, `entityType`, `entityId`, `metadata`, timestamps. Records registrations, verifications, password resets, token-reuse revocations, submissions, admin sign-ins, every admin decision, and document uploads, reviews and views.

### Verification rules

| Vendor type | Required | Optional |
| --- | --- | --- |
| Registered travel agency | Business registration, Travel agency license | Umrah authorization |
| Independent operator | CNIC / identity document | Supporting business information, Other authorization |

Each document is reviewed on its own, and verification is reported separately for identity, business registration and authorization. The "Licensed travel agency" label is shown only for a *registered agency* whose license document an admin has approved. Independent operators are never labelled licensed.

---

## Security overview

- Passwords hashed with bcrypt and never returned. OTPs are hashed, expire after 10 minutes, allow 5 attempts and have a resend cooldown.
- Short-lived access token (JWT, kept in memory on the client). The refresh token lives in an **HTTP-only cookie** scoped to `/api/v1/auth`, rotates on every use, and is stored only as a hash. Replaying an old token revokes the session.
- Role checks on every protected route, plus resource-level scoping (vendors can only reach their own agency and documents).
- Admins are fully isolated from marketplace users: separate collection, login endpoint, JWT secrets and audience, refresh cookie (name and path), CORS allow-list, frontend app, and a stricter login rate limit. Admin sign-ins are audit-logged and the admin panel is marked `noindex`.
- Joi validation with unknown-field stripping on every request body and query. This also blocks NoSQL operator injection.
- Rate limiting on auth endpoints, Helmet headers, a CORS allow-list with credentials, and a 100 kB JSON body limit.
- Uploads: PDF/JPG/PNG only, size limit, **magic-byte check**, random file names, stored outside any public directory and streamed only to the owner or an admin with `no-store` and `nosniff` headers.
- No account enumeration on login, forgot-password or resend-OTP.

## Deployment notes

- Set `NODE_ENV=production` so the refresh cookie is marked `Secure`.
- If the frontend and API are on **different sites**, set `COOKIE_SAMESITE=none` (HTTPS required) and add the frontend origin to `CLIENT_URL`.
- Deploy `admin/` on its own origin (for example `admin.example.com`), put that origin in `ADMIN_CLIENT_URL`, and consider restricting it by IP or VPN at the proxy. Never add the admin origin to `CLIENT_URL`, or the marketplace origin to `ADMIN_CLIENT_URL`.
- The API trusts one reverse-proxy hop (`trust proxy = 1`) so rate limiting sees real client IPs.
- Configure SMTP. Without it, emails are only logged.
