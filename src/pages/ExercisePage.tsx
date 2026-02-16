/**
 * Exercise page component.
 * 
 * Displays exercise content and handles exercise sessions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/router';

/**
 * Exercise page component.
 * Renders the current exercise and handles user interactions.
 */
export function ExercisePage() {
    const { themeId, areaId } = useParams<{ themeId: string; areaId?: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {t('exercise.title', 'Exercise')}
            </h1>

            {themeId && (
                <p className="text-gray-600 mb-2">
                    {t('exercise.theme', 'Theme')}: {themeId}
                </p>
            )}

            {areaId && (
                <p className="text-gray-600 mb-4">
                    {t('exercise.area', 'Area')}: {areaId}
                </p>
            )}

            <p className="text-gray-500 mb-8 text-center max-w-md">
                {t('exercise.placeholder', 'Exercise content will be rendered here.')}
            </p>

            <button
                onClick={() => navigate(ROUTES.HOME)}
                className="py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
                {t('common.backHome', 'Back to Home')}
            </button>
        </div>
    );
}
