/**
 * Exercise in-progress view component.
 *
 * Displays the current exercise with progress, feedback, and action buttons.
 */

import { useTranslation } from 'react-i18next';
import { ExerciseRenderer } from '@core/components/exercises';
import { BadgeEarnedToast, LevelUpCelebration } from '@core/components/gamification';
import { MAX_ATTEMPTS_PER_EXERCISE } from '@core/hooks/useExercisePageState';
import type { Exercise } from '@/types';
import type { UseExercisePageStateReturn } from '@core/hooks/useExercisePageState';

export interface ExerciseInProgressViewProps {
    /** Current exercise being displayed */
    currentExercise: Exercise;
    /** Theme name for display */
    themeName: string | undefined;
    /** Theme ID for display */
    themeId: string | undefined;
    /** Progress information */
    progress: { current: number; total: number };
    /** Whether solution is being shown */
    showSolution: boolean;
    /** Whether level has been failed */
    levelFailed: boolean;
    /** Whether user has answered current exercise */
    hasAnswered: boolean;
    /** Current answer state */
    answer: UseExercisePageStateReturn['answer'];
    /** Gamification notifications */
    notifications: UseExercisePageStateReturn['notifications'];
    /** Handle answer submission */
    onSubmit: (correct: boolean) => void;
    /** Handle show solution */
    onShowSolution: () => void;
    /** Handle next exercise */
    onNext: () => void;
    /** Handle restart level */
    onRestartLevel: () => void;
    /** Handle finish session */
    onFinish: () => void;
    /** Handle back navigation */
    onBack: () => void;
    /** Handle dismiss badge notification */
    onDismissBadge: () => void;
    /** Handle clear level up notification */
    onClearLevelUp: () => void;
}

export function ExerciseInProgressView({
    currentExercise,
    themeName,
    themeId,
    progress,
    showSolution,
    levelFailed,
    hasAnswered,
    answer,
    notifications,
    onSubmit,
    onShowSolution,
    onNext,
    onRestartLevel,
    onFinish,
    onBack,
    onDismissBadge,
    onClearLevelUp,
}: ExerciseInProgressViewProps) {
    const { t } = useTranslation();

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
                    <span>{themeName ?? themeId}</span>
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
            <div className="flex-1 lg:flex-none">
                <ExerciseRenderer
                    content={currentExercise.content}
                    hints={currentExercise.hints}
                    onSubmit={onSubmit}
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
                            onClick={onRestartLevel}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {t('exercise.restartLevel')}
                        </button>
                        <button
                            onClick={onFinish}
                            className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            {t('exercise.exitLevel')}
                        </button>
                    </>
                )}
                {/* Normal flow - show solution button when not yet answered */}
                {!levelFailed && !showSolution && !hasAnswered && (
                    <button
                        onClick={onShowSolution}
                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('exercise.showSolution')}
                    </button>
                )}
                {/* Next button when solution shown and more exercises remain */}
                {!levelFailed && showSolution && progress.current < progress.total && (
                    <button
                        onClick={onNext}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {t('exercise.next')}
                    </button>
                )}
                {/* Finish/Return button when solution shown and this is the last exercise */}
                {!levelFailed && showSolution && progress.current >= progress.total && (
                    <button
                        onClick={onFinish}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        {t('exercise.finish')}
                    </button>
                )}
            </div>

            {/* Back button */}
            <button
                onClick={onBack}
                className="mt-4 py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
            >
                {t('common.back')}
            </button>

            {/* Level Up Celebration */}
            {notifications.levelUpLevel !== null && (
                <LevelUpCelebration
                    newLevel={notifications.levelUpLevel}
                    onDone={onClearLevelUp}
                />
            )}

            {/* Badge Earned Toast */}
            {(() => {
                const currentBadge = notifications.earnedBadges[notifications.currentBadgeIndex];
                if (notifications.earnedBadges.length > 0 &&
                    notifications.currentBadgeIndex < notifications.earnedBadges.length &&
                    currentBadge) {
                    return (
                        <BadgeEarnedToast
                            badge={currentBadge}
                            onDismiss={onDismissBadge}
                        />
                    );
                }
                return null;
            })()}
        </div>
    );
}
