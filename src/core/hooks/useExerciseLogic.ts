/**
 * Hook for managing common exercise logic.
 * 
 * Consolidates shared behavior across exercise types including:
 * - Answer state management
 * - Attempt tracking
 * - Hint progression and management
 * - Solution display
 * - Star calculation
 * - Feedback state management
 * - Keyboard submission handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { calculateStars } from '@core/utils/gamification';
import type { Score, StarRating } from '@/types/gamification';

// Re-export for backward compatibility
export { calculateStars as calculateStarsFromAttempts } from '@core/utils/gamification';

// ============================================================================
// Types
// ============================================================================

/**
 * Feedback type for exercise responses.
 */
export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

/**
 * Feedback state for exercise responses.
 */
export interface FeedbackState {
    /** Whether feedback is visible */
    visible: boolean;
    /** Type of feedback */
    type: FeedbackType;
    /** Feedback message */
    message: string;
    /** Optional explanation */
    explanation?: string | undefined;
}

/**
 * Options for the useExerciseLogic hook.
 */
export interface UseExerciseLogicOptions<T = unknown> {
    /** Maximum number of attempts allowed */
    maxAttempts?: number;
    /** Function to validate the answer */
    validateAnswer: (answer: T) => boolean;
    /** Function to get the correct answer (for solution display) */
    getCorrectAnswer?: () => T;
    /** Callback when exercise is completed (correct or max attempts reached) */
    onComplete?: (result: ExerciseResult) => void;
    /** Whether to auto-focus on completion */
    autoFocusOnComplete?: boolean;
    /** Array of hints to show progressively */
    hints?: string[];
    /** Callback when a hint is shown */
    onHintShown?: (hintIndex: number) => void;
    /** Custom messages for feedback */
    feedbackMessages?: {
        correct?: string;
        incorrect?: string;
        tryAgain?: string;
    };
}

/**
 * Result of an exercise attempt.
 */
export interface ExerciseResult {
    /** Whether the final answer was correct */
    correct: boolean;
    /** Number of attempts made */
    attempts: number;
    /** Star rating earned (0-3) */
    stars: Score;
    /** Time spent in seconds */
    timeSpentSeconds: number;
    /** Number of hints used */
    hintsUsed: number;
}

/**
 * Return type of the useExerciseLogic hook.
 */
export interface UseExerciseLogicReturn<T> {
    /** Current answer state */
    answer: T | null;
    /** Set the current answer */
    setAnswer: (answer: T) => void;
    /** Submit the current answer */
    submitAnswer: () => void;
    /** Whether the answer is correct (null if not yet submitted) */
    isCorrect: boolean | null;
    /** Whether to show the solution */
    showSolution: boolean;
    /** Number of attempts made */
    attempts: number;
    /** Whether the user can retry */
    canRetry: boolean;
    /** Star rating earned (null if not completed) */
    stars: Score | null;
    // ========================================
    // Hint Management
    // ========================================
    /** Current hint index (-1 = no hint shown) */
    currentHintIndex: number;
    /** Show the next hint */
    showNextHint: () => void;
    /** Total number of hints available */
    totalHints: number;
    /** Number of hints used so far */
    hintsUsed: number;
    /** Whether there are more hints available */
    hasMoreHints: boolean;
    /** Current hint text (null if no hint shown) */
    currentHint: string | null;
    /** All shown hints so far */
    shownHints: string[];
    // ========================================
    // Feedback Management
    // ========================================
    /** Current feedback state */
    feedback: FeedbackState;
    /** Set custom feedback */
    setFeedback: (feedback: FeedbackState) => void;
    /** Clear feedback */
    clearFeedback: () => void;
    /** Show success feedback */
    showSuccess: (message?: string, explanation?: string) => void;
    /** Show error feedback */
    showError: (message?: string, explanation?: string) => void;
    /** Show warning feedback */
    showWarning: (message: string, explanation?: string) => void;
    // ========================================
    // Keyboard Handling
    // ========================================
    /** Handle key down for submission (Enter key) */
    handleKeyDown: (e: React.KeyboardEvent) => void;
    // ========================================
    // Utility
    // ========================================
    /** Reset the exercise state */
    reset: () => void;
    /** Time spent so far in seconds */
    timeSpentSeconds: number;
    /** Container ref for focus management */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Whether this is the first attempt */
    isFirstAttempt: boolean;
    /** Whether the exercise is complete */
    isComplete: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate star rating based on time (for timed exercises).
 * Under 10s = 3 stars, under 20s = 2 stars, over 20s = 1 star
 */
export function calculateStarsFromTime(seconds: number): StarRating {
    if (seconds < 10) return 3;
    if (seconds < 20) return 2;
    return 1;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing common exercise logic.
 * 
 * @example
 * ```tsx
 * function MyExercise({ onSubmit }) {
 *   const {
 *     answer,
 *     setAnswer,
 *     submitAnswer,
 *     isCorrect,
 *     showSolution,
 *     attempts,
 *     canRetry,
 *     stars,
 *     currentHintIndex,
 *     showNextHint,
 *     feedback,
 *     handleKeyDown,
 *   } = useExerciseLogic({
 *     maxAttempts: 3,
 *     validateAnswer: (ans) => ans === correctAnswer,
 *     onComplete: (result) => onSubmit(result),
 *     hints: ['Hint 1', 'Hint 2'],
 *   });
 * 
 *   return (
 *     <div ref={containerRef}>
 *       <input 
 *         value={answer ?? ''} 
 *         onChange={(e) => setAnswer(e.target.value)} 
 *         onKeyDown={handleKeyDown}
 *       />
 *       <button onClick={submitAnswer} disabled={!answer || showSolution}>
 *         Check
 *       </button>
 *       {feedback.visible && <ExerciseFeedback {...feedback} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useExerciseLogic<T = unknown>(
    options: UseExerciseLogicOptions<T>
): UseExerciseLogicReturn<T> {
    const {
        maxAttempts = 3,
        validateAnswer,
        onComplete,
        autoFocusOnComplete = true,
        hints = [],
        onHintShown,
        feedbackMessages = {},
    } = options;

    // ========================================
    // Core State
    // ========================================
    const [answer, setAnswer] = useState<T | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [startTime] = useState(() => Date.now());
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

    // ========================================
    // Hint State
    // ========================================
    const [currentHintIndex, setCurrentHintIndex] = useState(-1);

    // ========================================
    // Feedback State
    // ========================================
    const [feedback, setFeedbackState] = useState<FeedbackState>({
        visible: false,
        type: 'info',
        message: '',
    });

    // ========================================
    // Refs
    // ========================================
    const containerRef = useRef<HTMLDivElement>(null);

    // ========================================
    // Derived State
    // ========================================
    const canRetry = !showSolution && attempts < maxAttempts;
    const stars = showSolution && isCorrect ? calculateStars(attempts) : null;
    const totalHints = hints.length;
    const hintsUsed = currentHintIndex + 1;
    const hasMoreHints = currentHintIndex < totalHints - 1;
    const currentHint = currentHintIndex >= 0 && currentHintIndex < totalHints
        ? hints[currentHintIndex] ?? null
        : null;
    const shownHints = hints.slice(0, currentHintIndex + 1);
    const isFirstAttempt = attempts === 0;
    const isComplete = showSolution;

    // ========================================
    // Time Tracking
    // ========================================
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSpentSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    // ========================================
    // Focus Management
    // ========================================
    useEffect(() => {
        if (showSolution && autoFocusOnComplete && containerRef.current) {
            const focusable = containerRef.current.querySelector<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        }
    }, [showSolution, autoFocusOnComplete]);

    // ========================================
    // Feedback Helpers
    // ========================================
    const setFeedback = useCallback((newFeedback: FeedbackState) => {
        setFeedbackState(newFeedback);
    }, []);

    const clearFeedback = useCallback(() => {
        setFeedbackState({ visible: false, type: 'info', message: '' });
    }, []);

    const showSuccess = useCallback((message?: string, explanation?: string) => {
        setFeedbackState({
            visible: true,
            type: 'success',
            message: message ?? feedbackMessages.correct ?? 'Correct!',
            explanation,
        });
    }, [feedbackMessages.correct]);

    const showError = useCallback((message?: string, explanation?: string) => {
        setFeedbackState({
            visible: true,
            type: 'error',
            message: message ?? feedbackMessages.incorrect ?? 'Incorrect',
            explanation,
        });
    }, [feedbackMessages.incorrect]);

    const showWarning = useCallback((message: string, explanation?: string) => {
        setFeedbackState({
            visible: true,
            type: 'warning',
            message,
            explanation,
        });
    }, []);

    // ========================================
    // Submit Answer
    // ========================================
    const handleSubmitAnswer = useCallback(() => {
        if (answer === null || showSolution) return;

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        const correct = validateAnswer(answer);
        setIsCorrect(correct);

        if (correct) {
            setShowSolution(true);
            showSuccess();
            const result: ExerciseResult = {
                correct: true,
                attempts: newAttempts,
                stars: calculateStars(newAttempts),
                timeSpentSeconds: Math.floor((Date.now() - startTime) / 1000),
                hintsUsed,
            };
            onComplete?.(result);
        } else if (newAttempts >= maxAttempts) {
            setShowSolution(true);
            showError();
            const result: ExerciseResult = {
                correct: false,
                attempts: newAttempts,
                stars: 0,
                timeSpentSeconds: Math.floor((Date.now() - startTime) / 1000),
                hintsUsed,
            };
            onComplete?.(result);
        } else {
            // Can retry - show try again message
            showError(feedbackMessages.tryAgain ?? 'Try again!');
        }
    }, [
        answer,
        showSolution,
        attempts,
        validateAnswer,
        maxAttempts,
        startTime,
        onComplete,
        hintsUsed,
        showSuccess,
        showError,
        feedbackMessages.tryAgain
    ]);

    // ========================================
    // Keyboard Handling
    // ========================================
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && answer !== null && !showSolution) {
            e.preventDefault();
            handleSubmitAnswer();
        }
    }, [answer, showSolution, handleSubmitAnswer]);

    // ========================================
    // Hint Management
    // ========================================
    const handleShowNextHint = useCallback(() => {
        if (currentHintIndex < totalHints - 1) {
            const newIndex = currentHintIndex + 1;
            setCurrentHintIndex(newIndex);
            onHintShown?.(newIndex);
        }
    }, [currentHintIndex, totalHints, onHintShown]);

    // ========================================
    // Reset
    // ========================================
    const reset = useCallback(() => {
        setAnswer(null);
        setIsCorrect(null);
        setShowSolution(false);
        setAttempts(0);
        setCurrentHintIndex(-1);
        clearFeedback();
    }, [clearFeedback]);

    return {
        // Core
        answer,
        setAnswer,
        submitAnswer: handleSubmitAnswer,
        isCorrect,
        showSolution,
        attempts,
        canRetry,
        stars,
        // Hints
        currentHintIndex,
        showNextHint: handleShowNextHint,
        totalHints,
        hintsUsed,
        hasMoreHints,
        currentHint,
        shownHints,
        // Feedback
        feedback,
        setFeedback,
        clearFeedback,
        showSuccess,
        showError,
        showWarning,
        // Keyboard
        handleKeyDown,
        // Utility
        reset,
        timeSpentSeconds,
        containerRef,
        isFirstAttempt,
        isComplete,
    };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for exercises with text input.
 * Includes case-insensitive matching and trim functionality.
 */
export function useTextInputExercise(
    correctAnswers: string[],
    options: Omit<UseExerciseLogicOptions<string>, 'validateAnswer'> & {
        caseSensitive?: boolean;
        acceptableAnswers?: string[];
    }
) {
    const { caseSensitive = false, acceptableAnswers = [], ...restOptions } = options;

    const validateAnswer = useCallback(
        (answer: string) => {
            const normalizedAnswer = caseSensitive ? answer.trim() : answer.trim().toLowerCase();
            const allAnswers = [...correctAnswers, ...acceptableAnswers];
            const normalizedCorrect = caseSensitive
                ? allAnswers
                : allAnswers.map((a) => a.toLowerCase());
            return normalizedCorrect.includes(normalizedAnswer);
        },
        [correctAnswers, caseSensitive, acceptableAnswers]
    );

    return useExerciseLogic<string>({
        ...restOptions,
        validateAnswer,
    });
}

/**
 * Hook for exercises with multiple choice selection.
 */
export function useMultipleChoiceExercise(
    correctIndex: number,
    options: Omit<UseExerciseLogicOptions<number>, 'validateAnswer'>
) {
    const validateAnswer = useCallback(
        (selectedIndex: number) => selectedIndex === correctIndex,
        [correctIndex]
    );

    return useExerciseLogic<number>({
        ...options,
        validateAnswer,
    });
}

/**
 * Hook for exercises with array ordering (word order, sentence builder).
 */
export function useOrderingExercise<T>(
    correctOrder: T[],
    options: Omit<UseExerciseLogicOptions<T[]>, 'validateAnswer'> & {
        compareFn?: (a: T, b: T) => boolean;
    }
) {
    const { compareFn = (a: T, b: T) => a === b, ...restOptions } = options;

    const validateAnswer = useCallback(
        (userOrder: T[]) => {
            if (userOrder.length !== correctOrder.length) return false;
            return userOrder.every((item, index) => compareFn(item, correctOrder[index]!));
        },
        [correctOrder, compareFn]
    );

    return useExerciseLogic<T[]>({
        ...restOptions,
        validateAnswer,
    });
}
