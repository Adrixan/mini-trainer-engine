/**
 * Settings page component.
 * 
 * Displays and manages application settings including
 * accessibility options.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/router';
import { AccessibilitySettings } from '@core/components/accessibility';

/**
 * Settings page component.
 * Allows users to configure app preferences including accessibility settings.
 */
export function SettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div
            className="flex flex-col items-center min-h-[80vh] p-4"
            role="main"
            id="main-content"
            aria-labelledby="settings-page-title"
        >
            <h1
                id="settings-page-title"
                className="text-2xl font-bold text-gray-900 mb-6"
            >
                {t('settings.title', 'Settings')}
            </h1>

            <div className="w-full max-w-2xl space-y-6">
                {/* Accessibility Settings */}
                <AccessibilitySettings />

                {/* Navigation */}
                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        {t('common.backHome', 'Back to Home')}
                    </button>
                </div>
            </div>
        </div>
    );
}
