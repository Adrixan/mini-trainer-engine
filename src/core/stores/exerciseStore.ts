/**
 * Exercise session store for the Mini Trainer Engine.
 * 
 * Manages the current exercise session state including
 * the current exercise, answers, and session progress.
 */

import { create } from 'zustand';
import type {
    Exercise,
    ExerciseResult,
    StarRating,
    Score,
    ObservationAreaId,
    ThemeId,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Exercise answer state.
 */
export interface ExerciseAnswer {
    /** Whether the answer is correct */
    correct: boolean;
    /** Number of attempts made */
    attempts: number;
    /** Time spent in seconds */
    timeSpentSeconds: number;
    /** Star rating earned (0-3) */
    stars: Score;
}

/**
 * Session statistics.
 */
export interface SessionStats {
    /** Number of exercises completed */
    exercisesCompleted: number;
    /** Number of correct answers */
    correctAnswers: number;
    /** Total stars earned */
    totalStars: number;
    /** Total time spent in seconds */
    totalTimeSeconds: number;
}

/**
 * Exercise session state interface.
 */
export interface ExerciseSessionState {
    /** Current exercise being displayed */
    currentExercise: Exercise | null;
    /** Index of current exercise in the session */
    currentIndex: number;
    /** Total number of exercises in the session */
    totalExercises: number;
    /** Queue of exercises for this session */
    exerciseQueue: Exercise[];
    /** Current answer state */
    answer: ExerciseAnswer | null;
    /** Whether the current exercise is completed */
    isCompleted: boolean;
    /** Whether to show the solution */
    showSolution: boolean;
    /** Session statistics */
    stats: SessionStats;
    /** Results for completed exercises */
    results: ExerciseResult[];
    /** Session start time */
    sessionStartTime: number | null;
    /** Current theme ID */
    themeId: ThemeId | null;
    /** Current area ID (optional) */
    areaId: ObservationAreaId | null;

    // Actions
    /** Initialize a new session with exercises */
    startSession: (exercises: Exercise[], themeId: ThemeId, areaId?: ObservationAreaId) => void;
    /** Move to the next exercise */
    nextExercise: () => void;
    /** Submit an answer */
    submitAnswer: (correct: boolean) => void;
    /** Increment attempts */
    incrementAttempts: () => void;
    /** Show the solution */
    setShowSolution: (show: boolean) => void;
    /** Record time spent */
    recordTime: (seconds: number) => void;
    /** End the session */
    endSession: () => void;
    /** Reset the current exercise */
    resetCurrentExercise: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate star rating based on attempts.
 * 
 * @param attempts - Number of attempts made
 * @returns Star rating (0-3)
 */
function calculateStars(attempts: number): Score {
    if (attempts === 1) return 3 as StarRating;
    if (attempts === 2) return 2 as StarRating;
    if (attempts === 3) return 1 as StarRating;
    return 0;
}

/**
 * Generate a unique ID for exercise results.
 */
function generateResultId(): string {
    return `result-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Store
// ============================================================================

/**
 * Exercise session store.
 * 
 * Manages the state of an active exercise session.
 */
export const useExerciseStore = create<ExerciseSessionState>()((set, get) => ({
    currentExercise: null,
    currentIndex: 0,
    totalExercises: 0,
    exerciseQueue: [],
    answer: null,
    isCompleted: false,
    showSolution: false,
    stats: {
        exercisesCompleted: 0,
        correctAnswers: 0,
        totalStars: 0,
        totalTimeSeconds: 0,
    },
    results: [],
    sessionStartTime: null,
    themeId: null,
    areaId: null,

    startSession: (exercises, themeId, areaId) => {
        if (exercises.length === 0) return;

        set({
            currentExercise: exercises[0] ?? null,
            currentIndex: 0,
            totalExercises: exercises.length,
            exerciseQueue: exercises,
            answer: null,
            isCompleted: false,
            showSolution: false,
            stats: {
                exercisesCompleted: 0,
                correctAnswers: 0,
                totalStars: 0,
                totalTimeSeconds: 0,
            },
            results: [],
            sessionStartTime: Date.now(),
            themeId,
            areaId: areaId ?? null,
        });
    },

    nextExercise: () => {
        const state = get();
        const nextIndex = state.currentIndex + 1;

        if (nextIndex >= state.totalExercises) {
            // Session complete
            set({ isCompleted: true, currentExercise: null });
            return;
        }

        const nextExercise = state.exerciseQueue[nextIndex];
        if (!nextExercise) return;

        set({
            currentExercise: nextExercise,
            currentIndex: nextIndex,
            answer: null,
            isCompleted: false,
            showSolution: false,
        });
    },

    submitAnswer: (correct) => {
        const state = get();
        if (!state.currentExercise || !state.answer) return;

        const stars = correct ? calculateStars(state.answer.attempts) : 0;

        // Update answer with result
        const finalAnswer: ExerciseAnswer = {
            ...state.answer,
            correct,
            stars,
        };

        // Create result record
        const result: ExerciseResult = {
            id: generateResultId(),
            childProfileId: '', // Will be filled by the caller
            exerciseId: state.currentExercise.id,
            areaId: state.currentExercise.areaId,
            themeId: state.currentExercise.themeId,
            level: state.currentExercise.level,
            correct,
            score: stars as StarRating,
            attempts: state.answer.attempts,
            timeSpentSeconds: state.answer.timeSpentSeconds,
            completedAt: new Date().toISOString(),
        };

        // Update stats
        const newStats: SessionStats = {
            exercisesCompleted: state.stats.exercisesCompleted + 1,
            correctAnswers: state.stats.correctAnswers + (correct ? 1 : 0),
            totalStars: state.stats.totalStars + stars,
            totalTimeSeconds: state.stats.totalTimeSeconds + state.answer.timeSpentSeconds,
        };

        set({
            answer: finalAnswer,
            isCompleted: true,
            stats: newStats,
            results: [...state.results, result],
        });
    },

    incrementAttempts: () => {
        set((state) => {
            const currentAnswer = state.answer;
            const newAnswer: ExerciseAnswer = currentAnswer
                ? { ...currentAnswer, attempts: currentAnswer.attempts + 1 }
                : { correct: false, attempts: 1, timeSpentSeconds: 0, stars: 0 };
            return { answer: newAnswer };
        });
    },

    setShowSolution: (show) => set({ showSolution: show }),

    recordTime: (seconds) => {
        set((state) => {
            const currentAnswer = state.answer;
            const newAnswer: ExerciseAnswer = currentAnswer
                ? { ...currentAnswer, timeSpentSeconds: seconds }
                : { correct: false, attempts: 0, timeSpentSeconds: seconds, stars: 0 };
            return { answer: newAnswer };
        });
    },

    endSession: () => {
        set({
            currentExercise: null,
            currentIndex: 0,
            totalExercises: 0,
            exerciseQueue: [],
            answer: null,
            isCompleted: false,
            showSolution: false,
            stats: {
                exercisesCompleted: 0,
                correctAnswers: 0,
                totalStars: 0,
                totalTimeSeconds: 0,
            },
            results: [],
            sessionStartTime: null,
            themeId: null,
            areaId: null,
        });
    },

    resetCurrentExercise: () => {
        set({
            answer: null,
            isCompleted: false,
            showSolution: false,
        });
    },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Selector for current exercise.
 */
export const selectCurrentExercise = (state: ExerciseSessionState) => state.currentExercise;

/**
 * Selector for session progress.
 */
export const selectProgress = (state: ExerciseSessionState) => ({
    current: state.currentIndex + 1,
    total: state.totalExercises,
});

/**
 * Selector for session stats.
 */
export const selectStats = (state: ExerciseSessionState) => state.stats;

/**
 * Selector for session results.
 */
export const selectResults = (state: ExerciseSessionState) => state.results;

/**
 * Selector for answer state.
 */
export const selectAnswer = (state: ExerciseSessionState) => state.answer;

/**
 * Selector for whether session is active.
 */
export const selectIsSessionActive = (state: ExerciseSessionState) =>
    state.sessionStartTime !== null && state.currentExercise !== null;

/**
 * Selector for correct rate percentage.
 */
export const selectCorrectRate = (state: ExerciseSessionState) => {
    if (state.stats.exercisesCompleted === 0) return 0;
    return Math.round(
        (state.stats.correctAnswers / state.stats.exercisesCompleted) * 100
    );
};
