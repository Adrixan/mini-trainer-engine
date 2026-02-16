/**
 * Configuration loader for the Mini Trainer Engine.
 * 
 * Provides functions to load and validate configuration files
 * for subjects, areas, themes, and badges.
 */

import type {
    SubjectConfig,
    ObservationArea,
    Theme,
    BadgeDefinition,
    TrainerConfig,
    GamificationConfig,
    AccessibilityDefaults,
    ValidationError,
    ValidationWarning,
} from '@/types';
import {
    validateSubjectConfig,
    validateAreas,
    validateThemes,
    validateBadges,
} from './validation';

// ============================================================================
// Configuration Imports
// ============================================================================

// Import JSON configuration files
import subjectJson from '@/config/subject.json';
import areasJson from '@/config/areas.json';
import themesJson from '@/config/themes.json';
import badgesJson from '@/config/badges.json';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default gamification configuration.
 * Used when not specified in configuration files.
 */
const DEFAULT_GAMIFICATION: GamificationConfig = {
    starStrategy: 'attempts',
    maxStarsPerExercise: 3,
    levelThresholds: [
        { level: 1, starsRequired: 0 },
        { level: 2, starsRequired: 10 },
        { level: 3, starsRequired: 25 },
        { level: 4, starsRequired: 45 },
        { level: 5, starsRequired: 70 },
        { level: 6, starsRequired: 100 },
        { level: 7, starsRequired: 140 },
        { level: 8, starsRequired: 190 },
        { level: 9, starsRequired: 250 },
        { level: 10, starsRequired: 320 },
    ],
    streakConfig: {
        milestones: [3, 7, 14, 30],
    },
};

/**
 * Default accessibility configuration.
 * Applied to new user profiles.
 */
const DEFAULT_ACCESSIBILITY: AccessibilityDefaults = {
    defaultFontSize: 'normal',
    defaultHighContrast: false,
    defaultAnimationsEnabled: true,
    defaultSoundEnabled: true,
};

// ============================================================================
// Configuration Loaders
// ============================================================================

/**
 * Load and validate the subject configuration.
 * 
 * @returns The validated subject configuration
 * @throws Error if configuration is invalid
 */
export function loadSubjectConfig(): SubjectConfig {
    const result = validateSubjectConfig(subjectJson);

    if (!result.valid) {
        const errorMessages = result.errors
            .map((e: ValidationError) => `${e.path}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid subject configuration:\n${errorMessages}`);
    }

    // Log warnings in development
    if (import.meta.env.DEV && result.warnings.length > 0) {
        result.warnings.forEach((w: ValidationWarning) => {
            console.warn(`[Config] ${w.path}: ${w.message}`);
        });
    }

    return subjectJson as SubjectConfig;
}

/**
 * Load and validate observation areas.
 * 
 * @returns Array of validated observation areas
 * @throws Error if configuration is invalid
 */
export function loadAreas(): ObservationArea[] {
    const result = validateAreas(areasJson);

    if (!result.valid) {
        const errorMessages = result.errors
            .map((e: ValidationError) => `${e.path}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid areas configuration:\n${errorMessages}`);
    }

    // Log warnings in development
    if (import.meta.env.DEV && result.warnings.length > 0) {
        result.warnings.forEach((w: ValidationWarning) => {
            console.warn(`[Config] ${w.path}: ${w.message}`);
        });
    }

    return areasJson as ObservationArea[];
}

/**
 * Load and validate themes.
 * 
 * @returns Array of validated themes
 * @throws Error if configuration is invalid
 */
export function loadThemes(): Theme[] {
    const result = validateThemes(themesJson);

    if (!result.valid) {
        const errorMessages = result.errors
            .map((e: ValidationError) => `${e.path}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid themes configuration:\n${errorMessages}`);
    }

    // Log warnings in development
    if (import.meta.env.DEV && result.warnings.length > 0) {
        result.warnings.forEach((w: ValidationWarning) => {
            console.warn(`[Config] ${w.path}: ${w.message}`);
        });
    }

    return themesJson as Theme[];
}

/**
 * Load and validate badge definitions.
 * 
 * @returns Array of validated badge definitions
 * @throws Error if configuration is invalid
 */
export function loadBadges(): BadgeDefinition[] {
    const result = validateBadges(badgesJson);

    if (!result.valid) {
        const errorMessages = result.errors
            .map((e: ValidationError) => `${e.path}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid badges configuration:\n${errorMessages}`);
    }

    // Log warnings in development
    if (import.meta.env.DEV && result.warnings.length > 0) {
        result.warnings.forEach((w: ValidationWarning) => {
            console.warn(`[Config] ${w.path}: ${w.message}`);
        });
    }

    // Transform the badges.json format to BadgeDefinition[]
    const badgesData = badgesJson as { badges: Array<{ badge: BadgeDefinition['badge']; type: string; threshold: number }> };

    return badgesData.badges.map((item) => ({
        badge: item.badge,
        checkExpression: `${item.type}:${item.threshold}`,
    }));
}

/**
 * Load gamification configuration from badges.json.
 * 
 * @returns Gamification configuration
 */
export function loadGamificationConfig(): GamificationConfig {
    const badgesData = badgesJson as {
        gamification?: Partial<GamificationConfig>;
    };

    if (badgesData.gamification) {
        return {
            ...DEFAULT_GAMIFICATION,
            ...badgesData.gamification,
            levelThresholds: badgesData.gamification.levelThresholds ?? DEFAULT_GAMIFICATION.levelThresholds,
            streakConfig: badgesData.gamification.streakConfig ?? DEFAULT_GAMIFICATION.streakConfig,
        };
    }

    return DEFAULT_GAMIFICATION;
}

/**
 * Load the complete trainer configuration.
 * Combines all configuration files into a single TrainerConfig object.
 * 
 * @returns Complete trainer configuration
 * @throws Error if any configuration is invalid
 */
export function loadFullConfig(): TrainerConfig {
    const subject = loadSubjectConfig();
    const observationAreas = loadAreas();
    const themes = loadThemes();
    const badges = loadBadges();
    const gamification = loadGamificationConfig();

    return {
        id: `trainer-${subject.id}`,
        name: subject.name,
        description: subject.description,
        version: '1.0.0',
        subject,
        observationAreas,
        themes,
        badges,
        supportedLocales: ['de', 'en'],
        defaultLocale: 'de',
        gamification,
        accessibility: DEFAULT_ACCESSIBILITY,
    };
}

// ============================================================================
// Configuration Validation (Non-throwing)
// ============================================================================

/**
 * Result of loading configuration with error handling.
 */
export interface ConfigLoadResult {
    /** Whether the configuration loaded successfully */
    success: boolean;
    /** The loaded configuration (if successful) */
    config: TrainerConfig | null;
    /** Validation errors encountered */
    errors: Array<{ file: string; message: string }>;
    /** Validation warnings encountered */
    warnings: Array<{ file: string; message: string }>;
}

/**
 * Load configuration with graceful error handling.
 * Returns a result object instead of throwing.
 * 
 * @returns Configuration load result with status and any errors
 */
export function loadConfigSafe(): ConfigLoadResult {
    const errors: ConfigLoadResult['errors'] = [];
    const warnings: ConfigLoadResult['warnings'] = [];

    // Validate subject
    const subjectResult = validateSubjectConfig(subjectJson);
    if (!subjectResult.valid) {
        subjectResult.errors.forEach((e: ValidationError) => {
            errors.push({ file: 'subject.json', message: `${e.path}: ${e.message}` });
        });
    }
    subjectResult.warnings.forEach((w: ValidationWarning) => {
        warnings.push({ file: 'subject.json', message: `${w.path}: ${w.message}` });
    });

    // Validate areas
    const areasResult = validateAreas(areasJson);
    if (!areasResult.valid) {
        areasResult.errors.forEach((e: ValidationError) => {
            errors.push({ file: 'areas.json', message: `${e.path}: ${e.message}` });
        });
    }
    areasResult.warnings.forEach((w: ValidationWarning) => {
        warnings.push({ file: 'areas.json', message: `${w.path}: ${w.message}` });
    });

    // Validate themes
    const themesResult = validateThemes(themesJson);
    if (!themesResult.valid) {
        themesResult.errors.forEach((e: ValidationError) => {
            errors.push({ file: 'themes.json', message: `${e.path}: ${e.message}` });
        });
    }
    themesResult.warnings.forEach((w: ValidationWarning) => {
        warnings.push({ file: 'themes.json', message: `${w.path}: ${w.message}` });
    });

    // Validate badges
    const badgesResult = validateBadges(badgesJson);
    if (!badgesResult.valid) {
        badgesResult.errors.forEach((e: ValidationError) => {
            errors.push({ file: 'badges.json', message: `${e.path}: ${e.message}` });
        });
    }
    badgesResult.warnings.forEach((w: ValidationWarning) => {
        warnings.push({ file: 'badges.json', message: `${w.path}: ${w.message}` });
    });

    // If there are errors, return failure
    if (errors.length > 0) {
        return {
            success: false,
            config: null,
            errors,
            warnings,
        };
    }

    // Load full config
    try {
        const config = loadFullConfig();
        return {
            success: true,
            config,
            errors: [],
            warnings,
        };
    } catch (err) {
        return {
            success: false,
            config: null,
            errors: [{ file: 'loader', message: String(err) }],
            warnings,
        };
    }
}
