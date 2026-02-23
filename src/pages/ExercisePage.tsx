/**
 * Exercise page component.
 * 
 * Displays exercise content and handles exercise sessions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ROUTES } from '@core/router';
import { useExercisesByTheme, useExercisesByArea, useExercises, useTheme, useThemes } from '@core/config';
import { useExerciseStore } from '@core/stores';
import { MAX_ATTEMPTS_PER_EXERCISE } from '@core/stores/exerciseStore';
import { useProfileStore, selectThemeLevels } from '@core/stores/profileStore';
import { useAppStore } from '@core/stores/appStore';
import { ExerciseRenderer } from '@core/components/exercises';
import { BadgeEarnedToast, LevelUpCelebration } from '@core/components/gamification';
import { selectCurrentExercise, selectProgress, selectIsSessionActive } from '@core/stores/exerciseStore';
import { useGamification } from '@core/hooks/useGamification';
import { playCorrect, playIncorrect, playLevelUp, playBadge } from '@core/utils/sounds';
import { hasExerciseBeenCompleted, getExerciseResultsByTheme } from '@core/storage';
import { isLevelAccessible } from '@core/utils/gamification';
import type { Badge } from '@/types/profile';

/**
 * Exercise page component.
 * Renders the current exercise and handles user interactions.
 */
export function ExercisePage() {
    const { themeId, areaId, level } = useParams<{ themeId: string; areaId?: string; level?: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Get theme info for display
    const theme = useTheme(themeId ?? '');
    const allThemes = useThemes();

    // Get exercises based on theme/area filters
    const allExercises = useExercises();
    const exercisesByTheme = useExercisesByTheme(themeId ?? 'default');
    const exercisesByArea = useExercisesByArea(areaId ?? '');

    // Determine which exercises to use
    // - If areaId is specified, use exercises by area
    // - If themeId is 'default' or not specified, use all exercises
    // - Otherwise, use exercises filtered by theme
    const baseExercises = areaId
        ? exercisesByArea
        : (themeId === 'default' || !themeId)
            ? allExercises
            : exercisesByTheme;

    // Filter by level if specified
    const exercises = level
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
    const incrementStreak = useProfileStore((s) => s.incrementStreak);
    const soundEnabled = useAppStore((s) => s.settings.soundEnabled);
    const { processExerciseCompletion } = useGamification();

    // Track answer state for current attempt
    const [hasAnswered, setHasAnswered] = useState(false);

    // Ref to prevent race conditions from rapid button clicks
    const isProcessingRef = useRef(false);

    // Track gamification notifications
    const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
    const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
    const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

    // Access control: Check if user can access this level
    useEffect(() => {
        if (themeId && level && activeProfile) {
            const allThemeIds = allThemes.map(t => t.id);
            const numericLevel = Number(level);

            if (!isLevelAccessible(themeId, numericLevel, themeLevels, allThemeIds)) {
                // Redirect to level select if user doesn't have access
                navigate(ROUTES.LEVEL_SELECT(themeId));
            }
        }
    }, [themeId, level, activeProfile, themeLevels, allThemes, navigate]);

    // Start session when exercises are loaded
    // Reset session if level or theme changes
    useEffect(() => {
        if (exercises.length > 0) {
            // Check if we need to reset the session (level or theme changed)
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

        // Play sound based on answer
        if (correct) {
            playCorrect(soundEnabled);
            const result = submitAnswer(true);
            // Only set hasAnswered if submission was successful
            if (result.success) {
                setHasAnswered(true);
            }
        } else {
            playIncorrect(soundEnabled);
            // Allow retry if not correct
            const result = submitAnswer(false);
            if (result.success) {
                setHasAnswered(true);
            }
        }
    }, [incrementAttempts, submitAnswer, soundEnabled]);

    // Handle next exercise with gamification processing
    const handleNext = useCallback(async () => {
        // Prevent race conditions from rapid button clicks
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        try {
            // Get the current answer state directly from the store to avoid stale closure
            const currentAnswer = useExerciseStore.getState().answer;

            // Process gamification if we have an answer
            if (currentAnswer && activeProfile && currentExercise) {
                // Check if this exercise was previously completed
                const wasPreviouslyCompleted = await hasExerciseBeenCompleted(activeProfile.id, currentExercise.id);

                // Only award points for first-time completions
                if (!wasPreviouslyCompleted && currentAnswer.correct) {
                    const attempts = currentAnswer.attempts;
                    const result = processExerciseCompletion(attempts);

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
            }

            nextExercise();
            setHasAnswered(false);
            setShowSolution(false);
        } finally {
            isProcessingRef.current = false;
        }
    }, [activeProfile, currentExercise, processExerciseCompletion, incrementStreak, nextExercise, setShowSolution, soundEnabled]);

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
        // Prevent race conditions from rapid button clicks
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        try {
            // Get the current answer state directly from the store to avoid stale closure
            const currentAnswer = useExerciseStore.getState().answer;

            // Process gamification for the last exercise if we have an answer
            if (currentAnswer && activeProfile && currentExercise) {
                // Check if this exercise was previously completed
                const wasPreviouslyCompleted = await hasExerciseBeenCompleted(activeProfile.id, currentExercise.id);

                // Only award points for first-time completions
                if (!wasPreviouslyCompleted && currentAnswer.correct) {
                    const attempts = currentAnswer.attempts;
                    const result = processExerciseCompletion(attempts);

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

                // Check if all exercises in this level/theme are completed and update theme level
                if (themeId && level && currentAnswer.correct) {
                    const numericLevel = Number(level);
                    // Get all exercise results for this theme to check level completion
                    try {
                        const results = await getExerciseResultsByTheme(themeId);
                        const correctExerciseIds = new Set(
                            results.filter(r => r.correct).map(r => r.exerciseId)
                        );

                        // Check if all exercises in this level are completed
                        const levelExercises = exercises.filter(e => e.level === numericLevel);
                        const allLevelExercisesCompleted = levelExercises.every(e =>
                            correctExerciseIds.has(e.id) || e.id === currentExercise.id
                        );

                        if (allLevelExercisesCompleted && levelExercises.length > 0) {
                            // Update theme level to this completed level
                            updateThemeLevel(themeId, numericLevel);
                        }
                    } catch (error) {
                        console.error('Failed to check level completion:', error);
                    }
                }
            }

            // End the session - this will persist all results to IndexedDB
            await endSession();

            // Navigate back to the level selection for this theme
            if (themeId) {
                navigate(ROUTES.LEVEL_SELECT(themeId));
            } else {
                navigate(ROUTES.HOME);
            }
        } finally {
            isProcessingRef.current = false;
        }
    }, [activeProfile, currentExercise, processExerciseCompletion, incrementStreak, navigate, themeId, level, exercises, updateThemeLevel, soundEnabled, endSession]);

    // Handle keyboard navigation for next/finish
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle Enter key when exercise is completed or solution is shown
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

    // Loading state
    if (exercises.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <div className="animate-pulse space-y-4 w-full max-w-md">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
                    <div className="h-32 bg-gray-200 rounded-xl" />
                    <div className="h-12 bg-gray-200 rounded-xl" />
                </div>
                <p className="text-gray-500 mt-4">
                    {t('exercise.loading')}
                </p>
            </div>
        );
    }

    // Session complete state
    if (isCompleted && !currentExercise) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('exercise.complete')}
                </h1>
                <p className="text-gray-600 mb-8">
                    {t('exercise.completedAll')}
                </p>
                <button
                    onClick={handleFinish}
                    className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {t('exercise.viewResults')}
                </button>
            </div>
        );
    }

    // No current exercise
    if (!currentExercise) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <p className="text-gray-500">
                    {t('exercise.noExercise')}
                </p>
                <button
                    onClick={() => navigate(ROUTES.HOME)}
                    className="mt-4 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    {t('common.backHome')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[80vh] lg:min-h-0 p-4 max-w-2xl mx-auto">
            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>
                        {t('exercise.progress', {
                            current: progress.current,
                            total: progress.total,
                        })}
                    </span>
                    <span>{theme?.name ?? themeId}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                </div>
            </div>

            {/* Exercise instruction */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                    {currentExercise.instruction.startsWith('t:')
                        ? t(currentExercise.instruction.slice(2))
                        : currentExercise.instruction}
                </h1>
            </div>

            {/* Exercise content - no flex-1 on large screens to keep buttons close */}
            <div className="flex-1 lg:flex-none">
                <ExerciseRenderer
                    content={currentExercise.content}
                    hints={currentExercise.hints}
                    onSubmit={handleSubmit}
                    showSolution={showSolution}
                />
            </div>

            {/* Feedback */}
            {hasAnswered && answer && !levelFailed && (
                <div
                    className={`mt-4 p-4 rounded-lg ${answer.correct
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                        }`}
                    role="alert"
                >
                    <p className={answer.correct ? 'text-green-800' : 'text-red-800'}>
                        {answer.correct
                            ? currentExercise.feedbackCorrect
                            : showSolution
                                ? currentExercise.feedbackIncorrect
                                : t('exercise.tryAgain')}
                    </p>
                    {!answer.correct && answer.attempts < MAX_ATTEMPTS_PER_EXERCISE && (
                        <p className="text-red-600 text-sm mt-1">
                            {t('exercise.attemptsRemaining', { count: MAX_ATTEMPTS_PER_EXERCISE - answer.attempts })}
                        </p>
                    )}
                </div>
            )}

            {/* Level Failed Message */}
            {levelFailed && (
                <div
                    className="mt-4 p-4 rounded-lg bg-red-100 border border-red-300"
                    role="alert"
                >
                    <p className="text-red-800 font-bold">
                        {t('exercise.levelFailed')}
                    </p>
                    <p className="text-red-700 text-sm mt-1">
                        {t('exercise.levelFailedDescription')}
                    </p>
                </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex gap-4">
                {/* Level failed - show restart button */}
                {levelFailed && (
                    <>
                        <button
                            onClick={handleRestartLevel}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {t('exercise.restartLevel')}
                        </button>
                        <button
                            onClick={handleFinish}
                            className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            {t('exercise.exitLevel')}
                        </button>
                    </>
                )}
                {/* Normal flow - show solution button only when not failed and attempts remaining */}
                {!levelFailed && !showSolution && !isCompleted && (
                    <button
                        onClick={handleShowSolution}
                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('exercise.showSolution')}
                    </button>
                )}
                {/* Next button when completed or solution shown */}
                {!levelFailed && (showSolution || isCompleted) && progress.current < progress.total && (
                    <button
                        onClick={handleNext}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {t('exercise.next')}
                    </button>
                )}
                {/* Finish button when session complete */}
                {!levelFailed && (showSolution || isCompleted) && progress.current >= progress.total && (
                    <button
                        onClick={handleFinish}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        {t('exercise.finish')}
                    </button>
                )}
            </div>

            {/* Back button */}
            <button
                onClick={() => themeId ? navigate(ROUTES.LEVEL_SELECT(themeId)) : navigate(ROUTES.HOME)}
                className="mt-4 py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
            >
                {t('common.back')}
            </button>

            {/* Level Up Celebration */}
            {levelUpLevel !== null && (
                <LevelUpCelebration
                    newLevel={levelUpLevel}
                    onDone={() => setLevelUpLevel(null)}
                />
            )}

            {/* Badge Earned Toast */}
            {earnedBadges.length > 0 && currentBadgeIndex < earnedBadges.length && earnedBadges[currentBadgeIndex] && (
                <BadgeEarnedToast
                    badge={earnedBadges[currentBadgeIndex]}
                    onDismiss={() => {
                        const nextIndex = currentBadgeIndex + 1;
                        if (nextIndex >= earnedBadges.length) {
                            setEarnedBadges([]);
                            setCurrentBadgeIndex(0);
                        } else {
                            setCurrentBadgeIndex(nextIndex);
                        }
                    }}
                />
            )}
        </div>
    );
}
