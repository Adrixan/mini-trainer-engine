/**
 * Hook for managing ExercisePage state and logic.
 *
 * Orchestrates session management, gamification, and navigation.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ROUTES } from '@core/router';
import { useExercisesByTheme, useExercisesByArea, useExercises, useTheme, useThemes } from '@core/config';
import { useExerciseStore, selectCurrentExercise, selectProgress, selectIsSessionActive } from '@core/stores';
import { MAX_ATTEMPTS_PER_EXERCISE } from '@core/stores/exerciseStore';
import { useProfileStore, selectThemeLevels } from '@core/stores/profileStore';
import { useAppStore } from '@core/stores/appStore';
import { useGamification } from '@core/hooks/useGamification';
import { playCorrect, playIncorrect } from '@core/utils/sounds';
import { hasExerciseBeenCompleted, getExerciseResultsByTheme } from '@core/storage';
import { isLevelAccessible } from '@core/utils/gamification';
import type { Exercise } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface UseExercisePageStateReturn {
    // Exercise data
    exercises: Exercise[];
    theme: ReturnType<typeof useTheme>;
    themeId: string | undefined;
    areaId: string | undefined;
    level: string | undefined;

    // Session state
    currentExercise: Exercise | null;
    progress: { current: number; total: number };
    isCompleted: boolean;
    showSolution: boolean;
    levelFailed: boolean;
    hasAnswered: boolean;
    answer: ReturnType<typeof useExerciseStore.getState>['answer'];

    // Gamification
    notifications: ReturnType<typeof useGamification>['notifications'];
    dismissBadge: () => void;
    clearLevelUp: () => void;

    // Handlers
    handleSubmit: (correct: boolean) => void;
    handleNext: () => Promise<void>;
    handleShowSolution: () => void;
    handleRestartLevel: () => void;
    handleFinish: () => Promise<void>;
    handleBack: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useExercisePageState(): UseExercisePageStateReturn {
    const { themeId, areaId, level } = useParams<{ themeId: string; areaId?: string; level?: string }>();
    const navigate = useNavigate();

    // Get theme info for display
    const theme = useTheme(themeId ?? '');
    const allThemes = useThemes();

    // Get exercises based on theme/area filters
    const allExercises = useExercises();
    const exercisesByTheme = useExercisesByTheme(themeId ?? 'default');
    const exercisesByArea = useExercisesByArea(areaId ?? '');

    // Determine which exercises to use
    const baseExercises = areaId
        ? exercisesByArea
        : (themeId === 'default' || !themeId)
            ? allExercises
            : exercisesByTheme;

    // Filter by level if specified
    const exercises: Exercise[] = level
        ? baseExercises.filter((e) => e.level === Number(level))
        : baseExercises;

    // Exercise store actions and state
    const startSession = useExerciseStore((s) => s.startSession);
    const endSession = useExerciseStore((s) => s.endSession);
    const submitAnswer = useExerciseStore((s) => s.submitAnswer);
    const nextExercise = useExerciseStore((s) => s.nextExercise);
    const incrementAttempts = useExerciseStore((s) => s.incrementAttempts);
    const setShowSolution = useExerciseStore((s) => s.setShowSolution);
    const restartLevel = useExerciseStore((s) => s.restartLevel);
    const isSessionActive = useExerciseStore(selectIsSessionActive);
    const currentExercise = useExerciseStore(selectCurrentExercise);
    const progress = useExerciseStore(selectProgress);
    const showSolution = useExerciseStore((s) => s.showSolution);
    const isCompleted = useExerciseStore((s) => s.isCompleted);
    const levelFailed = useExerciseStore((s) => s.levelFailed);
    const currentThemeId = useExerciseStore((s) => s.themeId);
    const currentLevel = useExerciseStore((s) => s.currentExercise?.level);
    const answer = useExerciseStore((s) => s.answer);

    // Profile and gamification
    const activeProfile = useProfileStore((s) => s.activeProfile);
    const themeLevels = useProfileStore(selectThemeLevels);
    const updateThemeLevel = useProfileStore((s) => s.updateThemeLevel);
    const soundEnabled = useAppStore((s) => s.settings.soundEnabled);
    const {
        processExerciseCompletion,
        notifications,
        dismissBadge,
        clearLevelUp
    } = useGamification();

    // Track answer state for current attempt
    const [hasAnswered, setHasAnswered] = useState(false);

    // Ref to prevent race conditions from rapid button clicks
    const isProcessingRef = useRef(false);

    // Access control: Check if user can access this level
    useEffect(() => {
        if (themeId && level && activeProfile) {
            const allThemeIds = allThemes.map(t => t.id);
            const numericLevel = Number(level);

            if (!isLevelAccessible(themeId, numericLevel, themeLevels, allThemeIds)) {
                navigate(ROUTES.LEVEL_SELECT(themeId));
            }
        }
    }, [themeId, level, activeProfile, themeLevels, allThemes, navigate]);

    // Start session when exercises are loaded
    useEffect(() => {
        if (exercises.length > 0) {
            const levelChanged = currentLevel !== undefined && currentLevel !== Number(level);
            const themeChanged = currentThemeId !== null && currentThemeId !== themeId;

            if (levelChanged || themeChanged || !isSessionActive) {
                endSession();
                startSession(exercises, themeId ?? 'default', areaId, activeProfile?.id);
            }
        }
    }, [exercises, isSessionActive, startSession, endSession, themeId, areaId, level, currentLevel, currentThemeId, activeProfile?.id]);

    // Handle answer submission
    const handleSubmit = useCallback((correct: boolean) => {
        incrementAttempts();

        if (correct) {
            playCorrect(soundEnabled);
            const result = submitAnswer(true);
            if (result.success) {
                setHasAnswered(true);
            }
        } else {
            playIncorrect(soundEnabled);
            const result = submitAnswer(false);
            if (result.success) {
                setHasAnswered(true);
            }
        }
    }, [incrementAttempts, submitAnswer, soundEnabled]);

    // Handle next exercise with gamification processing
    const handleNext = useCallback(async () => {
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        try {
            const currentAnswer = useExerciseStore.getState().answer;

            if (currentAnswer && activeProfile && currentExercise) {
                const wasPreviouslyCompleted = await hasExerciseBeenCompleted(activeProfile.id, currentExercise.id);

                if (!wasPreviouslyCompleted && currentAnswer.correct) {
                    const attempts = currentAnswer.attempts;
                    // processExerciseCompletion handles all gamification updates internally:
                    // - adds stars to profile
                    // - increments streak
                    // - checks for level up and badges
                    // - updates notification state (earnedBadges, levelUpLevel)
                    // Return value intentionally ignored - notifications are accessed via hook state
                    processExerciseCompletion(attempts);
                }
            }

            nextExercise();
            setHasAnswered(false);
            setShowSolution(false);
        } finally {
            isProcessingRef.current = false;
        }
    }, [activeProfile, currentExercise, processExerciseCompletion, nextExercise, setShowSolution]);

    // Handle show solution
    const handleShowSolution = useCallback(() => {
        setShowSolution(true);
    }, [setShowSolution]);

    // Handle level restart when failed
    const handleRestartLevel = useCallback(() => {
        restartLevel();
        setHasAnswered(false);
    }, [restartLevel]);

    // Handle session complete
    const handleFinish = useCallback(async () => {
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        try {
            const currentAnswer = useExerciseStore.getState().answer;

            if (currentAnswer && activeProfile && currentExercise) {
                const wasPreviouslyCompleted = await hasExerciseBeenCompleted(activeProfile.id, currentExercise.id);

                if (!wasPreviouslyCompleted && currentAnswer.correct) {
                    const attempts = currentAnswer.attempts;
                    // processExerciseCompletion handles all gamification updates internally
                    // Return value intentionally ignored - notifications are accessed via hook state
                    processExerciseCompletion(attempts);
                }

                // Check if all exercises in this level/theme are completed
                if (themeId && level && currentAnswer.correct) {
                    const numericLevel = Number(level);
                    try {
                        const results = await getExerciseResultsByTheme(themeId);
                        const correctExerciseIds = new Set(
                            results.filter(r => r.correct).map(r => r.exerciseId)
                        );

                        const levelExercises = exercises.filter(e => e.level === numericLevel);
                        const allLevelExercisesCompleted = levelExercises.every(e =>
                            correctExerciseIds.has(e.id) || e.id === currentExercise.id
                        );

                        if (allLevelExercisesCompleted && levelExercises.length > 0) {
                            updateThemeLevel(themeId, numericLevel);
                        }
                    } catch {
                        // Log error but don't block user from finishing
                        // Level completion will be recalculated on next session
                        // Silently ignore
                    }
                }
            }

            await endSession();

            // Navigate to theme selection page after completing a level
            navigate(ROUTES.THEMES);
        } finally {
            isProcessingRef.current = false;
        }
    }, [activeProfile, currentExercise, processExerciseCompletion, navigate, themeId, level, exercises, updateThemeLevel, endSession]);

    // Handle back navigation
    const handleBack = useCallback(() => {
        if (themeId) {
            navigate(ROUTES.LEVEL_SELECT(themeId));
        } else {
            navigate(ROUTES.HOME);
        }
    }, [navigate, themeId]);

    // Handle keyboard navigation for next/finish
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && (showSolution || isCompleted)) {
                event.preventDefault();
                if (progress.current < progress.total) {
                    handleNext();
                } else {
                    handleFinish();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSolution, isCompleted, progress.current, progress.total, handleNext, handleFinish]);

    return {
        // Exercise data
        exercises,
        theme,
        themeId,
        areaId,
        level,

        // Session state
        currentExercise,
        progress,
        isCompleted,
        showSolution,
        levelFailed,
        hasAnswered,
        answer,

        // Gamification
        notifications,
        dismissBadge,
        clearLevelUp,

        // Handlers
        handleSubmit,
        handleNext,
        handleShowSolution,
        handleRestartLevel,
        handleFinish,
        handleBack,
    };
}

// Re-export MAX_ATTEMPTS_PER_EXERCISE for use in components
export { MAX_ATTEMPTS_PER_EXERCISE };
