/**
 * Profile persistence module for the Mini Trainer Engine.
 * 
 * Handles save game export/import and IndexedDB synchronization.
 * Separated from profileStore to maintain single responsibility.
 */

import type { UserProfile, ExerciseResult } from '@/types';
import {
    saveProfile,
    clearAllExerciseResults,
    saveExerciseResult,
    getAllExerciseResults,
} from '@core/storage';

// ============================================================================
// Constants
// ============================================================================

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
 * Result of a save game import operation.
 */
export type ImportResult =
    | { success: true }
    | { success: false; error: string };

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a save game payload.
 * 
 * @param data - The data to validate
 * @returns Validation result with error message if invalid
 */
export function validateSaveGame(data: unknown): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid save game: not an object' };
    }

    const payload = data as Record<string, unknown>;

    // Check version
    if (payload.version !== SAVE_GAME_VERSION) {
        return {
            valid: false,
            error: `Invalid save game version. Expected ${SAVE_GAME_VERSION}, got ${payload.version}`,
        };
    }

    // Check required fields
    if (!payload.profile || typeof payload.profile !== 'object') {
        return { valid: false, error: 'Invalid save game: missing profile data' };
    }

    const profile = payload.profile as Record<string, unknown>;
    if (!profile.id || !profile.nickname) {
        return { valid: false, error: 'Invalid save game: missing profile data' };
    }

    return { valid: true };
}

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Export profile and exercise results as a save game payload.
 * 
 * @param profile - The user profile to export
 * @returns Promise resolving to the save game payload
 */
export async function exportSaveGame(profile: UserProfile): Promise<SaveGamePayload> {
    const exerciseResults = await getAllExerciseResults();

    return {
        version: SAVE_GAME_VERSION,
        savedAt: new Date().toISOString(),
        profile,
        exerciseResults,
    };
}

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

// ============================================================================
// Import Operations
// ============================================================================

/**
 * Import a save game payload.
 * 
 * @param data - The save game data to import
 * @param setProfile - Callback to set the imported profile
 * @returns Promise resolving to the import result
 */
export async function importSaveGame(
    data: SaveGamePayload,
    setProfile: (profile: UserProfile) => void
): Promise<ImportResult> {
    try {
        // Validate
        const validation = validateSaveGame(data);
        if (!validation.valid) {
            return { success: false, error: validation.error ?? 'Unknown validation error' };
        }

        // Clear existing data
        await clearAllExerciseResults();

        // Import exercise results
        if (data.exerciseResults && Array.isArray(data.exerciseResults)) {
            for (const result of data.exerciseResults) {
                await saveExerciseResult(result);
            }
        }

        // Set the imported profile
        setProfile(data.profile);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Parse and validate a save game file.
 * 
 * @param file - The file to parse
 * @returns Promise resolving to the save game payload or error
 */
export async function parseSaveGameFile(file: File): Promise<SaveGamePayload> {
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

// ============================================================================
// IndexedDB Sync
// ============================================================================

/**
 * Sync profile to IndexedDB.
 * Called when profile changes in the store.
 * 
 * @param profile - The profile to sync
 */
export async function syncProfileToIndexedDB(profile: UserProfile | null): Promise<void> {
    if (!profile) return;

    try {
        await saveProfile(profile);
    } catch (error) {
        console.error('[Storage] ❌ Failed to save profile to IndexedDB:', error);
        throw error;
    }
}
