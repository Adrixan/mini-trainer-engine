/**
 * Home page component.
 * 
 * This is the main landing page for the trainer application.
 * Shows profile creation if no active profile, otherwise shows dashboard.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/router';
import { useProfileStore, selectActiveProfile, selectTotalStars, selectCurrentStreak } from '@core/stores/profileStore';
import { ProfileCreation } from '@core/components/profile';

/**
 * Get fire emoji count based on streak length.
 */
function getFireCount(streak: number): number {
    if (streak >= 7) return 3;
    if (streak >= 3) return 2;
    if (streak >= 1) return 1;
    return 0;
}

/**
 * Dashboard component shown when profile exists.
 */
function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const profile = useProfileStore(selectActiveProfile);
    const totalStars = useProfileStore(selectTotalStars);
    const currentStreak = useProfileStore(selectCurrentStreak);
    const exportSaveGame = useProfileStore((state) => state.exportSaveGame);
    const [isSaving, setIsSaving] = useState(false);

    const fireCount = getFireCount(currentStreak);
    const fires = '🔥'.repeat(fireCount);

    const handleSaveGame = async () => {
        setIsSaving(true);
        try {
            const data = await exportSaveGame();
            if (data) {
                const date = new Date().toISOString().split('T')[0];
                const nickname = profile?.nickname ?? 'player';
                const filename = `daz-spielstand-${nickname}-${date}.json`;
                downloadSaveGame(data, filename);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="flex flex-col items-center min-h-[80vh] p-4"
            role="main"
            aria-labelledby="dashboard-title"
        >
            {/* Welcome Header */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-5xl" role="img" aria-label={t('profile.avatar', 'Avatar')}>
                    {profile?.avatarId}
                </span>
                <div>
                    <h1 id="dashboard-title" className="text-2xl font-bold text-gray-900">
                        {t('dashboard.welcome', 'Welcome back')}, {profile?.nickname}!
                    </h1>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6">
                {/* Total Stars Card */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-1" role="img" aria-label={t('stats.stars', 'Stars')}>
                        ⭐
                    </div>
                    <div className="text-2xl font-bold text-yellow-700">{totalStars}</div>
                    <div className="text-sm text-yellow-600">{t('stats.totalStars', 'Stars')}</div>
                </div>

                {/* Current Streak Card */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-1" role="img" aria-label={t('stats.streak', 'Streak')}>
                        {fires || '🔥'}
                    </div>
                    <div className="text-2xl font-bold text-orange-700">{currentStreak}</div>
                    <div className="text-sm text-orange-600">{t('stats.dayStreak', 'Day Streak')}</div>
                </div>
            </div>

            {/* Streak Status */}
            {currentStreak > 0 && (
                <p className="text-gray-600 mb-6 text-center">
                    {t('dashboard.streakActive', 'Keep it up! Your streak is active.')}
                </p>
            )}

            {/* Action Buttons */}
            <div className="grid gap-4 w-full max-w-sm">
                <button
                    onClick={() => navigate(ROUTES.THEMES)}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {t('dashboard.startExercises', 'Start Exercises')}
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate(ROUTES.PROFILE)}
                        className="py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('dashboard.progress', 'Progress')}
                    </button>
                    <button
                        onClick={() => navigate(ROUTES.SETTINGS)}
                        className="py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('dashboard.settings', 'Settings')}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate(ROUTES.RESULTS)}
                        className="py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('dashboard.results', 'Results')}
                    </button>
                    <button
                        onClick={handleSaveGame}
                        disabled={isSaving}
                        className="py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? t('settings.saving', 'Saving...') : t('settings.saveButton', 'Save Game')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Download a save game file.
 */
function downloadSaveGame(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Home page component.
 * Displays profile creation or dashboard based on active profile.
 */
export function HomePage() {
    const activeProfile = useProfileStore(selectActiveProfile);

    if (!activeProfile) {
        return <ProfileCreation />;
    }

    return <Dashboard />;
}
