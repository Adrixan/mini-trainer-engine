/**
 * User profile store for the Mini Trainer Engine.
 * 
 * Manages the active user profile and provides actions for
 * updating progress, streaks, and achievements.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveProfile } from '@core/storage';
import type {
    UserProfile,
    Badge,
    ObservationAreaId,
    ThemeId,
    ThemeProgress,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Profile state interface.
 */
export interface ProfileState {
    /** Currently active user profile */
    activeProfile: UserProfile | null;

    // Actions
    /** Set the active profile */
    setActiveProfile: (profile: UserProfile | null) => void;
    /** Update the nickname */
    setNickname: (nickname: string) => void;
    /** Update the avatar */
    setAvatar: (avatarId: string) => void;
    /** Update level for an observation area */
    updateLevel: (areaId: ObservationAreaId, level: number) => void;
    /** Add stars to the total */
    addStars: (count: number) => void;
    /** Increment the streak */
    incrementStreak: () => void;
    /** Reset the streak */
    resetStreak: () => void;
    /** Update theme progress */
    updateThemeProgress: (themeId: ThemeId, progress: Partial<ThemeProgress>) => void;
    /** Earn a badge */
    earnBadge: (badge: Badge) => void;
    /** Clear the active profile */
    clearProfile: () => void;
}

// ============================================================================
// Store
// ============================================================================

/**
 * User profile store.
 * 
 * Persists the active profile to localStorage and syncs to IndexedDB.
 */
export const useProfileStore = create<ProfileState>()(
    persist(
        (set) => ({
            activeProfile: null,

            setActiveProfile: (profile) => set({ activeProfile: profile }),

            setNickname: (nickname) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            nickname,
                        },
                    };
                }),

            setAvatar: (avatarId) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            avatarId,
                        },
                    };
                }),

            updateLevel: (areaId, level) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    const current = state.activeProfile.currentLevels[areaId] ?? 1;
                    // Only keep highest level (no downgrade)
                    if (level <= current) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            currentLevels: {
                                ...state.activeProfile.currentLevels,
                                [areaId]: level,
                            },
                        },
                    };
                }),

            addStars: (count) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            totalStars: state.activeProfile.totalStars + count,
                        },
                    };
                }),

            incrementStreak: () =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    const today = new Date().toISOString().split('T')[0]!;
                    const lastActive = state.activeProfile.lastActiveDate;

                    // If already active today, no change
                    if (lastActive === today) return state;

                    // Check if yesterday
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0]!;

                    const newStreak = lastActive === yesterdayStr
                        ? state.activeProfile.currentStreak + 1
                        : 1;

                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            currentStreak: newStreak,
                            longestStreak: Math.max(newStreak, state.activeProfile.longestStreak),
                            lastActiveDate: today,
                        },
                    };
                }),

            resetStreak: () =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            currentStreak: 0,
                        },
                    };
                }),

            updateThemeProgress: (themeId, progress) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    const existing = state.activeProfile.themeProgress[themeId] ?? {
                        unlocked: false,
                        exercisesCompleted: 0,
                        exercisesTotal: 0,
                        starsEarned: 0,
                        maxStars: 0,
                    };
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            themeProgress: {
                                ...state.activeProfile.themeProgress,
                                [themeId]: { ...existing, ...progress },
                            },
                        },
                    };
                }),

            earnBadge: (badge) =>
                set((state) => {
                    if (!state.activeProfile) return state;
                    // No duplicates
                    if (state.activeProfile.badges.some((b) => b.id === badge.id)) return state;
                    return {
                        activeProfile: {
                            ...state.activeProfile,
                            badges: [...state.activeProfile.badges, badge],
                        },
                    };
                }),

            clearProfile: () => set({ activeProfile: null }),
        }),
        {
            name: 'mini-trainer-profile',
            version: 1,
        },
    ),
);

// ============================================================================
// IndexedDB Sync
// ============================================================================

/**
 * Sync activeProfile to IndexedDB whenever it changes.
 * This ensures data survives localStorage clears as long as IndexedDB exists.
 */
useProfileStore.subscribe((state, prevState) => {
    if (state.activeProfile && state.activeProfile !== prevState.activeProfile) {
        void saveProfile(state.activeProfile);
    }
});

// ============================================================================
// Selectors
// ============================================================================

/**
 * Selector for active profile.
 */
export const selectActiveProfile = (state: ProfileState) => state.activeProfile;

/**
 * Selector for profile nickname.
 */
export const selectNickname = (state: ProfileState) => state.activeProfile?.nickname;

/**
 * Selector for profile avatar.
 */
export const selectAvatar = (state: ProfileState) => state.activeProfile?.avatarId;

/**
 * Selector for total stars.
 */
export const selectTotalStars = (state: ProfileState) => state.activeProfile?.totalStars ?? 0;

/**
 * Selector for current streak.
 */
export const selectCurrentStreak = (state: ProfileState) => state.activeProfile?.currentStreak ?? 0;

/**
 * Selector for longest streak.
 */
export const selectLongestStreak = (state: ProfileState) => state.activeProfile?.longestStreak ?? 0;

/**
 * Selector for badges.
 */
export const selectBadges = (state: ProfileState) => state.activeProfile?.badges ?? [];

/**
 * Selector for theme progress.
 */
export const selectThemeProgress = (themeId: ThemeId) => (state: ProfileState) =>
    state.activeProfile?.themeProgress[themeId];

/**
 * Selector for level in an area.
 */
export const selectLevel = (areaId: ObservationAreaId) => (state: ProfileState) =>
    state.activeProfile?.currentLevels[areaId] ?? 1;
