/**
 * Theme selection page component.
 * 
 * Displays a grid of themes that users can select to start exercises.
 * Shows locked/unlocked states based on vocabulary level.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeCard } from '@core/components/theme';
import { useThemes, useConfig } from '@core/config';
import {
    useProfileStore,
    selectActiveProfile,
    selectTotalStars,
} from '@core/stores/profileStore';
import { levelFromStars } from '@core/utils/gamification';
import { ROUTES } from '@core/router';
import type { Theme, ThemeProgress } from '@/types';

// ============================================================================
// Level Display Component
// ============================================================================

/**
 * Level indicator dots showing current vocabulary level.
 */
function LevelIndicator({ level }: { level: number }) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">
                {t('theme.vocabularyLevel', 'Vocabulary Level')}:
            </span>
            <div className="flex gap-1" role="img" aria-label={t('theme.levelLabel', { level, defaultValue: `Level ${level}` })}>
                {[1, 2, 3, 4].map((lvl) => (
                    <div
                        key={lvl}
                        className={`w-3 h-3 rounded-full ${lvl <= level
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                            }`}
                        aria-hidden="true"
                    />
                ))}
            </div>
            <span className="text-sm font-medium text-blue-600">
                {level}
            </span>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Theme selection page.
 * Shows a grid of themes with progress and lock status.
 */
export function ThemeSelectPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Get themes and exercises from config
    const themes = useThemes();
    const { getExercisesByTheme } = useConfig();

    // Get profile data
    const profile = useProfileStore(selectActiveProfile);
    const totalStars = useProfileStore(selectTotalStars);

    // Calculate vocabulary level
    const vocabularyLevel = levelFromStars(totalStars);

    // Get theme progress from profile
    const getThemeProgress = (themeId: string): ThemeProgress | undefined => {
        return profile?.themeProgress[themeId];
    };

    // Calculate theme progress from exercises if not in profile
    const calculateThemeProgress = (theme: Theme): ThemeProgress => {
        const exercises = getExercisesByTheme(theme.id);
        const storedProgress = getThemeProgress(theme.id);

        if (storedProgress) {
            return storedProgress;
        }

        // Return default progress based on exercise count
        return {
            unlocked: vocabularyLevel >= theme.minLevel,
            exercisesCompleted: 0,
            exercisesTotal: exercises.length,
            starsEarned: 0,
            maxStars: exercises.length * 3,
        };
    };

    // Handle theme card click
    const handleThemeClick = (theme: Theme) => {
        // Navigate to level selection for this theme
        navigate(ROUTES.LEVEL_SELECT(theme.id));
    };

    return (
        <div
            className="min-h-screen bg-gray-50 p-4"
            role="main"
            aria-labelledby="theme-select-title"
        >
            {/* Header */}
            <header className="max-w-2xl mx-auto mb-6">
                <h1
                    id="theme-select-title"
                    className="text-2xl font-bold text-gray-900 mb-2"
                >
                    {t('theme.title', 'Choose a Theme')}
                </h1>

                {/* Level indicator */}
                <LevelIndicator level={vocabularyLevel} />

                <p className="text-gray-600">
                    {t('theme.subtitle', 'Select a theme to practice. Complete exercises to earn stars and unlock new themes!')}
                </p>
            </header>

            {/* Theme grid */}
            <div
                className="max-w-2xl mx-auto grid grid-cols-2 gap-4"
                role="list"
                aria-label={t('theme.themeList', 'Available themes')}
            >
                {themes.map((theme) => {
                    const isUnlocked = vocabularyLevel >= theme.minLevel;
                    const progress = calculateThemeProgress(theme);

                    return (
                        <div key={theme.id} role="listitem">
                            <ThemeCard
                                theme={theme}
                                progress={progress}
                                isUnlocked={isUnlocked}
                                vocabularyLevel={vocabularyLevel}
                                onClick={() => handleThemeClick(theme)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Back button */}
            <div className="max-w-2xl mx-auto mt-6">
                <button
                    onClick={() => navigate(ROUTES.HOME)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                    aria-label={t('navigation.back', 'Back to home')}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    <span>{t('navigation.back', 'Back')}</span>
                </button>
            </div>
        </div>
    );
}

export default ThemeSelectPage;
