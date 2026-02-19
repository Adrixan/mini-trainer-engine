/**
 * Hook for managing common exercise logic.
 * 
 * Consolidates shared behavior across exercise types including:
 * - Answer state management
 * - Attempt tracking
 * - Hint progression
 * - Solution display
 * - Star calculation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Score, StarRating } from '@/types/gamification';

// ============================================================================
// Types
// ============================================================================

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
    /** Current hint index (-1 = no hint shown) */
    currentHintIndex: number;
    /** Show the next hint */
    showNextHint: () => void;
    /** Total number of hints available */
    totalHints: number;
    /** Reset the exercise state */
    reset: () => void;
    /** Time spent so far in seconds */
    timeSpentSeconds: number;
    /** Container ref for focus management */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate star rating based on attempts.
 * 1 attempt = 3 stars, 2 attempts = 2 stars, 3+ attempts = 1 star
 */
export function calculateStarsFromAttempts(attempts: number): StarRating {
    if (attempts === 1) return 3;
    if (attempts === 2) return 2;
    return 1;
}

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
 *   } = useExerciseLogic({
 *     maxAttempts: 3,
 *     validateAnswer: (ans) => ans === correctAnswer,
 *     onComplete: (result) => onSubmit(result),
 *   });
 * 
 *   return (
 *     <div>
 *       <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
 *       <button onClick={submitAnswer} disabled={!answer || showSolution}>
 *         Check
 *       </button>
 *       {showSolution && <p>{isCorrect ? 'Correct!' : 'Try again!'}</p>}
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
    } = options;

    // State
    const [answer, setAnswer] = useState<T | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [currentHintIndex, setCurrentHintIndex] = useState(-1);
    const [startTime] = useState(() => Date.now());
    const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate derived state
    const canRetry = !showSolution && attempts < maxAttempts;
    const stars = showSolution && isCorrect ? calculateStarsFromAttempts(attempts) : null;
    const totalHints = 0; // Will be set by the component using hints

    // Update time spent
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSpentSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    // Focus management on completion
    useEffect(() => {
        if (showSolution && autoFocusOnComplete && containerRef.current) {
            const focusable = containerRef.current.querySelector<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        }
    }, [showSolution, autoFocusOnComplete]);

    // Submit answer
    const handleSubmitAnswer = useCallback(() => {
        if (answer === null || showSolution) return;

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        const correct = validateAnswer(answer);
        setIsCorrect(correct);

        if (correct) {
            setShowSolution(true);
            const result: ExerciseResult = {
                correct: true,
                attempts: newAttempts,
                stars: calculateStarsFromAttempts(newAttempts),
                timeSpentSeconds: Math.floor((Date.now() - startTime) / 1000),
            };
            onComplete?.(result);
        } else if (newAttempts >= maxAttempts) {
            setShowSolution(true);
            const result: ExerciseResult = {
                correct: false,
                attempts: newAttempts,
                stars: 0,
                timeSpentSeconds: Math.floor((Date.now() - startTime) / 1000),
            };
            onComplete?.(result);
        }
        // If incorrect but can retry, just update attempts
    }, [answer, showSolution, attempts, validateAnswer, maxAttempts, startTime, onComplete]);

    // Show next hint
    const handleShowNextHint = useCallback(() => {
        setCurrentHintIndex((prev) => prev + 1);
    }, []);

    // Reset state
    const reset = useCallback(() => {
        setAnswer(null);
        setIsCorrect(null);
        setShowSolution(false);
        setAttempts(0);
        setCurrentHintIndex(-1);
    }, []);

    return {
        answer,
        setAnswer,
        submitAnswer: handleSubmitAnswer,
        isCorrect,
        showSolution,
        attempts,
        canRetry,
        stars,
        currentHintIndex,
        showNextHint: handleShowNextHint,
        totalHints,
        reset,
        timeSpentSeconds,
        containerRef,
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
