# Project State

## Build System

### USB/PWA Distribution Types

The project supports two distribution types:

1. **USB Version** (offline, file:// protocol)
   - Opens directly in browser without a local server
   - Data loaded via `window.__TRAINER_*` global variables
   - No service worker
   - Output: `dist/{appId}/`

2. **PWA Version** (online, installable)
   - Hosted online, can be installed as PWA
   - Data loaded via fetch requests
   - Includes service worker for offline support
   - Output: `dist/{appId}-pwa/`

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:daz` | Build DAZ USB version |
| `npm run build:daz:pwa` | Build DAZ PWA version |
| `npm run build:math` | Build Math USB version |
| `npm run build:math:pwa` | Build Math PWA version |
| `npm run build:all` | Build both versions for all apps |

### Key Files Modified

- `src/core/config/loader.ts` - Added window object fallback for USB mode
- `scripts/build-app.mjs` - Generates JS config files with global variables
- `scripts/build-all-apps.mjs` - Added --both flag for building both versions
- `index.html` - Added config script tags
- `package.json` - Added build scripts

### How It Works

1. Build generates config JS files (e.g., `subject.js`) with:

   ```javascript
   window.__TRAINER_SUBJECT__ = { ... };
   ```

2. index.html loads these via script tags before the app runs

3. loader.ts checks window object first, falls back to fetch for PWA mode

## Last Updated

2026-02-26
