/**
 * Gamification hook for the Mini Trainer Engine.
 * 
 * Combines scoring, badge checking, and level progression.
 */

import { useCallback, useMemo, useState } from 'react';
import { useProfileStore } from '@core/stores/profileStore';
import {
    calculateStars,
    calculateLevel,
    getLevelProgress,
    updateStreak,
    type StreakResult,
} from '@core/utils/gamification';
import {
    checkAllBadges,
    DEFAULT_BADGES,
    type BadgeDefinitionWithMeta,
} from '@core/utils/badges';
import { getExerciseResultsByArea } from '@core/storage';
import type { Badge } from '@/types/profile';
import type { LevelProgress, Score } from '@/types/gamification';
import type { BadgeDefinition } from '@/types/config';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of processing an exercise completion.
 */
export interface ExerciseCompletionResult {
    /** Stars earned for this exercise (0-3, where 0 means failed) */
    starsEarned: Score;
    /** Whether a level up occurred */
    leveledUp: boolean;
    /** New level if leveled up */
    newLevel: number | undefined;
    /** New badges earned */
    newBadges: Badge[];
    /** Streak update result */
    streakUpdate: StreakResult | null;
}

/**
 * Gamification state returned by the hook.
 */
export interface GamificationState {
    /** Total stars earned */
    totalStars: number;
    /** Current level */
    currentLevel: number;
    /** Level progress information */
    levelProgress: LevelProgress;
    /** Current streak */
    currentStreak: number;
    /** Longest streak */
    longestStreak: number;
    /** All earned badges */
    badges: Badge[];
    /** Next badges to earn (one per category) */
    nextBadges: BadgeDefinitionWithMeta[];
}

/**
 * Gamification actions returned by the hook.
 */
export interface GamificationActions {
    /** Process exercise completion and return results */
    processExerciseCompletion: (attempts: number) => ExerciseCompletionResult;
    /** Manually check for new badges */
    checkForBadges: () => Badge[];
    /** Get stars for a specific area (async, reads from storage) */
    getAreaStars: (areaId: string) => Promise<number>;
    /** Get level for a specific area */
    getAreaLevel: (areaId: string) => number;
}

/**
 * Hook return type.
 */
export type UseGamificationReturn = GamificationState & GamificationActions;

/**
 * Hook options.
 */
export interface UseGamificationOptions {
    /** Stars required per level */
    starsPerLevel?: number;
    /** Badge definitions to use */
    badgeDefinitions?: BadgeDefinition[];
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing gamification state and actions.
 * 
 * Integrates with the profile store for persistence.
 */
export function useGamification(
    options: UseGamificationOptions = {}
): UseGamificationReturn {
    const {
        starsPerLevel = 10,
        badgeDefinitions = DEFAULT_BADGES,
    } = options;

    // Profile store
    const activeProfile = useProfileStore((state) => state.activeProfile);

    // Local state for tracking level changes
    const [previousLevel, setPreviousLevel] = useState<number | null>(null);

    // Calculate current gamification state
    const state = useMemo<GamificationState>(() => {
        const totalStars = activeProfile?.totalStars ?? 0;
        const currentLevel = calculateLevel(totalStars, starsPerLevel);
        const levelProgress = getLevelProgress(totalStars, starsPerLevel, previousLevel ?? currentLevel);
        const currentStreak = activeProfile?.currentStreak ?? 0;
        const longestStreak = activeProfile?.longestStreak ?? 0;
        const badges = activeProfile?.badges ?? [];

        // Get next badges to earn
        const earnedBadgeIds = new Set(badges.map(b => b.id));
        const nextBadges: BadgeDefinitionWithMeta[] = [];
        const seenTypes = new Set<string>();

        for (const badgeDef of badgeDefinitions as BadgeDefinitionWithMeta[]) {
            if (earnedBadgeIds.has(badgeDef.badge.id)) continue;
            if (seenTypes.has(badgeDef.type)) continue;
            nextBadges.push(badgeDef);
            seenTypes.add(badgeDef.type);
        }

        return {
            totalStars,
            currentLevel,
            levelProgress,
            currentStreak,
            longestStreak,
            badges,
            nextBadges,
        };
    }, [activeProfile, starsPerLevel, previousLevel, badgeDefinitions]);

    // Process exercise completion
    // Note: We use useProfileStore.getState() instead of the activeProfile from the selector
    // to ensure we always have the latest state when processing. This is necessary because
    // the callback might be called after state changes from other sources.
    // This pattern is safe with Zustand stores as getState() returns the current state.
    const processExerciseCompletion = useCallback((
        attempts: number
    ): ExerciseCompletionResult => {
        // Get fresh profile state to avoid stale references (Issue #4)
        // Using getState() is the recommended Zustand pattern for getting latest state in callbacks
        const currentProfile = useProfileStore.getState().activeProfile;

        if (!currentProfile) {
            // Issue #10: Return 0 stars when no profile (not 1)
            return {
                starsEarned: 0 as Score,
                leveledUp: false,
                newLevel: undefined,
                newBadges: [],
                streakUpdate: null,
            };
        }

        // Calculate stars
        const starsEarned = calculateStars(attempts);

        // Get previous level
        const prevLevel = calculateLevel(currentProfile.totalStars, starsPerLevel);

        // Issue #1: Add stars to profile via store action
        // Note: exerciseStore also tracks stars in results, but that's for session stats
        // The profile's totalStars is the source of truth for progression
        useProfileStore.getState().addStars(starsEarned);

        // Calculate new level
        const newTotalStars = currentProfile.totalStars + starsEarned;
        const newLevel = calculateLevel(newTotalStars, starsPerLevel);
        const leveledUp = newLevel > prevLevel;

        // Update previous level for tracking
        if (leveledUp) {
            setPreviousLevel(prevLevel);
        }

        // Update streak
        useProfileStore.getState().incrementStreak();
        const streakUpdate = updateStreak(
            currentProfile.currentStreak,
            new Date(currentProfile.lastActiveDate)
        );

        // Issue #5: Get fresh profile after updates for badge checking
        const updatedProfileAfterChanges = useProfileStore.getState().activeProfile;

        // Check for new badges with fresh profile data
        const profileForBadgeCheck = updatedProfileAfterChanges || {
            ...currentProfile,
            totalStars: newTotalStars,
            currentStreak: streakUpdate.currentStreak,
            longestStreak: streakUpdate.longestStreak,
        };
        const newBadges = checkAllBadges(profileForBadgeCheck, badgeDefinitions);

        // Earn new badges
        for (const badge of newBadges) {
            useProfileStore.getState().earnBadge(badge);
        }

        return {
            starsEarned,
            leveledUp,
            newLevel: leveledUp ? newLevel : undefined,
            newBadges,
            streakUpdate,
        };
    }, [starsPerLevel, badgeDefinitions]);

    // Check for new badges manually
    const checkForBadges = useCallback((): Badge[] => {
        if (!activeProfile) return [];
        return checkAllBadges(activeProfile, badgeDefinitions);
    }, [activeProfile, badgeDefinitions]);

    // Get stars for a specific area (from exercise results in storage)
    const getAreaStars = useCallback(async (areaId: string): Promise<number> => {
        if (!activeProfile) return 0;

        // Get exercise results filtered by area from storage
        const results = await getExerciseResultsByArea(areaId);

        // Filter by profile and correct answers, then sum scores
        return results
            .filter(result => result.childProfileId === activeProfile.id && result.correct)
            .reduce((sum, result) => sum + result.score, 0);
    }, [activeProfile]);

    // Get level for a specific area
    const getAreaLevel = useCallback((areaId: string): number => {
        if (!activeProfile) return 1;
        return activeProfile.currentLevels[areaId as keyof typeof activeProfile.currentLevels] ?? 1;
    }, [activeProfile]);

    return {
        ...state,
        processExerciseCompletion,
        checkForBadges,
        getAreaStars,
        getAreaLevel,
    };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for tracking level progress only.
 */
export function useLevelProgress(starsPerLevel: number = 10): LevelProgress {
    const totalStars = useProfileStore((state) => state.activeProfile?.totalStars ?? 0);

    return useMemo(() =>
        getLevelProgress(totalStars, starsPerLevel),
        [totalStars, starsPerLevel]
    );
}

/**
 * Hook for tracking streak only.
 */
export function useStreak(): {
    current: number;
    longest: number;
    lastActiveDate: string;
    atRisk: boolean;
} {
    const profile = useProfileStore((state) => state.activeProfile);

    return useMemo(() => ({
        current: profile?.currentStreak ?? 0,
        longest: profile?.longestStreak ?? 0,
        lastActiveDate: profile?.lastActiveDate ?? '',
        atRisk: profile ? profile.lastActiveDate !== new Date().toISOString().split('T')[0] : true,
    }), [profile]);
}

/**
 * Hook for badge management.
 */
export function useBadges(badgeDefinitions: BadgeDefinition[] = DEFAULT_BADGES): {
    badges: Badge[];
    checkForNew: () => Badge[];
    totalEarned: number;
    totalPossible: number;
} {
    const activeProfile = useProfileStore((state) => state.activeProfile);
    const earnBadge = useProfileStore((state) => state.earnBadge);

    const badges = activeProfile?.badges ?? [];

    const checkForNew = useCallback(() => {
        if (!activeProfile) return [];
        const newBadges = checkAllBadges(activeProfile, badgeDefinitions);
        for (const badge of newBadges) {
            earnBadge(badge);
        }
        return newBadges;
    }, [activeProfile, badgeDefinitions, earnBadge]);

    return useMemo(() => ({
        badges,
        checkForNew,
        totalEarned: badges.length,
        totalPossible: badgeDefinitions.length,
    }), [badges, checkForNew, badgeDefinitions.length]);
}

export default useGamification;
