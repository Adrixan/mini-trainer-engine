/**
 * User profile store for the Mini Trainer Engine.
 * 
 * Manages the active user profile and provides actions for
 * updating progress, streaks, and achievements.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveProfile, clearAllExerciseResults, saveExerciseResult, getAllExerciseResults } from '@core/storage';
import type {
    UserProfile,
    Badge,
    ObservationAreaId,
    ThemeId,
    ThemeProgress,
    ExerciseResult,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Available avatar emojis for profile creation.
 */
export const AVATAR_EMOJIS = [
    '🦊', // Fox
    '🐻', // Bear
    '🐰', // Bunny
    '🦁', // Lion
    '🐸', // Frog
    '🐼', // Panda
    '🦄', // Unicorn
    '🐕', // Dog
    '🐱', // Cat
    '🐵', // Monkey
    '🦋', // Butterfly
    '🌟', // Star
] as const;

/**
 * Maximum nickname length.
 */
export const MAX_NICKNAME_LENGTH = 20;

/**
 * Current save game version.
 */
export const SAVE_GAME_VERSION = 2;

// ============================================================================
// Types
// ============================================================================

/**
 * Save game payload for export/import.
 */
export interface SaveGamePayload {
    version: 2;
    savedAt: string;
    profile: UserProfile;
    exerciseResults: ExerciseResult[];
}

/**
 * Profile state interface.
 */
export interface ProfileState {
    /** Currently active user profile */
    activeProfile: UserProfile | null;

    // Actions
    /** Set the active profile */
    setActiveProfile: (profile: UserProfile | null) => void;
    /** Create a new profile with nickname and avatar */
    createProfile: (nickname: string, avatarId: string) => UserProfile;
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
    /** Export profile and results as JSON */
    exportSaveGame: () => Promise<SaveGamePayload | null>;
    /** Import profile and results from JSON */
    importSaveGame: (data: SaveGamePayload) => Promise<{ success: boolean; error?: string }>;
}

// ============================================================================
// Store
// ============================================================================

/**
 * Create initial levels for all observation areas.
 */
function createInitialLevels(): Record<ObservationAreaId, number> {
    return {
        'woerter-und-saetze': 1,
        'klaenge-und-silben': 1,
        'kommunikation': 1,
        'textkompetenz': 1,
        'sprachbetrachtung': 1,
        'rechtschreibung': 1,
    };
}

/**
 * User profile store.
 * 
 * Persists the active profile to localStorage and syncs to IndexedDB.
 */
export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            activeProfile: null,

            setActiveProfile: (profile) => set({ activeProfile: profile }),

            createProfile: (nickname, avatarId) => {
                const profile: UserProfile = {
                    id: crypto.randomUUID(),
                    nickname: nickname.trim(),
                    avatarId,
                    createdAt: new Date().toISOString(),
                    currentLevels: createInitialLevels(),
                    totalStars: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActiveDate: '',
                    themeProgress: {},
                    badges: [],
                };
                set({ activeProfile: profile });
                return profile;
            },

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
                    const today = new Date().toISOString().split('T')[0] ?? '';
                    const lastActive = state.activeProfile.lastActiveDate;

                    // If already active today, no change
                    if (lastActive === today) return state;

                    // Check if yesterday
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0] ?? '';

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

            exportSaveGame: async () => {
                const { activeProfile } = get();
                if (!activeProfile) return null;

                const exerciseResults = await getAllExerciseResults();

                return {
                    version: SAVE_GAME_VERSION,
                    savedAt: new Date().toISOString(),
                    profile: activeProfile,
                    exerciseResults,
                };
            },

            importSaveGame: async (data) => {
                try {
                    // Validate version
                    if (data.version !== SAVE_GAME_VERSION) {
                        return {
                            success: false,
                            error: `Invalid save game version. Expected ${SAVE_GAME_VERSION}, got ${data.version}`,
                        };
                    }

                    // Validate required fields
                    if (!data.profile || !data.profile.id || !data.profile.nickname) {
                        return {
                            success: false,
                            error: 'Invalid save game: missing profile data',
                        };
                    }

                    // Clear existing data
                    await clearAllExerciseResults();

                    // Import exercise results
                    if (data.exerciseResults && Array.isArray(data.exerciseResults)) {
                        for (const result of data.exerciseResults) {
                            await saveExerciseResult(result);
                        }
                    }

                    // Set the imported profile as active
                    set({ activeProfile: data.profile });

                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    };
                }
            },
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

// ============================================================================
// Save Game Utilities
// ============================================================================

/**
 * Download a save game file.
 * 
 * @param payload - The save game data to download
 */
export function downloadSaveGame(payload: SaveGamePayload): void {
    const nickname = payload.profile.nickname || 'player';
    const date = new Date().toISOString().split('T')[0];
    const filename = `spielstand-${nickname}-${date}.json`;

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse and validate a save game file.
 * 
 * @param file - The file to parse
 * @returns Promise resolving to the save game payload or error
 */
export async function parseSaveGameFile(file: File): Promise<SaveGamePayload | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content) as SaveGamePayload;
                resolve(data);
            } catch {
                reject(new Error('Invalid JSON file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
