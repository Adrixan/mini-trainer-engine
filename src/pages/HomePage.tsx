/**
 * Home page component.
 * 
 * This is the main landing page for the trainer application.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/router';

/**
 * Home page component.
 * Displays welcome message and navigation to main features.
 */
export function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {t('home.welcome', 'Welcome')}
            </h1>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                {t('home.subtitle', 'Start your learning journey')}
            </p>

            <div className="grid gap-4 w-full max-w-sm">
                <button
                    onClick={() => navigate(ROUTES.EXERCISE('default'))}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {t('home.startExercise', 'Start Exercise')}
                </button>

                <button
                    onClick={() => navigate(ROUTES.PROFILE)}
                    className="w-full py-3 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    {t('home.profile', 'Profile')}
                </button>

                <button
                    onClick={() => navigate(ROUTES.SETTINGS)}
                    className="w-full py-3 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    {t('home.settings', 'Settings')}
                </button>

                <button
                    onClick={() => navigate(ROUTES.RESULTS)}
                    className="w-full py-3 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    {t('home.results', 'Results')}
                </button>
            </div>
        </div>
    );
}
