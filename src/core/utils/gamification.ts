/**
 * Gamification utility functions for the Mini Trainer Engine.
 * 
 * Provides core calculations for stars, levels, streaks, and progress.
 */

import type { Streak, LevelProgress, Score } from '@/types/gamification';
import type { UserProfile } from '@/types/profile';
import type { BadgeDefinition } from '@/types/config';

// ============================================================================
// Star Calculations
// ============================================================================

/**
 * Calculate star rating from number of attempts.
 * 1st attempt = 3 stars, 2nd attempt = 2 stars, 3rd attempt = 1 star.
 * Returns 0 if attempts exceed maxAttempts or are invalid (<= 0).
 * 
 * @param attempts - Number of attempts made (must be positive)
 * @param maxAttempts - Maximum allowed attempts (default: 3)
 * @returns Score (0-3), where 0 means exceeded max attempts or invalid input
 */
export function calculateStars(attempts: number, maxAttempts: number = 3): Score {
    // Invalid attempts (0 or negative) should not award stars
    if (attempts <= 0) return 0;
    if (attempts > maxAttempts) return 0;
    if (attempts === 1) return 3;
    if (attempts === 2) return 2;
    return 1;
}

/**
 * Get star display string with emoji.
 * 
 * @param stars - Number of stars (0-3)
 * @returns String of star emojis
 */
export function getStarDisplay(stars: number): string {
    const filledStars = Math.min(Math.max(stars, 0), 3);
    const emptyStars = 3 - filledStars;
    return '⭐'.repeat(filledStars) + '☆'.repeat(emptyStars);
}

/**
 * Get star display as array for rendering.
 * 
 * @param stars - Number of stars (0-3)
 * @returns Array of boolean indicating filled stars
 */
export function getStarArray(stars: number): [boolean, boolean, boolean] {
    return [
        stars >= 1,
        stars >= 2,
        stars >= 3,
    ];
}

// ============================================================================
// Level Calculations
// ============================================================================

/**
 * Default stars required per level.
 */
export const DEFAULT_STARS_PER_LEVEL = 10;

/**
 * Level thresholds for vocabulary level progression.
 * These thresholds are intentionally low for quick progress.
 * Based on original mini-daz-trainer-kids implementation.
 */
export const VOCABULARY_LEVEL_THRESHOLDS = {
    LEVEL_2: 4,   // >= 4 stars -> Level 2
    LEVEL_3: 12,  // >= 12 stars -> Level 3
    LEVEL_4: 20,  // >= 20 stars -> Level 4
} as const;

/**
 * Calculate vocabulary level from total stars.
 * Uses fixed thresholds from the original app:
 * - >= 4 stars -> Level 2
 * - >= 12 stars -> Level 3
 * - >= 20 stars -> Level 4
 * 
 * @param totalStars - Total stars earned
 * @returns Vocabulary level (1-4)
 */
export function levelFromStars(totalStars: number): number {
    if (totalStars >= VOCABULARY_LEVEL_THRESHOLDS.LEVEL_4) return 4;
    if (totalStars >= VOCABULARY_LEVEL_THRESHOLDS.LEVEL_3) return 3;
    if (totalStars >= VOCABULARY_LEVEL_THRESHOLDS.LEVEL_2) return 2;
    return 1;
}

/**
 * Calculate level from total stars.
 * 
 * @param totalStars - Total stars earned
 * @param starsPerLevel - Stars required per level (default: 10)
 * @returns Current level (1-based)
 */
export function calculateLevel(totalStars: number, starsPerLevel: number = DEFAULT_STARS_PER_LEVEL): number {
    return Math.floor(totalStars / starsPerLevel) + 1;
}

/**
 * Get stars needed to reach the next level.
 * 
 * @param currentStars - Current total stars
 * @param starsPerLevel - Stars required per level (default: 10)
 * @returns Stars needed for next level
 */
export function getStarsForNextLevel(currentStars: number, starsPerLevel: number = DEFAULT_STARS_PER_LEVEL): number {
    const currentLevelStars = currentStars % starsPerLevel;
    return starsPerLevel - currentLevelStars;
}

/**
 * Get progress percentage toward next level.
 * 
 * @param currentStars - Current total stars
 * @param starsPerLevel - Stars required per level (default: 10)
 * @returns Progress percentage (0-100)
 */
export function getProgressPercentage(currentStars: number, starsPerLevel: number = DEFAULT_STARS_PER_LEVEL): number {
    const currentLevelStars = currentStars % starsPerLevel;
    return (currentLevelStars / starsPerLevel) * 100;
}

/**
 * Get complete level progress information.
 * 
 * @param totalStars - Total stars earned
 * @param starsPerLevel - Stars required per level (default: 10)
 * @param previousLevel - Previous level before this calculation (for justLeveledUp)
 * @returns Level progress information
 */
export function getLevelProgress(
    totalStars: number,
    starsPerLevel: number = DEFAULT_STARS_PER_LEVEL,
    previousLevel?: number
): LevelProgress {
    const currentLevel = calculateLevel(totalStars, starsPerLevel);
    const currentStars = totalStars % starsPerLevel;
    const starsToNextLevel = starsPerLevel - currentStars;
    const progressPercentage = getProgressPercentage(totalStars, starsPerLevel);
    const justLeveledUp = previousLevel !== undefined && currentLevel > previousLevel;

    return {
        currentLevel,
        currentStars,
        starsToNextLevel,
        progressPercentage,
        justLeveledUp,
    };
}

// ============================================================================
// Streak Calculations
// ============================================================================

/**
 * Result of updating a streak.
 */
export interface StreakResult {
    /** New current streak */
    currentStreak: number;
    /** New longest streak */
    longestStreak: number;
    /** Whether the streak was updated */
    updated: boolean;
    /** Whether the streak was broken */
    broken: boolean;
    /** ISO 8601 date string for last activity */
    lastActiveDate: string;
}

/**
 * Update streak based on last activity date.
 * 
 * @param currentStreak - Current streak count
 * @param lastActivity - Date of last activity
 * @returns Streak update result
 */
export function updateStreak(currentStreak: number, lastActivity: Date): StreakResult {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = new Date(lastActivity);
    lastActive.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastActive.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const todayStr = today.toISOString().split('T')[0] ?? '';

    // Same day - no change
    if (diffDays === 0) {
        return {
            currentStreak,
            longestStreak: currentStreak,
            updated: false,
            broken: false,
            lastActiveDate: todayStr,
        };
    }

    // Yesterday - increment streak
    if (diffDays === 1) {
        const newStreak = currentStreak + 1;
        return {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, currentStreak),
            updated: true,
            broken: false,
            lastActiveDate: todayStr,
        };
    }

    // More than 1 day gap - streak broken, restart at 1
    return {
        currentStreak: 1,
        longestStreak: currentStreak, // Keep the previous longest
        updated: true,
        broken: true,
        lastActiveDate: todayStr,
    };
}

/**
 * Check if a streak is at risk (no activity today yet).
 * 
 * @param lastActiveDate - ISO 8601 date string of last activity
 * @returns Whether the streak is at risk
 */
export function isStreakAtRisk(lastActiveDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return lastActiveDate !== today;
}

/**
 * Get streak display information.
 * 
 * @param streak - Streak information
 * @returns Display-friendly streak data
 */
export function getStreakDisplay(streak: Streak): {
    current: number;
    longest: number;
    atRisk: boolean;
    emoji: string;
    message: string;
} {
    const atRisk = isStreakAtRisk(streak.lastActiveDate);

    let emoji = '🔥';
    let message = `${streak.current} day streak!`;

    if (streak.current >= 30) {
        emoji = '🏆';
        message = 'Amazing! 30+ day streak!';
    } else if (streak.current >= 14) {
        emoji = '💪';
        message = 'Incredible! 14+ day streak!';
    } else if (streak.current >= 7) {
        emoji = '🌟';
        message = 'Great! 7+ day streak!';
    } else if (streak.current >= 3) {
        emoji = '✨';
        message = 'Nice! 3+ day streak!';
    }

    return {
        current: streak.current,
        longest: streak.longest,
        atRisk,
        emoji,
        message,
    };
}

// ============================================================================
// Badge Checking
// ============================================================================

/**
 * Check if a badge is earned based on profile.
 * 
 * @param badge - Badge definition with check function
 * @param profile - User profile to check against
 * @returns Whether the badge is earned
 */
export function checkBadge(badge: BadgeDefinition, profile: UserProfile): boolean {
    // If there's a runtime check function, use it
    if (badge.check) {
        return badge.check(profile);
    }

    // Otherwise, check by badge ID pattern
    return checkBadgeById(badge.badge.id, profile);
}

/**
 * Check badge by ID pattern.
 * Handles standard badge types: star_milestone, streak_milestone, level_milestone.
 * 
 * @param badgeId - Badge identifier
 * @param profile - User profile
 * @returns Whether the badge is earned
 */
export function checkBadgeById(badgeId: string, profile: UserProfile): boolean {
    // Star milestones: stars_10, stars_25, stars_50, stars_100, stars_250, stars_500
    if (badgeId.startsWith('stars_')) {
        const threshold = parseInt(badgeId.replace('stars_', ''), 10);
        return profile.totalStars >= threshold;
    }

    // Streak milestones: streak_3, streak_7, streak_14, streak_30
    if (badgeId.startsWith('streak_')) {
        const threshold = parseInt(badgeId.replace('streak_', ''), 10);
        return profile.longestStreak >= threshold;
    }

    // Level milestones: level_5, level_10, level_20
    if (badgeId.startsWith('level_')) {
        const threshold = parseInt(badgeId.replace('level_', ''), 10);
        // Check if any area has reached this level
        return Object.values(profile.currentLevels).some(level => level >= threshold);
    }

    // Theme completion: theme_complete_<themeId>
    if (badgeId.startsWith('theme_complete_')) {
        const themeId = badgeId.replace('theme_complete_', '');
        const progress = profile.themeProgress[themeId];
        return progress ? progress.exercisesCompleted >= progress.exercisesTotal && progress.exercisesTotal > 0 : false;
    }

    // Area mastery: area_mastery_<areaId>
    if (badgeId.startsWith('area_mastery_')) {
        const areaId = badgeId.replace('area_mastery_', '');
        const level = profile.currentLevels[areaId as keyof typeof profile.currentLevels];
        // Max level is typically 10
        return (level ?? 0) >= 10;
    }

    return false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a number with ordinal suffix (1st, 2nd, 3rd, etc.).
 * 
 * @param n - Number to format
 * @returns Formatted string with ordinal suffix
 */
export function formatOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    const idx = v < 20 ? v : (v - 20) % 10;
    return n + (s[idx] ?? 'th');
}

/**
 * Get a motivational message based on performance.
 * 
 * @param stars - Stars earned (0-3)
 * @param streak - Current streak
 * @returns Motivational message
 */
export function getMotivationalMessage(stars: number, streak?: number): string {
    if (stars === 3) {
        if (streak && streak >= 7) {
            return 'Perfect! Your streak is on fire! 🔥';
        }
        return 'Perfect! Amazing work! 🌟';
    }

    if (stars === 2) {
        return 'Great job! Keep it up! 👏';
    }

    if (stars === 1) {
        return 'Good effort! Try again for more stars! 💪';
    }

    return 'Keep practicing! You\'ll get it next time! 🎯';
}

/**
 * Calculate total possible stars from exercise count.
 * 
 * @param exerciseCount - Number of exercises
 * @param maxStarsPerExercise - Maximum stars per exercise (default: 3)
 * @returns Total possible stars
 */
export function calculateMaxStars(exerciseCount: number, maxStarsPerExercise: number = 3): number {
    return exerciseCount * maxStarsPerExercise;
}

// ============================================================================
// Theme Level Progression
// ============================================================================

/**
 * Maximum level per theme.
 */
export const MAX_THEME_LEVEL = 4;

/**
 * Calculate the highest level that is accessible across ALL themes.
 * 
 * This represents the "global progression level" - the highest level number
 * that a user can access in every theme. It's determined by the theme with
 * the lowest completed level (the "weakest link" principle).
 * 
 * The global level determines what new level the user can unlock next.
 * To unlock level N globally, the user must have completed level N-1 in ALL themes.
 * 
 * @example
 * // User has completed:
 * // - Theme A: level 2
 * // - Theme B: level 1
 * // - Theme C: level 3
 * // Global level = min(2, 1, 3) + 1 = 2
 * // User can access level 2 in all themes, but level 3 only in themes A and C
 * 
 * @param themeLevels - Record of theme ID to highest completed level (0 if not started)
 * @param allThemeIds - All available theme IDs
 * @returns Global accessible level (1-4), where 1 means "can access level 1 in all themes"
 */
export function calculateGlobalLevel(
    themeLevels: Record<string, number>,
    allThemeIds: string[]
): number {
    if (allThemeIds.length === 0) return 1;

    // Get the minimum completed level across all themes
    const minCompletedLevel = Math.min(
        ...allThemeIds.map(themeId => themeLevels[themeId] ?? 0)
    );

    // Global level is min completed + 1 (capped at MAX_THEME_LEVEL)
    return Math.min(minCompletedLevel + 1, MAX_THEME_LEVEL);
}

/**
 * Calculate the highest accessible level for a specific theme.
 * A user can access level N in a theme if:
 * - N is 1 (always accessible)
 * - N <= their completed level for that theme + 1
 * - N <= global level
 * 
 * @param themeId - The theme to check
 * @param themeLevels - Record of theme ID to highest completed level
 * @param allThemeIds - All available theme IDs
 * @returns Highest accessible level for this theme (1-4)
 */
export function getAccessibleLevelForTheme(
    themeId: string,
    themeLevels: Record<string, number>,
    allThemeIds: string[]
): number {
    const globalLevel = calculateGlobalLevel(themeLevels, allThemeIds);
    const themeCompletedLevel = themeLevels[themeId] ?? 0;

    // Can access up to completed + 1, but not more than global level
    return Math.min(themeCompletedLevel + 1, globalLevel);
}

/**
 * Check if a specific level in a theme is accessible.
 * 
 * @param themeId - The theme to check
 * @param level - The level to check (1-4)
 * @param themeLevels - Record of theme ID to highest completed level
 * @param allThemeIds - All available theme IDs
 * @returns Whether the level is accessible
 */
export function isLevelAccessible(
    themeId: string,
    level: number,
    themeLevels: Record<string, number>,
    allThemeIds: string[]
): boolean {
    const accessibleLevel = getAccessibleLevelForTheme(themeId, themeLevels, allThemeIds);
    return level <= accessibleLevel;
}

/**
 * Check if a level is completed for a theme.
 * 
 * @param themeId - The theme to check
 * @param level - The level to check (1-4)
 * @param themeLevels - Record of theme ID to highest completed level
 * @returns Whether the level is completed
 */
export function isLevelCompleted(
    themeId: string,
    level: number,
    themeLevels: Record<string, number>
): boolean {
    const completedLevel = themeLevels[themeId] ?? 0;
    return level <= completedLevel;
}

/**
 * Get a description of what needs to be done to unlock the next global level.
 * 
 * @param themeLevels - Record of theme ID to highest completed level
 * @param allThemeIds - All available theme IDs
 * @param themeNames - Record of theme ID to theme name for display
 * @returns Description of requirements or null if at max level
 */
export function getNextLevelRequirement(
    themeLevels: Record<string, number>,
    allThemeIds: string[],
    themeNames: Record<string, string>
): string | null {
    const globalLevel = calculateGlobalLevel(themeLevels, allThemeIds);

    if (globalLevel >= MAX_THEME_LEVEL) {
        return null; // Already at max level
    }

    // Find themes that need level N completed to unlock level N+1
    const targetLevel = globalLevel;
    const incompleteThemes = allThemeIds.filter(
        themeId => (themeLevels[themeId] ?? 0) < targetLevel
    );

    if (incompleteThemes.length === 0) {
        return null;
    }

    const themeNamesList = incompleteThemes
        .map(id => themeNames[id] ?? id)
        .join(', ');

    if (targetLevel === 1) {
        return `Complete Level 1 in all themes to unlock Level 2. Missing: ${themeNamesList}`;
    }

    return `Complete Level ${targetLevel} in: ${themeNamesList} to unlock Level ${globalLevel + 1}`;
}
