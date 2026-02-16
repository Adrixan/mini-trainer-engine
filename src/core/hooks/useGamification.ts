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
import type { Badge } from '@/types/profile';
import type { StarRating, LevelProgress } from '@/types/gamification';
import type { BadgeDefinition } from '@/types/config';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of processing an exercise completion.
 */
export interface ExerciseCompletionResult {
    /** Stars earned for this exercise */
    starsEarned: StarRating;
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
    /** Get stars for a specific area */
    getAreaStars: (areaId: string) => number;
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
    const addStars = useProfileStore((state) => state.addStars);
    const incrementStreak = useProfileStore((state) => state.incrementStreak);
    const earnBadge = useProfileStore((state) => state.earnBadge);

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
    const processExerciseCompletion = useCallback((
        attempts: number
    ): ExerciseCompletionResult => {
        if (!activeProfile) {
            return {
                starsEarned: 1 as StarRating,
                leveledUp: false,
                newLevel: undefined,
                newBadges: [],
                streakUpdate: null,
            };
        }

        // Calculate stars
        const starsEarned = calculateStars(attempts);

        // Get previous level
        const prevLevel = calculateLevel(activeProfile.totalStars, starsPerLevel);

        // Add stars to profile
        addStars(starsEarned);

        // Calculate new level
        const newTotalStars = activeProfile.totalStars + starsEarned;
        const newLevel = calculateLevel(newTotalStars, starsPerLevel);
        const leveledUp = newLevel > prevLevel;

        // Update previous level for tracking
        if (leveledUp) {
            setPreviousLevel(prevLevel);
        }

        // Update streak
        incrementStreak();
        const streakUpdate = updateStreak(
            activeProfile.currentStreak,
            new Date(activeProfile.lastActiveDate)
        );

        // Check for new badges
        const updatedProfile = {
            ...activeProfile,
            totalStars: newTotalStars,
            currentStreak: streakUpdate.currentStreak,
            longestStreak: streakUpdate.longestStreak,
        };
        const newBadges = checkAllBadges(updatedProfile, badgeDefinitions);

        // Earn new badges
        for (const badge of newBadges) {
            earnBadge(badge);
        }

        return {
            starsEarned,
            leveledUp,
            newLevel: leveledUp ? newLevel : undefined,
            newBadges,
            streakUpdate,
        };
    }, [activeProfile, starsPerLevel, addStars, incrementStreak, earnBadge, badgeDefinitions]);

    // Check for new badges manually
    const checkForBadges = useCallback((): Badge[] => {
        if (!activeProfile) return [];
        return checkAllBadges(activeProfile, badgeDefinitions);
    }, [activeProfile, badgeDefinitions]);

    // Get stars for a specific area (from theme progress)
    const getAreaStars = useCallback((_areaId: string): number => {
        if (!activeProfile) return 0;

        // Sum stars from all themes in this area
        let areaStars = 0;
        for (const progress of Object.values(activeProfile.themeProgress)) {
            // This is a simplified version - in a real app, you'd filter by area
            areaStars += progress.starsEarned;
        }
        return areaStars;
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
