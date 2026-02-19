/**
 * Custom hook for managing exercise sessions.
 * 
 * Encapsulates session lifecycle, answer submission, gamification processing,
 * and navigation logic for exercise pages.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@core/router';
import { useExerciseStore } from '@core/stores';
import { useProfileStore } from '@core/stores/profileStore';
import { useAppStore } from '@core/stores/appStore';
import { useGamification } from '@core/hooks/useGamification';
import { playCorrect, playIncorrect, playLevelUp, playBadge } from '@core/utils/sounds';
import { saveExerciseResult } from '@core/storage';
import { selectCurrentExercise, selectProgress, selectIsSessionActive } from '@core/stores/exerciseStore';
import type { Badge } from '@/types/profile';
import type { Exercise, ExerciseResult } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface UseExerciseSessionOptions {
    /** Exercises to use in the session */
    exercises: Exercise[];
    /** Theme ID for the session */
    themeId: string;
    /** Optional area ID for filtering */
    areaId?: string;
}

export interface UseExerciseSessionReturn {
    /** Current exercise being displayed */
    currentExercise: Exercise | null;
    /** Progress information */
    progress: { current: number; total: number };
    /** Whether the session is complete */
    isCompleted: boolean;
    /** Whether solution is being shown */
    showSolution: boolean;
    /** Whether user has answered current exercise */
    hasAnswered: boolean;
    /** Handle answer submission */
    handleSubmit: (correct: boolean) => void;
    /** Handle show solution */
    handleShowSolution: () => void;
    /** Handle next exercise */
    handleNext: () => void;
    /** Handle session finish */
    handleFinish: () => void;
    /** Level up celebration state */
    levelUpLevel: number | null;
    /** Badges earned during session */
    earnedBadges: Badge[];
    /** Current badge index for display */
    currentBadgeIndex: number;
    /** Dismiss current badge */
    dismissBadge: () => void;
    /** Clear level up state */
    clearLevelUp: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing exercise sessions.
 * 
 * @example
 * ```tsx
 * const {
 *   currentExercise,
 *   progress,
 *   handleSubmit,
 *   handleNext,
 *   isCompleted,
 * } = useExerciseSession({ exercises, themeId });
 * ```
 */
export function useExerciseSession({
    exercises,
    themeId,
    areaId,
}: UseExerciseSessionOptions): UseExerciseSessionReturn {
    const navigate = useNavigate();

    // Exercise store actions and state
    const startSession = useExerciseStore((s) => s.startSession);
    const endSession = useExerciseStore((s) => s.endSession);
    const submitAnswer = useExerciseStore((s) => s.submitAnswer);
    const nextExercise = useExerciseStore((s) => s.nextExercise);
    const incrementAttempts = useExerciseStore((s) => s.incrementAttempts);
    const setShowSolution = useExerciseStore((s) => s.setShowSolution);
    const isSessionActive = useExerciseStore(selectIsSessionActive);
    const currentExercise = useExerciseStore(selectCurrentExercise);
    const progress = useExerciseStore(selectProgress);
    const showSolution = useExerciseStore((s) => s.showSolution);
    const isCompleted = useExerciseStore((s) => s.isCompleted);
    const answer = useExerciseStore((s) => s.answer);
    const currentThemeId = useExerciseStore((s) => s.themeId);
    const currentLevel = useExerciseStore((s) => s.currentExercise?.level);

    // Profile and gamification
    const activeProfile = useProfileStore((s) => s.activeProfile);
    const incrementStreak = useProfileStore((s) => s.incrementStreak);
    const soundEnabled = useAppStore((s) => s.settings.soundEnabled);
    const { processExerciseCompletion } = useGamification();

    // Track answer state for current attempt
    const [hasAnswered, setHasAnswered] = useState(false);

    // Track gamification notifications
    const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
    const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
    const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

    // Track level for session reset detection
    const levelRef = useRef<number | undefined>(undefined);

    // Start session when exercises are loaded
    // Reset session if level or theme changes
    useEffect(() => {
        if (exercises.length > 0) {
            // Check if we need to reset the session (level or theme changed)
            const levelChanged = currentLevel !== undefined && currentLevel !== levelRef.current;
            const themeChanged = currentThemeId !== null && currentThemeId !== themeId;

            if (levelChanged || themeChanged || !isSessionActive) {
                endSession();
                startSession(exercises, themeId, areaId);
                levelRef.current = currentLevel;
            }
        }
    }, [exercises, isSessionActive, startSession, endSession, themeId, areaId, currentLevel, currentThemeId]);

    // Handle answer submission
    const handleSubmit = useCallback((correct: boolean) => {
        incrementAttempts();

        // Play sound based on answer
        if (correct) {
            playCorrect(soundEnabled);
            submitAnswer(true);
            setHasAnswered(true);
        } else {
            playIncorrect(soundEnabled);
            // Allow retry if not correct
            submitAnswer(false);
            setHasAnswered(true);
        }
    }, [incrementAttempts, submitAnswer, soundEnabled]);

    // Handle next exercise with gamification processing
    const handleNext = useCallback(() => {
        // Process gamification if we have an answer
        if (answer && activeProfile && currentExercise) {
            const attempts = answer.attempts;
            const result = processExerciseCompletion(attempts);

            // Save exercise result to IndexedDB for progress tracking
            const exerciseResult: ExerciseResult = {
                id: `result-${currentExercise.id}-${Date.now()}`,
                childProfileId: activeProfile.id,
                exerciseId: currentExercise.id,
                areaId: currentExercise.areaId,
                themeId: currentExercise.themeId,
                level: currentExercise.level,
                correct: answer.correct,
                score: result.starsEarned,
                attempts: attempts,
                timeSpentSeconds: answer.timeSpentSeconds,
                completedAt: new Date().toISOString(),
            };
            saveExerciseResult(exerciseResult).catch(console.error);

            // Check for level up
            if (result.leveledUp && result.newLevel) {
                setLevelUpLevel(result.newLevel);
                playLevelUp(soundEnabled);
            }

            // Check for new badges
            if (result.newBadges.length > 0) {
                setEarnedBadges(result.newBadges);
                setCurrentBadgeIndex(0);
                playBadge(soundEnabled);
            }

            // Update streak
            incrementStreak();
        }

        nextExercise();
        setHasAnswered(false);
        setShowSolution(false);
    }, [answer, activeProfile, currentExercise, processExerciseCompletion, incrementStreak, nextExercise, setShowSolution, soundEnabled]);

    // Handle show solution
    const handleShowSolution = useCallback(() => {
        setShowSolution(true);
    }, [setShowSolution]);

    // Handle session complete
    const handleFinish = useCallback(() => {
        // Navigate back to the level selection for this theme
        if (themeId) {
            navigate(ROUTES.LEVEL_SELECT(themeId));
        } else {
            navigate(ROUTES.HOME);
        }
    }, [navigate, themeId]);

    // Dismiss current badge
    const dismissBadge = useCallback(() => {
        const nextIndex = currentBadgeIndex + 1;
        if (nextIndex >= earnedBadges.length) {
            setEarnedBadges([]);
            setCurrentBadgeIndex(0);
        } else {
            setCurrentBadgeIndex(nextIndex);
        }
    }, [currentBadgeIndex, earnedBadges.length]);

    // Clear level up state
    const clearLevelUp = useCallback(() => {
        setLevelUpLevel(null);
    }, []);

    return {
        currentExercise,
        progress,
        isCompleted,
        showSolution,
        hasAnswered,
        handleSubmit,
        handleShowSolution,
        handleNext,
        handleFinish,
        levelUpLevel,
        earnedBadges,
        currentBadgeIndex,
        dismissBadge,
        clearLevelUp,
    };
}
