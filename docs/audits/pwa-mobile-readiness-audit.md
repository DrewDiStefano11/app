# FitCore PWA & Mobile Readiness Audit

## 1. Executive Summary
FitCore is designed as a mobile-first fitness app, but its PWA foundations are currently minimal. While basic mobile metadata exists in the root route, the app lacks a web manifest, icons, and service worker. This audit identifies the gaps needed to make FitCore feel like a native installable application.

## 2. Current PWA Status
- **Manifest:** Missing.
- **Icons:** Missing (no favicons or app icons found in `public/`).
- **Service Worker:** Missing.
- **Mobile Metadata:** Partially present in `src/routes/__root.tsx`.

## 3. Installability Checklist
- [ ] `manifest.json` present: **No**
- [ ] `manifest.json` linked in HTML: **No**
- [ ] At least 192x192px and 512x512px icons: **No**
- [ ] Service Worker registered with `fetch` handler: **No**
- [ ] HTTPS (Production): **TBD**

## 4. Mobile Metadata Checklist
- [x] `viewport` (width, scale, viewport-fit=cover): **Yes**
- [x] `theme-color`: **Yes** (#1a1626)
- [x] `apple-mobile-web-app-capable`: **Yes**
- [x] `apple-mobile-web-app-status-bar-style`: **Yes** (black-translucent)
- [ ] `application-name`: **No**
- [ ] `apple-touch-icon`: **No**

## 5. Icon/Manifest Checklist
- [ ] `manifest.json` contains `name`: **No**
- [ ] `manifest.json` contains `short_name`: **No**
- [ ] `manifest.json` contains `start_url`: **No**
- [ ] `manifest.json` contains `display` (standalone/fullscreen): **No**
- [ ] Maskable icon support: **No**
- [ ] Favicon (standard): **No**

## 6. Service Worker/Offline Checklist
- [ ] Service worker presence: **No**
- [ ] Offline fallback behavior: **No**
- [ ] Cache management Strategy: **N/A**

## 7. Issues Found
1. **Missing Web Manifest:** The app cannot be "Installed" as a PWA on most platforms without a `manifest.json`.
2. **Missing Assets:** There are no app icons, favicons, or splash screen images in the repository.
3. **Generic Project Name:** `package.json` is still named `tanstack_start_ts`.
4. **Incomplete Meta Tags:** Missing `application-name` and `apple-touch-icon` declarations.
5. **No Offline Support:** The app requires an active connection for all parts unless a service worker is implemented.

## 8. Fixes Made
- Created `public/manifest.json` with base configuration.
- Linked `manifest.json` in `src/routes/__root.tsx`.
- Added `application-name` and `apple-touch-icon` link (placeholder) to `src/routes/__root.tsx`.
- Updated `package.json` name to `fitcore`.

## 9. Remaining Recommended Fixes
- **Asset Generation:** Generate a set of icons (16x16, 32x32, 180x180, 192x192, 512x512) and place them in `public/`.
- **Service Worker:** Implement `@vite-pwa/plugin` or a custom service worker to enable offline capabilities and faster load times via caching.
- **iOS Splash Screens:** Generate `apple-touch-startup-image` links for various iPhone/iPad screen sizes to avoid the white flash during app launch.

## 10. Files Reviewed
- `src/routes/__root.tsx`
- `package.json`
- `vite.config.ts`
- `src/styles.css`
- `public/` (directory)
