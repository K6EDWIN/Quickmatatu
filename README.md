# QuickMatatu

QuickMatatu is an Expo/React Native client backed by an Express API and a Neon-hosted PostgreSQL database. It has separate commuter and driver experiences.

## Current capabilities and limits

- Commuters can choose a starting point and destination from route records with non-empty endpoints, submit a ride request, review their own requests, and cancel a pending request.
- Drivers can share their foreground location while online, view unassigned pending requests, accept or decline requests, and view their assigned request history.
- Booking actions are authenticated and role/owner checked by the API. A submitted request remains pending until a driver accepts it.
- The map can display the user's current position and driver locations updated in the last five minutes. These locations are not vehicle assignments or arrival-time predictions.
- Routes with missing start or end points are omitted. Route endpoints are not independently verified boarding stops. No routes, stops, fares, seat capacity, payments, live ETAs, notifications, or operator verification are created or inferred by the app.
- Driver registration collects driver and vehicle details, but entering those details does not verify a driver or vehicle.

## Run locally

Install dependencies with `npm ci`, then run:

```sh
npm test
npm run start
```

The web export is `npm run build`. A local API runs with `node server.js` after the API environment is configured.

## Configuration prerequisites

Provide these values outside source control:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon/PostgreSQL connection string; `NEON_DATABASE_URL` is also accepted |
| `SESSION_SECRET` | At least 32 characters in production; signs seven-day API tokens |
| `EXPO_PUBLIC_API_URL` | API origin used by the app; defaults to `http://localhost:3001` |
| `EXPO_PUBLIC_WEB_ORIGIN` | Deployed web-app origin allowed by API CORS |
| `SMTP_USER` | Gmail account used to send verification and password-reset codes |
| `SMTP_APP_PASSWORD` | Gmail app password; store it only in local ignored environment or deployment secrets |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP connection settings; defaults to Gmail on port 465 with TLS |
| `EMAIL_FROM` | Optional sender display/address; defaults to the SMTP account |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Public Google OAuth web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Public Google OAuth iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Public Google OAuth Android client ID |
| `EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI` | Optional native callback URI registered for the OAuth clients; defaults to Expo's application-ID callback |
| `IOS_BUNDLE_IDENTIFIER` | Optional iOS bundle identifier; set it to the value registered with the iOS OAuth client |
| `GOOGLE_OAUTH_CLIENT_IDS` | Comma-separated server-side allowlist of the OAuth client IDs above |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Restricted public Mapbox token required by the driver's native map |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Android map key, if required by the configured native map provider |
| `GOOGLE_MAPS_IOS_API_KEY` | iOS Google Maps key, if Google Maps is selected instead of the platform default |

Production API startup fails closed if `DATABASE_URL` (or `NEON_DATABASE_URL`) or `SESSION_SECRET` is missing. The API uses the `pg` PostgreSQL driver and does not create or alter schema at startup. Native tokens are stored with SecureStore; browser tokens use tab-scoped session storage. Logout revokes outstanding tokens for that account. Password registrations require an email verification code; password recovery uses a one-time code. Codes are HMAC-hashed at rest, expire after 15 minutes, allow at most five guesses, and issuance/verification routes use persistent per-email/IP rate limits. Google ID tokens are verified by the API against `GOOGLE_OAUTH_CLIENT_IDS`; Google-created accounts default to the commuter role.

### Authentication setup and migration

1. Copy `.env.example` to a local `.env` for development, or configure each value in the API/app deployment secret settings. Never send the Gmail app password or other secrets in chat. Gmail requires two-step verification and an app password; use `SMTP_USER` and `SMTP_APP_PASSWORD`, not a Gmail account password.
2. Create Google OAuth web, iOS, and Android client IDs in Google Cloud Console. Set the three `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values for the client and the same comma-separated audience list in `GOOGLE_OAUTH_CLIENT_IDS` for the API. Rebuild the native app after changing client IDs. OAuth client IDs are public identifiers, not client secrets.
3. Apply `migrations/20261118_neon_initial.sql` to the intended Neon database through the Neon SQL Editor, or configure `DATABASE_URL` (or `NEON_DATABASE_URL`) securely and run `npm run db:migrate:neon`. Back up any existing target database first. This idempotent, transactional migration creates the complete app schema: `users`, `routes`, `tickets`, `active_drivers`, `auth_challenges`, `google_auth_nonces`, `auth_rate_limits`, required columns/constraints/indexes, and a `schema_migrations` version marker. It is self-contained for an empty database. This repository change has not connected to or migrated any Neon database.
4. The SQL creates schema only; it does not transfer or backfill Turso records. Existing Turso users, routes, bookings, and locations remain in Turso. A separate export/transform/import is needed to move data, including mapping `userType` to `user_type`, converting text commuter IDs and booking timestamps to PostgreSQL types, and preserving IDs/sequences and relationships. Do not copy data until the mapping and referential integrity have been reviewed.
5. Existing password users imported into Neon must remain `email_verified = 0` unless they were explicitly verified under an approved data-transfer process. In this implementation, legacy users verify through email code/password reset or link through a Google-verified email before protected use.

`google.json`, `google-services.json`, `GoogleService-Info.plist`, and service-account JSON files are ignored and are not needed for sign-in. The app sends a Google ID token to the API; the API verifies it with Google’s OAuth token verifier. Do not add a service-account/private-key file to the Expo project or bundle it into the client. If a separate server feature later requires a service account, store it only in server-side secret storage.

Email registration, resend, and recovery require working SMTP credentials. Google sign-in requires configured OAuth client IDs. When either integration is not configured, its API flow reports that prerequisite rather than issuing a local or unverified session.

The Expo native map keys are injected from the environment; no provider credentials are committed here. Browser-based route and booking flows do not require a map provider key.

Keep the Neon connection URL in environment/deployment secret settings; never put it in source control or chat. `DATABASE_URL` is preferred, with `NEON_DATABASE_URL` supported as an alias. The schema migration can also be run directly in Neon's SQL Editor; neither this code change nor its tests contacts a production database.

## Roadmap prerequisites

Authoritative route/stage data and stewardship, fares, seat/capacity management, operator assignment and verification, background location policy, live ETA methodology, payment provider configuration, notification delivery, and production app signing remain external product/infrastructure work. Until implemented and supplied, the app must not present them as available.
