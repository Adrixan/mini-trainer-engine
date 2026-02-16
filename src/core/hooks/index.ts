// Exercise hooks
export { useExerciseSession } from './useExerciseSession';
export type { ExerciseSession, ExerciseSessionState, UseExerciseSessionOptions } from './useExerciseSession';

export { useExerciseScoring, calculateStarRating, getStarDisplay, calculateProgress, isLevelThresholdMet, getLevelFromStars } from './useExerciseScoring';
export type { ExerciseTypeStats, ScoringStats, UseExerciseScoringOptions } from './useExerciseScoring';

export { useFocusTrap, useFocusNavigation, useRovingTabIndex } from './useFocusTrap';
export type { UseFocusTrapOptions } from './useFocusTrap';

// Accessibility hooks
export { useAccessibility, usePrefersReducedMotion, usePrefersHighContrast } from './useAccessibility';
export type { UseAccessibilityReturn, SystemPreferences } from './useAccessibility';

// Gamification hooks
export {
    useGamification,
    useLevelProgress,
    useStreak,
    useBadges
} from './useGamification';
export type {
    ExerciseCompletionResult,
    GamificationState,
    GamificationActions,
    UseGamificationReturn,
    UseGamificationOptions
} from './useGamification';
