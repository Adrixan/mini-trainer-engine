import { useState, useCallback, useEffect, useRef } from 'react';
import type { Exercise, ExerciseResult, StarRating } from '@/types/exercise';
import { calculateStars } from '@/core/components/exercises/BaseExercise';

/**
 * State for a single exercise in a session.
 */
interface ExerciseSessionState {
    /** The exercise being attempted */
    exercise: Exercise;
    /** Number of attempts made */
    attempts: number;
    /** Whether the answer was correct */
    isCorrect: boolean | null;
    /** Whether to show the solution */
    showSolution: boolean;
    /** Star rating earned (null if not completed) */
    stars: StarRating | null;
    /** Time spent on this exercise in seconds */
    timeSpentSeconds: number;
}

/**
 * State for the entire exercise session.
 */
interface ExerciseSession {
    /** All exercises in the session */
    exercises: ExerciseSessionState[];
    /** Index of the current exercise */
    currentIndex: number;
    /** Whether the session is complete */
    isComplete: boolean;
    /** Total stars earned */
    totalStars: number;
    /** Maximum possible stars */
    maxStars: number;
    /** Session start time */
    startTime: number;
}

/**
 * Options for useExerciseSession hook.
 */
interface UseExerciseSessionOptions {
    /** Maximum attempts per exercise */
    maxAttempts?: number;
    /** Callback when session completes */
    onComplete?: (results: ExerciseResult[]) => void;
    /** Callback when an exercise is submitted */
    onExerciseSubmit?: (exerciseId: string, correct: boolean, stars: StarRating | null) => void;
}

/**
 * Hook for managing an exercise session.
 * Handles loading exercises, tracking attempts, scoring, and navigation.
 */
export function useExerciseSession(
    exercises: Exercise[],
    options: UseExerciseSessionOptions = {}
) {
    const { maxAttempts = 3, onComplete, onExerciseSubmit } = options;

    // Initialize session state
    const [session, setSession] = useState<ExerciseSession>(() => ({
        exercises: exercises.map((exercise) => ({
            exercise,
            attempts: 0,
            isCorrect: null,
            showSolution: false,
            stars: null,
            timeSpentSeconds: 0,
        })),
        currentIndex: 0,
        isComplete: false,
        totalStars: 0,
        maxStars: exercises.length * 3,
        startTime: Date.now(),
    }));

    // Timer for tracking time spent
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Start timer for current exercise
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSession((prev) => {
                const updated = { ...prev };
                const current = updated.exercises[updated.currentIndex];
                if (current && !current.showSolution) {
                    current.timeSpentSeconds += 1;
                }
                return updated;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Get current exercise state
    const currentExercise = session.exercises[session.currentIndex];
    const hasNext = session.currentIndex < session.exercises.length - 1;
    const hasPrevious = session.currentIndex > 0;

    /**
     * Handle submission of an exercise answer.
     */
    const handleSubmit = useCallback((correct: boolean) => {
        setSession((prev) => {
            const updated = { ...prev };
            const current = updated.exercises[updated.currentIndex];
            if (!current) return prev;

            const newAttempts = current.attempts + 1;
            const isComplete = correct || newAttempts >= maxAttempts;

            current.attempts = newAttempts;
            current.isCorrect = correct;
            current.showSolution = isComplete;

            if (correct) {
                current.stars = calculateStars(newAttempts);
                updated.totalStars += current.stars;
            }

            // Call callback
            onExerciseSubmit?.(current.exercise.id, correct, current.stars);

            return updated;
        });
    }, [maxAttempts, onExerciseSubmit]);

    /**
     * Move to the next exercise.
     */
    const nextExercise = useCallback(() => {
        setSession((prev) => {
            if (prev.currentIndex >= prev.exercises.length - 1) {
                // Session complete
                const isComplete = prev.exercises.every((e) => e.showSolution);
                if (isComplete && !prev.isComplete) {
                    // Generate results and call onComplete
                    const results = generateResults(prev);
                    onComplete?.(results);
                }
                return { ...prev, isComplete };
            }

            return {
                ...prev,
                currentIndex: prev.currentIndex + 1,
            };
        });
    }, [onComplete]);

    /**
     * Move to the previous exercise.
     */
    const previousExercise = useCallback(() => {
        setSession((prev) => ({
            ...prev,
            currentIndex: Math.max(0, prev.currentIndex - 1),
        }));
    }, []);

    /**
     * Go to a specific exercise by index.
     */
    const goToExercise = useCallback((index: number) => {
        setSession((prev) => ({
            ...prev,
            currentIndex: Math.max(0, Math.min(index, prev.exercises.length - 1)),
        }));
    }, []);

    /**
     * Reset the current exercise.
     */
    const resetCurrentExercise = useCallback(() => {
        setSession((prev) => {
            const updated = { ...prev };
            const current = updated.exercises[updated.currentIndex];
            if (!current) return prev;

            // Deduct stars if they were earned
            if (current.stars) {
                updated.totalStars -= current.stars;
            }

            current.attempts = 0;
            current.isCorrect = null;
            current.showSolution = false;
            current.stars = null;
            current.timeSpentSeconds = 0;

            return updated;
        });
    }, []);

    /**
     * Reset the entire session.
     */
    const resetSession = useCallback(() => {
        setSession({
            exercises: exercises.map((exercise) => ({
                exercise,
                attempts: 0,
                isCorrect: null,
                showSolution: false,
                stars: null,
                timeSpentSeconds: 0,
            })),
            currentIndex: 0,
            isComplete: false,
            totalStars: 0,
            maxStars: exercises.length * 3,
            startTime: Date.now(),
        });
    }, [exercises]);

    /**
     * Get results for all completed exercises.
     */
    const getResults = useCallback((): ExerciseResult[] => {
        return generateResults(session);
    }, [session]);

    return {
        // Current exercise state
        currentExercise: currentExercise?.exercise ?? null,
        attempts: currentExercise?.attempts ?? 0,
        isCorrect: currentExercise?.isCorrect ?? null,
        showSolution: currentExercise?.showSolution ?? false,
        stars: currentExercise?.stars ?? null,
        timeSpentSeconds: currentExercise?.timeSpentSeconds ?? 0,

        // Session state
        currentIndex: session.currentIndex,
        totalExercises: session.exercises.length,
        totalStars: session.totalStars,
        maxStars: session.maxStars,
        isComplete: session.isComplete,
        hasNext,
        hasPrevious,

        // Progress
        progress: session.currentIndex / session.exercises.length,
        completedCount: session.exercises.filter((e) => e.showSolution).length,

        // Actions
        handleSubmit,
        nextExercise,
        previousExercise,
        goToExercise,
        resetCurrentExercise,
        resetSession,
        getResults,
    };
}

/**
 * Generate ExerciseResult array from session state.
 */
function generateResults(session: ExerciseSession): ExerciseResult[] {
    return session.exercises
        .filter((e) => e.showSolution)
        .map((e) => ({
            id: `${e.exercise.id}-${Date.now()}`,
            childProfileId: '', // To be filled by caller
            exerciseId: e.exercise.id,
            areaId: e.exercise.areaId,
            themeId: e.exercise.themeId,
            level: e.exercise.level,
            correct: e.isCorrect ?? false,
            score: e.stars ?? 0,
            attempts: e.attempts,
            timeSpentSeconds: e.timeSpentSeconds,
            completedAt: new Date().toISOString(),
        }));
}

export type { ExerciseSession, ExerciseSessionState, UseExerciseSessionOptions };
