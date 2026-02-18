/**
 * Exercise page component.
 * 
 * Displays exercise content and handles exercise sessions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { ROUTES } from '@core/router';
import { useExercisesByTheme, useExercisesByArea, useExercises } from '@core/config';
import { useExerciseStore } from '@core/stores';
import { useProfileStore } from '@core/stores/profileStore';
import { useAppStore } from '@core/stores/appStore';
import { ExerciseRenderer } from '@core/components/exercises';
import { BadgeEarnedToast, LevelUpCelebration } from '@core/components/gamification';
import { selectCurrentExercise, selectProgress, selectIsSessionActive } from '@core/stores/exerciseStore';
import { useGamification } from '@core/hooks/useGamification';
import { playCorrect, playIncorrect, playLevelUp, playBadge } from '@core/utils/sounds';
import type { Badge } from '@/types/profile';

/**
 * Exercise page component.
 * Renders the current exercise and handles user interactions.
 */
export function ExercisePage() {
    const { themeId, areaId, level } = useParams<{ themeId: string; areaId?: string; level?: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

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

    // Start session when exercises are loaded
    useEffect(() => {
        if (exercises.length > 0 && !isSessionActive) {
            startSession(exercises, themeId ?? 'default', areaId);
        }
    }, [exercises, isSessionActive, startSession, themeId, areaId]);

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
        if (answer && activeProfile) {
            const attempts = answer.attempts;
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

        nextExercise();
        setHasAnswered(false);
        setShowSolution(false);
    }, [answer, activeProfile, processExerciseCompletion, incrementStreak, nextExercise, setShowSolution, soundEnabled]);

    // Handle show solution
    const handleShowSolution = useCallback(() => {
        setShowSolution(true);
    }, [setShowSolution]);

    // Handle session complete
    const handleFinish = useCallback(() => {
        navigate(ROUTES.RESULTS);
    }, [navigate]);

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
        <div className="flex flex-col min-h-[80vh] p-4 max-w-2xl mx-auto">
            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>
                        {t('exercise.progress', {
                            current: progress.current,
                            total: progress.total,
                        })}
                    </span>
                    <span>{themeId}</span>
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

            {/* Exercise content */}
            <div className="flex-1">
                <ExerciseRenderer
                    content={currentExercise.content}
                    hints={currentExercise.hints}
                    onSubmit={handleSubmit}
                    showSolution={showSolution}
                />
            </div>

            {/* Feedback */}
            {hasAnswered && (
                <div
                    className={`mt-4 p-4 rounded-lg ${isCompleted
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                        }`}
                    role="alert"
                >
                    <p className={isCompleted ? 'text-green-800' : 'text-yellow-800'}>
                        {isCompleted
                            ? currentExercise.feedbackCorrect
                            : currentExercise.feedbackIncorrect}
                    </p>
                </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex gap-4">
                {!showSolution && !isCompleted && (
                    <button
                        onClick={handleShowSolution}
                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('exercise.showSolution')}
                    </button>
                )}
                {(showSolution || isCompleted) && progress.current < progress.total && (
                    <button
                        onClick={handleNext}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {t('exercise.next')}
                    </button>
                )}
                {(showSolution || isCompleted) && progress.current >= progress.total && (
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
                onClick={() => navigate(ROUTES.HOME)}
                className="mt-4 py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
            >
                {t('common.backHome')}
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
                    badge={earnedBadges[currentBadgeIndex]!}
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
