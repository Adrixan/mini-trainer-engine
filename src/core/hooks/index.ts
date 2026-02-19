// Exercise hooks
export { useExerciseSession } from './useExerciseSession';
export type { UseExerciseSessionOptions, UseExerciseSessionReturn } from './useExerciseSession';

export { useExerciseScoring, calculateStarRating, getStarDisplay, calculateProgress, isLevelThresholdMet, getLevelFromStars } from './useExerciseScoring';
export type { ExerciseTypeStats, ScoringStats, UseExerciseScoringOptions } from './useExerciseScoring';

export { useExerciseLogic, useTextInputExercise, useMultipleChoiceExercise, useOrderingExercise, calculateStarsFromAttempts, calculateStarsFromTime } from './useExerciseLogic';
export type { UseExerciseLogicOptions, UseExerciseLogicReturn, ExerciseResult } from './useExerciseLogic';

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
