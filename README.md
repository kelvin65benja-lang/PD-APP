# PD APP — Pwani Directory Production Upgrade

This package upgrades the existing PD APP codebase without replacing its existing pages or Firebase project.

## Included
- `index.html` — existing PD APP UI plus the production upgrade hook.
- `assets/css/pd-upgrade.css` — Coastal weather carousel, presence status and accessibility/premium UI polish.
- `assets/js/pd-upgrade.js` — seven-location Coastal weather, offline weather cache, Services taxonomy normalization, live presence heartbeat and admin presence rendering.
- `manifest.json` — PWA metadata.
- `sw.js` — offline app shell and runtime cache.
- `firestore.rules` — recommended production Firestore security model.
- `firebase.json` — Firebase CLI rules configuration.

## Weather
Weather uses Open-Meteo current conditions for Mombasa, Malindi, Kilifi, Diani, Lamu, Kwale and Watamu. The carousel refreshes automatically and caches the latest successful result for offline viewing.

## Services category
Legacy values such as `Fundi`, `Fundis`, and `Find Fundi` are normalized to `Services` at the UI/query layer so existing listings continue to work. New UI terminology is `Find Services` / `Services`.

## Admin presence
Presence uses the existing Firestore `presence` collection. The app sends a heartbeat every 30 seconds and treats a device as active for 90 seconds. The admin list displays the stored phone number, page, device information and active indicator.

## Firebase security note
The original app uses a local administrator passcode in the browser. A browser-only passcode is not a secure server-side authorization mechanism. `firestore.rules` therefore uses Firebase Authentication plus an `admins/{uid}` record for privileged writes. Before deploying these rules, enable Firebase Authentication and create the intended administrator account/document. Do not deploy permissive `allow write: if true` rules.

## Deploy
Serve the folder over HTTPS. Do not open `index.html` directly with `file://`; service workers and Firebase require a web origin.
