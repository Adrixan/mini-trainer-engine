/**
 * Configuration context for the Mini Trainer Engine.
 * 
 * Provides React context for accessing trainer configuration
 * throughout the application with loading and error states.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    type ReactNode,
} from 'react';
import type {
    TrainerConfig,
    SubjectConfig,
    ObservationArea,
    Theme,
    BadgeDefinition,
    GamificationConfig,
    AccessibilityDefaults,
} from '@/types';
import {
    loadGamificationConfig,
    loadConfigSafe,
    type ConfigLoadResult,
} from './loader';

// ============================================================================
// Context Types
// ============================================================================

/**
 * Configuration context state.
 */
export interface ConfigContextState {
    /** Whether configuration is currently loading */
    isLoading: boolean;
    /** Whether configuration has been loaded */
    isLoaded: boolean;
    /** Error message if configuration failed to load */
    error: string | null;
    /** The full trainer configuration */
    config: TrainerConfig | null;
}

/**
 * Configuration context value.
 */
export interface ConfigContextValue extends ConfigContextState {
    /** Get the subject configuration */
    getSubject: () => SubjectConfig | null;
    /** Get all observation areas */
    getAreas: () => ObservationArea[];
    /** Get a specific observation area by ID */
    getArea: (id: string) => ObservationArea | undefined;
    /** Get all themes */
    getThemes: () => Theme[];
    /** Get a specific theme by ID */
    getTheme: (id: string) => Theme | undefined;
    /** Get all badge definitions */
    getBadges: () => BadgeDefinition[];
    /** Get gamification configuration */
    getGamification: () => GamificationConfig;
    /** Get accessibility defaults */
    getAccessibilityDefaults: () => AccessibilityDefaults;
    /** Reload configuration */
    reload: () => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const ConfigContext = createContext<ConfigContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface ConfigProviderProps {
    /** Child components */
    children: ReactNode;
    /** Whether to load configuration on mount */
    loadOnMount?: boolean;
    /** Callback when configuration is loaded */
    onConfigLoaded?: (config: TrainerConfig) => void;
    /** Callback when configuration fails to load */
    onConfigError?: (error: string) => void;
}

/**
 * Configuration provider component.
 * Loads configuration on mount and provides it to child components.
 * 
 * @example
 * ```tsx
 * <ConfigProvider>
 *   <App />
 * </ConfigProvider>
 * ```
 */
export function ConfigProvider({
    children,
    loadOnMount = true,
    onConfigLoaded,
    onConfigError,
}: ConfigProviderProps) {
    const [state, setState] = useState<ConfigContextState>({
        isLoading: loadOnMount,
        isLoaded: false,
        error: null,
        config: null,
    });

    /**
     * Load configuration from files.
     */
    const loadConfig = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Use synchronous loading for bundled JSON
            const result: ConfigLoadResult = loadConfigSafe();

            if (!result.success || !result.config) {
                const errorMessage = result.errors
                    .map((e) => `${e.file}: ${e.message}`)
                    .join('\n');

                setState({
                    isLoading: false,
                    isLoaded: false,
                    error: errorMessage,
                    config: null,
                });

                onConfigError?.(errorMessage);
                return;
            }

            // Log warnings in development
            if (import.meta.env?.DEV && result.warnings.length > 0) {
                console.group('[Config] Configuration loaded with warnings:');
                result.warnings.forEach((w) => {
                    console.warn(`  ${w.file}: ${w.message}`);
                });
                console.groupEnd();
            }

            setState({
                isLoading: false,
                isLoaded: true,
                error: null,
                config: result.config,
            });

            onConfigLoaded?.(result.config);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);

            setState({
                isLoading: false,
                isLoaded: false,
                error: errorMessage,
                config: null,
            });

            onConfigError?.(errorMessage);
        }
    }, [onConfigLoaded, onConfigError]);

    /**
     * Reload configuration.
     */
    const reload = useCallback(async () => {
        await loadConfig();
    }, [loadConfig]);

    // Load configuration on mount
    useEffect(() => {
        if (loadOnMount) {
            loadConfig();
        }
    }, [loadOnMount, loadConfig]);

    // Memoized accessor functions
    const getSubject = useCallback((): SubjectConfig | null => {
        return state.config?.subject ?? null;
    }, [state.config]);

    const getAreas = useCallback((): ObservationArea[] => {
        return state.config?.observationAreas ?? [];
    }, [state.config]);

    const getArea = useCallback((id: string): ObservationArea | undefined => {
        return state.config?.observationAreas.find((area) => area.id === id);
    }, [state.config]);

    const getThemes = useCallback((): Theme[] => {
        return state.config?.themes ?? [];
    }, [state.config]);

    const getTheme = useCallback((id: string): Theme | undefined => {
        return state.config?.themes.find((theme) => theme.id === id);
    }, [state.config]);

    const getBadges = useCallback((): BadgeDefinition[] => {
        return state.config?.badges ?? [];
    }, [state.config]);

    const getGamification = useCallback((): GamificationConfig => {
        return state.config?.gamification ?? loadGamificationConfig();
    }, [state.config]);

    const getAccessibilityDefaults = useCallback((): AccessibilityDefaults => {
        return state.config?.accessibility ?? {
            defaultFontSize: 'normal',
            defaultHighContrast: false,
            defaultAnimationsEnabled: true,
            defaultSoundEnabled: true,
        };
    }, [state.config]);

    // Memoized context value
    const value = useMemo<ConfigContextValue>(() => ({
        ...state,
        getSubject,
        getAreas,
        getArea,
        getThemes,
        getTheme,
        getBadges,
        getGamification,
        getAccessibilityDefaults,
        reload,
    }), [
        state,
        getSubject,
        getAreas,
        getArea,
        getThemes,
        getTheme,
        getBadges,
        getGamification,
        getAccessibilityDefaults,
        reload,
    ]);

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the configuration context.
 * 
 * @returns Configuration context value
 * @throws Error if used outside of ConfigProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { config, isLoading, error } = useConfig();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return <div>{config?.name}</div>;
 * }
 * ```
 */
export function useConfig(): ConfigContextValue {
    const context = useContext(ConfigContext);

    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }

    return context;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to get the subject configuration.
 * 
 * @returns Subject configuration or null if not loaded
 */
export function useSubject(): SubjectConfig | null {
    const { getSubject } = useConfig();
    return getSubject();
}

/**
 * Hook to get all observation areas.
 * 
 * @returns Array of observation areas
 */
export function useAreas(): ObservationArea[] {
    const { getAreas } = useConfig();
    return getAreas();
}

/**
 * Hook to get a specific observation area.
 * 
 * @param id - Area ID
 * @returns Observation area or undefined
 */
export function useArea(id: string): ObservationArea | undefined {
    const { getArea } = useConfig();
    return getArea(id);
}

/**
 * Hook to get all themes.
 * 
 * @returns Array of themes
 */
export function useThemes(): Theme[] {
    const { getThemes } = useConfig();
    return getThemes();
}

/**
 * Hook to get a specific theme.
 * 
 * @param id - Theme ID
 * @returns Theme or undefined
 */
export function useTheme(id: string): Theme | undefined {
    const { getTheme } = useConfig();
    return getTheme(id);
}

/**
 * Hook to get all badge definitions.
 * 
 * @returns Array of badge definitions
 */
export function useBadges(): BadgeDefinition[] {
    const { getBadges } = useConfig();
    return getBadges();
}

/**
 * Hook to get gamification configuration.
 * 
 * @returns Gamification configuration
 */
export function useGamification(): GamificationConfig {
    const { getGamification } = useConfig();
    return getGamification();
}

/**
 * Hook to get accessibility defaults.
 * 
 * @returns Accessibility defaults
 */
export function useAccessibilityDefaults(): AccessibilityDefaults {
    const { getAccessibilityDefaults } = useConfig();
    return getAccessibilityDefaults();
}
