/**
 * Teacher PIN gate page.
 * Protects the teacher dashboard with PIN authentication.
 * If no PIN is set, prompts the user to create one.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@core/stores/appStore';

/**
 * Teacher PIN page component.
 * Handles PIN setup and login for teacher area access.
 */
export function TeacherPinPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { settings, setTeacherPin, verifyPin } = useAppStore();
    const hasPin = !!settings.teacherPin;

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const isSetupMode = !hasPin;

    const handleLogin = () => {
        if (verifyPin(pin)) {
            navigate('/teacher/dashboard');
        } else {
            setError(t('teacher.pinInvalid', 'Invalid PIN'));
            setPin('');
        }
    };

    const handleSetup = () => {
        if (pin.length < 4) {
            setError(t('teacher.pinTooShort', 'PIN must be at least 4 digits'));
            return;
        }
        if (pin !== confirmPin) {
            setError(t('teacher.pinMismatch', 'PINs do not match'));
            return;
        }
        setTeacherPin(pin);
        // Auto-login after setup
        verifyPin(pin);
        navigate('/teacher/dashboard');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (isSetupMode) handleSetup();
            else handleLogin();
        }
    };

    // Setup mode — create a new PIN
    if (isSetupMode) {
        return (
            <div className="max-w-sm mx-auto px-4 pt-12 animate-fadeIn">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-3">🔐</div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
                        {t('teacher.pinSetup', 'Set Teacher PIN')}
                    </h1>
                    <p className="text-sm text-gray-600">
                        {t('teacher.pinSetupHint', 'Create a PIN to protect the teacher area')}
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('teacher.pinPlaceholder', 'Enter PIN')}
                        aria-label={t('teacher.pinPlaceholder', 'Enter PIN')}
                        className="w-full px-4 py-3 text-lg text-center tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        maxLength={8}
                        autoFocus
                    />
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={confirmPin}
                        onChange={(e) => { setConfirmPin(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('teacher.pinConfirm', 'Confirm PIN')}
                        aria-label={t('teacher.pinConfirm', 'Confirm PIN')}
                        className="w-full px-4 py-3 text-lg text-center tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        maxLength={8}
                    />

                    {error && (
                        <p className="text-sm text-red-600 text-center font-semibold" role="alert">{error}</p>
                    )}

                    <button
                        onClick={handleSetup}
                        disabled={pin.length < 4 || pin !== confirmPin}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('teacher.pinSetup', 'Set PIN')}
                    </button>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    ← {t('app.back', 'Back')}
                </button>
            </div>
        );
    }

    // Login mode — enter existing PIN
    return (
        <div className="max-w-sm mx-auto px-4 pt-12 animate-fadeIn">
            <div className="text-center mb-8">
                <div className="text-5xl mb-3">🔐</div>
                <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
                    {t('teacher.pinTitle', 'Teacher Login')}
                </h1>
                <p className="text-sm text-gray-600">
                    {t('teacher.pinSubtitle', 'Enter your PIN to access the teacher area')}
                </p>
            </div>

            <div className="space-y-4">
                <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder={t('teacher.pinPlaceholder', 'Enter PIN')}
                    aria-label={t('teacher.pinPlaceholder', 'Enter PIN')}
                    className="w-full px-4 py-3 text-lg text-center tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    maxLength={8}
                    autoFocus
                />

                {error && (
                    <p className="text-sm text-red-600 text-center font-semibold" role="alert">{error}</p>
                )}

                <button
                    onClick={handleLogin}
                    disabled={pin.length < 4}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {t('teacher.pinSubmit', 'Login')}
                </button>
            </div>

            <button
                onClick={() => navigate('/')}
                className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
                ← {t('app.back', 'Back')}
            </button>
        </div>
    );
}
