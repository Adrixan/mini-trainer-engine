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

## Original App Recommendations Analysis

Analysis of recommendations from `plans/ORIGINAL_APP_ANALYSIS.md` (section 10).

### Implementation Status (2026-02-27)

#### ✅ Already Implemented

**High Priority (Core Flow):**

1. Profile creation with avatar selection - `src/core/stores/profileStore.ts` (AVATAR_EMOJIS, createProfile)
2. Theme selection page - `src/pages/ThemeSelectPage.tsx`, `src/core/components/theme/ThemeCard.tsx`
3. Level selection page - `src/pages/LevelSelectPage.tsx`, `src/core/components/level/LevelCard.tsx`
4. Difficulty progression - currentLevels and themeLevels in profile store

**Medium Priority (Gamification):**

1. Streak display - implemented in profile store (currentStreak, longestStreak)
2. Badge checking - earnBadge action, badges array in profile
3. LevelUpCelebration overlay - `src/core/components/gamification/LevelUpCelebration.tsx`
4. BadgeEarnedToast - `src/core/components/gamification/BadgeEarnedToast.tsx`
5. Save game export/import - exportSaveGame/importSaveGame in profileStore.ts

**Routing:**

- Most routes implemented in `src/core/router/index.tsx`:
  - `/` → HomePage
  - `/themes` → ThemeSelectPage
  - `/themes/:themeId/levels` → LevelSelectPage
  - `/exercise/:themeId` → ExercisePage
  - `/profile` → ProfilePage
  - `/progress` → ProgressPage
  - `/settings` → SettingsPage

#### ❌ Still Missing

1. ~~**`/badges` route** - No BadgeGalleryPage component exists~~ ✅ IMPLEMENTED
2. ~~**`/daily-challenge` route** - No DailyChallengePage component exists~~ ✅ IMPLEMENTED
3. ~~**Sound effects** - Web Audio API sounds not implemented~~ ✅ IMPLEMENTED

#### Next Steps Recommendations

1. **High Priority:** Create BadgeGalleryPage for `/badges` route
2. **Medium Priority:** Create DailyChallengePage for `/daily-challenge` route
3. **Low Priority:** Implement Web Audio API sound effects (sounds.ts utility)

Note: The core flow is largely complete. The missing features are add-ons that can be implemented incrementally.

### Implementation Update (2026-02-27)

The following features from the recommendations have been implemented:

1. **BadgeGalleryPage** (`src/pages/BadgeGalleryPage.tsx`)
   - Full page component displaying all badges (earned and locked)
   - Shows progress bar and summary
   - Uses AchievementGrid component
   - Route: `/badges`

2. **DailyChallengePage** (`src/pages/DailyChallengePage.tsx`)
   - Daily challenge UI with start/complete flow
   - Tracks daily completion in localStorage
   - Awards bonus stars on completion
   - Route: `/daily-challenge`

3. **Sound Effects** (`src/core/utils/sounds.ts`)
   - Web Audio API implementation (no external files)
   - Functions: playCorrect, playIncorrect, playLevelUp, playBadge, playStar
   - Works offline and with file:// protocol
   - Exports soundManager singleton

4. **Router Updates** (`src/core/router/index.tsx`)
   - Added `/badges` route
   - Added `/daily-challenge` route
   - Added BADGES and DAILY_CHALLENGE to ROUTES constants

## Last Updated

2026-02-28

---

## Implementation Update (2026-02-28)

### Bug Fixes

1. **Fixed sounds.ts AudioContext issue** - Added null checks to handle missing AudioContext in Node.js/test environments
2. **Fixed storage isolation tests** - Updated localStorage.ts to include app ID in storage keys (e.g., `mte:daz:app:theme` instead of `mte:app:theme`)

### New Features

3. **Installed @vitest/coverage-v8** - Added test coverage dependency
2. **Sound integration** - Wired up sounds.ts to gamification system:
   - useExercisePageState.ts: playCorrect(), playIncorrect()
   - useGamification.ts: playLevelUp(), playBadge()
   - BadgeEarnedToast.tsx: playBadge() on toast mount
   - StarDisplay.tsx: playStar() with staggered delay
3. **Area-filtered route** - Already exists: `/exercise/:themeId/:areaId` filters exercises by area
4. **Teacher features**:
   - TeacherPinPage.tsx - PIN entry/setup
   - TeacherDashboardPage.tsx - Student management
   - Routes: /teacher/pin, /teacher/dashboard

### New Tests

7. **BadgeGalleryPage.test.tsx** - 9 tests
2. **DailyChallengePage.test.tsx** - 8 tests
3. **sounds.test.ts** - 21 tests

### Test Results

- All 480+ tests pass
- 38 new tests added
