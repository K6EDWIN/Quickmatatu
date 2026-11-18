# QuickMatatu

QuickMatatu is an Expo/React Native client backed by an Express API and a Turso (LibSQL) database. It has separate commuter and driver experiences.

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
| `TURSO_DATABASE_URL` | Turso database URL for the API |
| `TURSO_AUTH_TOKEN` | Database access token |
| `SESSION_SECRET` | At least 32 characters in production; signs seven-day API tokens |
| `EXPO_PUBLIC_API_URL` | API origin used by the app; defaults to `http://localhost:3001` |
| `EXPO_PUBLIC_WEB_ORIGIN` | Deployed web-app origin allowed by API CORS |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Restricted public Mapbox token required by the driver's native map |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Android map key, if required by the configured native map provider |
| `GOOGLE_MAPS_IOS_API_KEY` | iOS Google Maps key, if Google Maps is selected instead of the platform default |

Production API startup fails closed if the database credentials or `SESSION_SECRET` are missing. Native tokens are stored with SecureStore; browser tokens use tab-scoped session storage. Logout revokes outstanding tokens for that account. The Expo native map keys are injected from the environment; no provider credentials are committed here. Browser-based route and booking flows do not require a map provider key.

The API initializes its schema at startup and adds the driver details, booking assignment, and token-version columns needed by current flows. Apply and verify schema changes through the normal database change process before production rollout; this repository change does not connect to or alter a live database.

## Roadmap prerequisites

Authoritative route/stage data and stewardship, fares, seat/capacity management, operator assignment and verification, background location policy, live ETA methodology, payment provider configuration, notification delivery, and production app signing remain external product/infrastructure work. Until implemented and supplied, the app must not present them as available.
