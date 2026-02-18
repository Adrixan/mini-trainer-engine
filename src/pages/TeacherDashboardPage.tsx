/**
 * Teacher dashboard page.
 * Shows aggregate statistics across all profiles.
 * Requires teacher authentication.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@core/stores/appStore';
import { getAllProfiles, getAllExerciseResults } from '@core/storage/db';
import type { UserProfile, ExerciseResult, ObservationAreaId } from '@/types';

interface AreaStat {
    areaId: ObservationAreaId;
    count: number;
    avgScore: number;
}

interface ProfileStat {
    profile: UserProfile;
    exerciseCount: number;
    avgScore: string;
    totalStars: number;
}

/**
 * Teacher dashboard page component.
 * Displays aggregate statistics for all profiles.
 */
export function TeacherDashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logoutTeacher, teacherAuthenticated } = useAppStore();

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [results, setResults] = useState<ExerciseResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (!teacherAuthenticated) {
            navigate('/teacher/pin');
        }
    }, [teacherAuthenticated, navigate]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [p, r] = await Promise.all([getAllProfiles(), getAllExerciseResults()]);
                if (!cancelled) {
                    setProfiles(p);
                    setResults(r);
                }
            } catch {
                // IndexedDB might not be available
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, []);

    const handleLogout = () => {
        logoutTeacher();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-8 text-center animate-fadeIn">
                <div className="text-4xl mb-4 animate-pulse">📊</div>
                <p className="text-gray-500 font-medium">{t('common.loading', 'Loading...')}</p>
            </div>
        );
    }

    // Aggregate stats
    const totalExercises = results.length;
    const avgStars = totalExercises > 0
        ? (results.reduce((sum, r) => sum + r.score, 0) / totalExercises).toFixed(1)
        : '0';
    const avgTime = totalExercises > 0
        ? Math.round(results.reduce((sum, r) => sum + r.timeSpentSeconds, 0) / totalExercises)
        : 0;

    // Per-area stats
    const areaIds: ObservationAreaId[] = [
        'woerter-und-saetze',
        'klaenge-und-silben',
        'kommunikation',
        'textkompetenz',
        'sprachbetrachtung',
        'rechtschreibung',
    ];

    const areaStats: AreaStat[] = areaIds.map((areaId) => {
        const areaResults = results.filter((r) => r.areaId === areaId);
        return {
            areaId,
            count: areaResults.length,
            avgScore: areaResults.length > 0
                ? areaResults.reduce((s, r) => s + r.score, 0) / areaResults.length
                : 0,
        };
    }).filter((s) => s.count > 0);

    // Per-profile stats
    const profileStats: ProfileStat[] = profiles.map((p) => {
        const pResults = results.filter((r) => r.childProfileId === p.id);
        return {
            profile: p,
            exerciseCount: pResults.length,
            avgScore: pResults.length > 0
                ? (pResults.reduce((s, r) => s + r.score, 0) / pResults.length).toFixed(1)
                : '0',
            totalStars: p.totalStars,
        };
    });

    // Area name mapping
    const getAreaName = (areaId: ObservationAreaId): string => {
        const areaNames: Record<ObservationAreaId, string> = {
            'woerter-und-saetze': t('areas.woerter-und-saetze', 'Wörter und Sätze'),
            'klaenge-und-silben': t('areas.klaenge-und-silben', 'Klänge und Silben'),
            'kommunikation': t('areas.kommunikation', 'Kommunikation'),
            'textkompetenz': t('areas.textkompetenz', 'Textkompetenz'),
            'sprachbetrachtung': t('areas.sprachbetrachtung', 'Sprachbetrachtung'),
            'rechtschreibung': t('areas.rechtschreibung', 'Rechtschreibung'),
        };
        return areaNames[areaId] ?? areaId;
    };

    return (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-extrabold text-gray-800">
                    {t('teacher.dashboardTitle', 'Teacher Dashboard')}
                </h1>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-red-600 font-semibold transition-colors"
                >
                    {t('teacher.logout', 'Logout')} →
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="text-2xl font-bold text-blue-600">{profiles.length}</div>
                    <div className="text-xs text-gray-600">{t('teacher.totalProfiles', 'Profiles')}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <div className="text-2xl mb-1">📝</div>
                    <div className="text-2xl font-bold text-purple-600">{totalExercises}</div>
                    <div className="text-xs text-gray-600">{t('teacher.totalExercises', 'Exercises')}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="text-2xl font-bold text-yellow-600">{avgStars}</div>
                    <div className="text-xs text-gray-600">{t('teacher.averageStars', 'Avg Stars')}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <div className="text-2xl mb-1">⏱️</div>
                    <div className="text-2xl font-bold text-green-600">{avgTime}s</div>
                    <div className="text-xs text-gray-600">{t('teacher.averageTime', 'Avg Time')}</div>
                </div>
            </div>

            {/* Profile overview */}
            <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-700 mb-3">
                    {t('teacher.profileOverview', 'Profile Overview')}
                </h2>
                {profileStats.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('teacher.noProfiles', 'No profiles yet')}</p>
                ) : (
                    <div className="space-y-2">
                        {profileStats.map((ps) => (
                            <div key={ps.profile.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                                <span className="text-3xl">{ps.profile.avatarId}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 truncate">{ps.profile.nickname}</div>
                                    <div className="text-xs text-gray-600">
                                        {t('teacher.exercisesCount', { count: ps.exerciseCount, defaultValue: `${ps.exerciseCount} exercises` })} · {t('teacher.avgScore', { score: ps.avgScore, defaultValue: `⌀ ${ps.avgScore}` })} · {ps.totalStars} ⭐
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                    🔥 {ps.profile.currentStreak}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Area breakdown */}
            {areaStats.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-gray-700 mb-3">
                        {t('teacher.areaBreakdown', 'Area Breakdown')}
                    </h2>
                    <div className="space-y-2">
                        {areaStats.map((as) => {
                            const pct = (as.avgScore / 3) * 100;
                            return (
                                <div key={as.areaId} className="bg-white rounded-xl shadow-sm p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-gray-600 truncate pr-2">
                                            {getAreaName(as.areaId)}
                                        </span>
                                        <span className="text-xs text-gray-600 whitespace-nowrap">
                                            {t('teacher.exercisesCount', { count: as.count, defaultValue: `${as.count} exercises` })} · {t('teacher.avgScore', { score: as.avgScore.toFixed(1), defaultValue: `⌀ ${as.avgScore.toFixed(1)}` })}
                                        </span>
                                    </div>
                                    <div
                                        className="h-2 bg-gray-100 rounded-full overflow-hidden"
                                        role="progressbar"
                                        aria-valuenow={Math.round(pct)}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={getAreaName(as.areaId)}
                                    >
                                        <div
                                            className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Back to child mode */}
            <button
                onClick={handleLogout}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
            >
                ← {t('teacher.backToChild', 'Back to Student Mode')}
            </button>
        </div>
    );
}
