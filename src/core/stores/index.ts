/**
 * Store module exports for the Mini Trainer Engine.
 * 
 * Provides centralized exports for all Zustand stores.
 */

// Application settings store
export {
    useAppStore,
    selectLocale,
    selectTheme,
    selectFontSize,
    selectHighContrast,
    selectAnimationsEnabled,
    selectSoundEnabled,
    selectTeacherAuthenticated,
} from './appStore';

export type {
    AppSettings,
    AppState,
    FontSize,
} from './appStore';

// Profile store
export {
    useProfileStore,
    selectActiveProfile,
    selectNickname,
    selectAvatar,
    selectTotalStars,
    selectCurrentStreak,
    selectLongestStreak,
    selectBadges,
    selectThemeProgress,
    selectLevel,
} from './profileStore';

export type {
    ProfileState,
} from './profileStore';

// Exercise session store
export {
    useExerciseStore,
    selectCurrentExercise,
    selectProgress,
    selectStats,
    selectResults,
    selectAnswer,
    selectIsSessionActive,
    selectCorrectRate,
} from './exerciseStore';

export type {
    ExerciseAnswer,
    SessionStats,
    ExerciseSessionState,
} from './exerciseStore';
