# Mini Trainer Engine - Project State

## Project Overview

**Name**: Mini Trainer Engine  
**Version**: 0.1.0  
**Description**: A reusable, configurable trainer application shell for creating web-based learning applications. Build subject-specific trainers with exercise types, gamification, and accessibility features that can be distributed via USB or as a Progressive Web App (PWA).

**Repository**: <https://github.com/your-org/mini-trainer-engine>

---

## Technology Stack

### Frontend Framework

- **React**: 18.3.1 (Functional components only)
- **TypeScript**: 5.6.3 (strict mode enabled)
- **Vite**: 6.0.5 (Build tool with file:// protocol support)

### State Management

- **Zustand**: 5.0.3 (Lightweight state management)

### Styling

- **Tailwind CSS**: 3.4.17
- **PostCSS**: 8.5.6
- **Autoprefixer**: 10.4.24

### Routing

- **React Router DOM**: 6.28.2

### Internationalization

- **i18next**: 24.2.2
- **react-i18next**: 15.4.0

### Storage

- **idb**: 8.0.1 (IndexedDB wrapper)
- localStorage (native)

### Testing

- **Vitest**: 2.1.8
- **@testing-library/react**: 16.1.0
- **@testing-library/jest-dom**: 6.9.1
- **jsdom**: 28.1.0

### Code Quality

- **ESLint**: 9.39.2
- **@typescript-eslint/eslint-plugin**: 8.55.0
- **@typescript-eslint/parser**: 8.55.0

---

## Implementation Status

### Completed Features

#### Core Engine (100%)

- [x] Configuration-driven architecture
- [x] Component registry pattern for exercise types
- [x] Dual storage strategy (localStorage + IndexedDB)
- [x] Configuration loading and validation system
- [x] Router setup with React Router

#### Exercise Types (100% - 10 types)

- [x] Multiple Choice Exercise
- [x] Fill-in-the-Blank Exercise
- [x] Matching Exercise
- [x] Sentence Builder Exercise
- [x] Category Sort Exercise
- [x] Word Order Exercise
- [x] Connector Insert Exercise
- [x] Conjugation Table Exercise
- [x] Writing Exercise
- [x] Picture Vocabulary Exercise

#### Gamification System (100%)

- [x] Star rating system (0-3 stars per exercise)
- [x] Level progression based on accumulated stars
- [x] Badge system with milestone achievements
- [x] Streak tracking for consecutive daily practice
- [x] Progress bars and visual feedback
- [x] Celebration animations (level up, badge earned)

#### Accessibility Features (100% - WCAG 2.1 AA)

- [x] Full keyboard navigation
- [x] Screen reader support (NVDA, JAWS, VoiceOver, TalkBack)
- [x] High contrast mode
- [x] Adjustable font sizes (normal, large, extra-large)
- [x] Reduced motion support
- [x] Sound toggle
- [x] Skip-to-content link
- [x] ARIA live regions for dynamic content
- [x] Focus trap for modals
- [x] Visible focus indicators

#### Internationalization (100%)

- [x] i18next integration
- [x] English translations (en.json)
- [x] German translations (de.json)
- [x] Extensible locale system

#### Build System (100%)

- [x] Vite build with file:// protocol compatibility
- [x] IIFE output format for USB distribution
- [x] PWA build option with service worker
- [x] Configuration validation script (validate-config.mjs)
- [x] Interactive exercise creation tool (add-exercise.mjs)
- [x] Exercise data build script (build-exercise-data.mjs)

#### Testing (100%)

- [x] 379 tests written
- [x] 80%+ code coverage
- [x] Unit tests for utilities
- [x] Component tests for exercise types
- [x] Hook tests for custom hooks
- [x] Store tests for Zustand stores

#### Documentation (100%)

- [x] Comprehensive README.md
- [x] GETTING_STARTED.md
- [x] CONFIGURATION.md
- [x] EXERCISES.md
- [x] GAMIFICATION.md
- [x] ACCESSIBILITY.md
- [x] DEPLOYMENT.md
- [x] EXTENDING.md
- [x] ARCHITECTURE.md
- [x] CHANGELOG.md
- [x] CONTRIBUTING.md

---

## Project Structure

```
mini-trainer-engine/
src/
  core/                    # Core engine (unchanged between trainers)
    components/
      exercises/           # 10 exercise type components
      gamification/        # Stars, badges, progress components
      accessibility/       # Accessibility settings and utilities
    hooks/                 # Custom React hooks
    stores/                # Zustand state management
    storage/               # IndexedDB and localStorage utilities
    utils/                 # Utility functions
    i18n/                  # Internationalization
    config/                # Configuration loading and validation
  config/                  # Configuration files (customize per trainer)
    subject.json           # Subject/domain definition
    areas.json             # Observation/diagnostic areas
    themes.json            # Content themes
    badges.json            # Achievement definitions
  types/                   # TypeScript type definitions
  pages/                   # Page components
  data/                    # Exercise content data
public/
  data/                    # Generated exercise data
  fonts/                   # Custom fonts
scripts/                   # Build and utility scripts
docs/                      # Documentation
```

---

## Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `src/config/subject.json` | Subject definition and enabled exercise types | Complete |
| `src/config/areas.json` | Observation/diagnostic areas | Complete |
| `src/config/themes.json` | Content themes | Complete |
| `src/config/badges.json` | Achievement badge definitions | Complete |
| `src/data/exercises.json` | Exercise content data | Complete |

---

## Key Design Decisions

1. **Separation of Core and Config**: The `src/core/` directory contains engine code that never changes between trainers. All customization happens in `src/config/`.

2. **Component Registry Pattern**: Exercise types are mapped to components via a registry, enabling easy addition of new types without modifying core code.

3. **Dual Storage Strategy**: Settings in localStorage, user data in IndexedDB for robust offline support.

4. **file:// Protocol Compatibility**: Built output works without a web server, enabling USB distribution for offline use.

5. **WCAG 2.1 AA Compliance**: All components meet accessibility standards with keyboard navigation, screen reader support, and visual customization options.

---

## Next Steps / Future Work

### Planned for 0.2.0

- [ ] Additional exercise types
- [ ] Enhanced analytics dashboard
- [ ] Teacher dashboard improvements
- [ ] Export/import user data

### Planned for 0.3.0

- [ ] Spaced repetition algorithm
- [ ] Adaptive difficulty
- [ ] Multi-profile support
- [ ] Parent/guardian dashboard

### Under Consideration

- [ ] Mobile app wrapper
- [ ] Cloud sync
- [ ] Collaborative features
- [ ] AI-powered hints

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run validate` | Validate configuration files |

---

## Quality Metrics

- **Test Coverage**: 80%+
- **TypeScript**: Strict mode enabled
- **Accessibility**: WCAG 2.1 AA compliant
- **Linting**: ESLint with TypeScript rules

---

## Codebase Review 2026-02-23

### 1. Game Engine Logic Review (FIXED)

The following issues were identified and resolved in the game engine logic:

| Issue | Description | Fix Applied |
|-------|-------------|-------------|
| Issue #2 | Inconsistent star calculation | Consolidated to single `calculateStars()` function |
| Issue #3 | Exercise completion deduplication | Added `completedExerciseIds` tracking |
| Issue #4 | Stale profile reference | Fixed to use `getState()` |
| Issue #5 | Race condition in badge checking | Get fresh state before checking |
| Issue #7 | Star count validation | Added bounds checking |
| Issue #10 | Default stars when no profile | Return 0 instead of 1 |

**Files Modified**: `src/core/utils/gamification.ts`, `src/core/stores/profileStore.ts`

### 2. Save/Load Functionality Review (FIXED)

Issues identified and resolved in the save/load system:

- **Silent IndexedDB sync failures**: Fixed with proper promise handling
- **Diagnostic logging**: Added comprehensive logging across storage modules
- **Test mock fix**: Fixed missing `themeLevels` in test mock
- **Documentation**: Documented version number inconsistencies

**Files Modified**: `src/core/storage/db.ts`, `src/core/storage/localStorage.ts`, `src/core/stores/profileStore.test.ts`

### 3. Save State Isolation & Security Review (DOCUMENTED - NOT FIXED)

**Critical vulnerabilities documented for future implementation:**

| Vulnerability ID | Description | Risk Level |
|------------------|-------------|------------|
| V1 | No trainer isolation - shared database across trainers | High |
| V2 | No save file integrity - plaintext JSON, no checksums | Medium |
| V3 | No value range validation - can set any values | Medium |
| V4 | No badge earning verification - can add unearned badges | Medium |

**Recommendations for future implementation:**

- Add `trainerId` to `SaveGamePayload`
- Use trainer-specific database names
- Add checksum/signature for save files
- Add value range validation on import

**Reference**: See `docs/GAME_ENGINE_FIX_PLAN.md` for detailed implementation plan

### 4. PWA & Offline Functionality Review (ISSUES FOUND)

**Critical Bug Identified:**

- Exercise data global variable mismatch: `window.__TRAINER_EXERCISES__` vs `window.EXERCISE_DATA`
- This causes exercise data to not load properly in PWA/offline mode

**Other Issues:**

- Missing proper PWA icons (192x192, 512x512)
- Service worker missing build integration
- Incomplete static asset pre-caching

**Status**: Issues documented, requires fix in future sprint

---

## Last Updated

**Date**: 2026-02-23  
**Time**: 18:04 CET (17:04 UTC)  
**Version**: 0.1.0  
**Status**: Codebase review complete, game engine and save/load fixes applied, security vulnerabilities documented
