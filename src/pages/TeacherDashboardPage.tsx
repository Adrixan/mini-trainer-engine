/**
 * Teacher dashboard page.
 * Shows aggregate statistics across all profiles.
 * Requires teacher authentication.
 * Version 0.2.0 - Enhanced with student progress, analytics, and class management.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@core/stores/appStore';
import { getAllProfiles, getAllExerciseResults, deleteAllResultsForProfile } from '@core/storage/db';
import { loadThemes, loadAreas } from '@core/config';
import type { UserProfile, ExerciseResult, ObservationAreaId, ThemeId } from '@/types';

interface AreaStat {
    areaId: ObservationAreaId;
    count: number;
    avgScore: number;
    accuracy: number;
}

interface ThemeStat {
    themeId: ThemeId;
    name: string;
    count: number;
    avgScore: number;
    accuracy: number;
    totalTime: number;
}

interface ProfileStat {
    profile: UserProfile;
    exerciseCount: number;
    avgScore: string;
    totalStars: number;
    accuracy: number;
    totalTime: number;
    lastActive: string;
}

interface ExerciseStat {
    exerciseId: string;
    attempts: number;
    correctCount: number;
    accuracy: number;
    avgTime: number;
    avgScore: number;
}

interface DailyProgress {
    date: string;
    exercises: number;
    avgScore: number;
    accuracy: number;
}

type TabId = 'summary' | 'students' | 'analytics';

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
    const [activeTab, setActiveTab] = useState<TabId>('summary');
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resettingProfileId, setResettingProfileId] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    // Load config
    const [themes] = useState(() => loadThemes());
    const [areas] = useState(() => loadAreas());

    // Redirect if not authenticated
    useEffect(() => {
        if (!teacherAuthenticated) {
            navigate('/teacher/pin');
        }
    }, [teacherAuthenticated, navigate]);

    // Load data
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

    const handleExportData = () => {
        const exportData = {
            exportDate: new Date().toISOString(),
            profiles: profiles.map(p => ({
                id: p.id,
                nickname: p.nickname,
                avatarId: p.avatarId,
                createdAt: p.createdAt,
                totalStars: p.totalStars,
                currentStreak: p.currentStreak,
                longestStreak: p.longestStreak,
                lastActiveDate: p.lastActiveDate,
            })),
            results: results.map(r => ({
                id: r.id,
                childProfileId: r.childProfileId,
                exerciseId: r.exerciseId,
                areaId: r.areaId,
                themeId: r.themeId,
                level: r.level,
                correct: r.correct,
                score: r.score,
                attempts: r.attempts,
                timeSpentSeconds: r.timeSpentSeconds,
                completedAt: r.completedAt,
            })),
            summary: {
                totalProfiles: profiles.length,
                totalExercises: results.length,
                avgStars: avgStars,
                avgAccuracy: avgAccuracy,
                avgTimeSpent: avgTime,
            },
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teacher-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleResetProgress = (profileId: string) => {
        setResettingProfileId(profileId);
        setShowResetModal(true);
    };

    const confirmReset = async () => {
        if (!resettingProfileId) return;
        setIsResetting(true);
        try {
            await deleteAllResultsForProfile(resettingProfileId);
            // Reload data
            const [p, r] = await Promise.all([getAllProfiles(), getAllExerciseResults()]);
            setProfiles(p);
            setResults(r);
            setShowResetModal(false);
            setResettingProfileId(null);
            if (selectedProfileId === resettingProfileId) {
                setSelectedProfileId(null);
            }
        } catch {
            // Handle error silently
        } finally {
            setIsResetting(false);
        }
    };

    // Get theme name from config
    const getThemeName = (themeId: ThemeId): string => {
        const theme = themes.find(th => th.id === themeId);
        return theme?.name || themeId;
    };

    // Get area name from config
    const getAreaName = (areaId: ObservationAreaId): string => {
        const area = areas.find(a => a.id === areaId);
        return area?.name || t(`areas.${areaId}`, areaId);
    };

    // Aggregate stats
    const totalExercises = results.length;
    const avgStars = totalExercises > 0
        ? (results.reduce((sum, r) => sum + r.score, 0) / totalExercises).toFixed(1)
        : '0';
    const avgTime = totalExercises > 0
        ? Math.round(results.reduce((sum, r) => sum + r.timeSpentSeconds, 0) / totalExercises)
        : 0;
    const avgAccuracy = totalExercises > 0
        ? Math.round((results.filter(r => r.correct).length / totalExercises) * 100)
        : 0;

    // Area IDs from config
    const areaIds: ObservationAreaId[] = areas.map(a => a.id);

    // Area stats
    const areaStats: AreaStat[] = useMemo(() => areaIds.map((areaId) => {
        const areaResults = results.filter((r) => r.areaId === areaId);
        const correctCount = areaResults.filter(r => r.correct).length;
        return {
            areaId,
            count: areaResults.length,
            avgScore: areaResults.length > 0
                ? areaResults.reduce((s, r) => s + r.score, 0) / areaResults.length
                : 0,
            accuracy: areaResults.length > 0
                ? (correctCount / areaResults.length) * 100
                : 0,
        };
    }).filter((s) => s.count > 0), [results, areaIds]);

    // Theme stats
    const themeStats: ThemeStat[] = useMemo(() => {
        const themeMap = new Map<ThemeId, ThemeStat>();
        results.forEach(r => {
            const existing = themeMap.get(r.themeId) || {
                themeId: r.themeId,
                name: getThemeName(r.themeId),
                count: 0,
                avgScore: 0,
                accuracy: 0,
                totalTime: 0,
            };
            existing.count++;
            existing.avgScore = (existing.avgScore * (existing.count - 1) + r.score) / existing.count;
            existing.totalTime += r.timeSpentSeconds;
            if (r.correct) {
                existing.accuracy = ((existing.accuracy / 100) * (existing.count - 1) + 1) / existing.count * 100;
            }
            themeMap.set(r.themeId, existing);
        });
        return Array.from(themeMap.values());
    }, [results]);

    // Per-profile stats
    const profileStats: ProfileStat[] = useMemo(() => profiles.map((p) => {
        const pResults = results.filter((r) => r.childProfileId === p.id);
        const correctCount = pResults.filter(r => r.correct).length;
        return {
            profile: p,
            exerciseCount: pResults.length,
            avgScore: pResults.length > 0
                ? (pResults.reduce((s, r) => s + r.score, 0) / pResults.length).toFixed(1)
                : '0',
            totalStars: p.totalStars,
            accuracy: pResults.length > 0
                ? Math.round((correctCount / pResults.length) * 100)
                : 0,
            totalTime: pResults.reduce((s, r) => s + r.timeSpentSeconds, 0),
            lastActive: p.lastActiveDate,
        };
    }), [profiles, results]);

    // Selected profile detail
    const selectedProfile = useMemo(() => {
        if (!selectedProfileId) return null;
        const profile = profiles.find(p => p.id === selectedProfileId);
        if (!profile) return null;
        const pResults = results.filter(r => r.childProfileId === selectedProfileId);

        // Group by theme
        const themeProgress = new Map<ThemeId, { count: number; correct: number; totalTime: number; avgScore: number }>();
        pResults.forEach(r => {
            const existing = themeProgress.get(r.themeId) || { count: 0, correct: 0, totalTime: 0, avgScore: 0 };
            existing.count++;
            existing.totalTime += r.timeSpentSeconds;
            existing.avgScore = (existing.avgScore * (existing.count - 1) + r.score) / existing.count;
            if (r.correct) existing.correct++;
            themeProgress.set(r.themeId, existing);
        });

        // Group by level
        const levelProgress = new Map<number, { count: number; correct: number }>();
        pResults.forEach(r => {
            const existing = levelProgress.get(r.level) || { count: 0, correct: 0 };
            existing.count++;
            if (r.correct) existing.correct++;
            levelProgress.set(r.level, existing);
        });

        return {
            profile,
            results: pResults,
            themeProgress: Array.from(themeProgress.entries()).map(([themeId, data]) => ({
                themeId,
                name: getThemeName(themeId),
                ...data,
                accuracy: data.count > 0 ? Math.round((data.correct / data.count) * 100) : 0,
            })),
            levelProgress: Array.from(levelProgress.entries()).map(([level, data]) => ({
                level,
                ...data,
                accuracy: data.count > 0 ? Math.round((data.correct / data.count) * 100) : 0,
            })),
            accuracy: pResults.length > 0 ? Math.round((pResults.filter(r => r.correct).length / pResults.length) * 100) : 0,
            totalTime: pResults.reduce((s, r) => s + r.timeSpentSeconds, 0),
        };
    }, [selectedProfileId, profiles, results]);

    // Exercise difficulty (most difficult)
    const difficultExercises: ExerciseStat[] = useMemo(() => {
        const exerciseMap = new Map<string, ExerciseStat>();
        results.forEach(r => {
            const existing = exerciseMap.get(r.exerciseId) || {
                exerciseId: r.exerciseId,
                attempts: 0,
                correctCount: 0,
                accuracy: 0,
                avgTime: 0,
                avgScore: 0,
            };
            existing.attempts++;
            if (r.correct) existing.correctCount++;
            existing.avgTime = (existing.avgTime * (existing.attempts - 1) + r.timeSpentSeconds) / existing.attempts;
            existing.avgScore = (existing.avgScore * (existing.attempts - 1) + r.score) / existing.attempts;
            existing.accuracy = (existing.correctCount / existing.attempts) * 100;
            exerciseMap.set(r.exerciseId, existing);
        });
        return Array.from(exerciseMap.values())
            .filter(e => e.attempts >= 2)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 10);
    }, [results]);

    // Progress over time (last 30 days)
    const dailyProgress: DailyProgress[] = useMemo(() => {
        const dayMap = new Map<string, DailyProgress>();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0] ?? '';
        results.forEach(r => {
            const dateParts = r.completedAt.split('T');
            const dateStr = dateParts[0];
            if (!dateStr || dateStr < thirtyDaysAgoStr) return;

            const existing = dayMap.get(dateStr) || { date: dateStr, exercises: 0, avgScore: 0, accuracy: 0 };
            existing.exercises++;
            existing.avgScore = (existing.avgScore * (existing.exercises - 1) + r.score) / existing.exercises;
            if (r.correct) {
                existing.accuracy = ((existing.accuracy / 100) * (existing.exercises - 1) + 1) / existing.exercises * 100;
            }
            dayMap.set(dateStr, existing);
        });

        return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [results]);

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 pt-8 text-center animate-fadeIn">
                <div className="text-4xl mb-4 animate-pulse">📊</div>
                <p className="text-gray-500 font-medium">{t('common.loading', 'Loading...')}</p>
            </div>
        );
    }

    const tabs: { id: TabId; label: string }[] = [
        { id: 'summary', label: t('teacher.tabSummary', 'Summary') },
        { id: 'students', label: t('teacher.tabStudents', 'Students') },
        { id: 'analytics', label: t('teacher.tabAnalytics', 'Analytics') },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 animate-fadeIn">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-extrabold text-gray-800">
                    {t('teacher.dashboardTitle', 'Teacher Dashboard')}
                </h1>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-red-600 font-semibold transition-colors"
                >
                    {t('teacher.logout', 'Logout')} →
                </button>
            </header>

            {/* Tabs */}
            <nav className="flex border-b border-gray-200 mb-6" role="tablist" aria-label={t('teacher.dashboardSections', 'Dashboard sections')}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`panel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <div role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
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
                            <div className="text-2xl mb-1">🎯</div>
                            <div className="text-2xl font-bold text-green-600">{avgAccuracy}%</div>
                            <div className="text-xs text-gray-600">{t('teacher.accuracy', 'Accuracy')}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4 text-center">
                            <div className="text-2xl mb-1">⏱️</div>
                            <div className="text-2xl font-bold text-orange-600">{avgTime}s</div>
                            <div className="text-xs text-gray-600">{t('teacher.averageTime', 'Avg Time')}</div>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white rounded-xl shadow p-4 text-center">
                            <div className="text-2xl mb-1">⭐</div>
                            <div className="text-2xl font-bold text-yellow-600">{avgStars}</div>
                            <div className="text-xs text-gray-600">{t('teacher.averageStars', 'Avg Stars')}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4 text-center">
                            <div className="text-2xl mb-1">📅</div>
                            <div className="text-2xl font-bold text-indigo-600">{dailyProgress.length}</div>
                            <div className="text-xs text-gray-600">{t('teacher.activeDays', 'Active Days')}</div>
                        </div>
                    </div>

                    {/* Export button */}
                    <button
                        onClick={handleExportData}
                        disabled={profiles.length === 0}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm mb-6"
                    >
                        {t('teacher.exportData', 'Export Class Data')}
                    </button>

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
                                                <span className="text-sm font-semibold text-gray-700 truncate pr-2">
                                                    {getAreaName(as.areaId)}
                                                </span>
                                                <div className="flex gap-3 text-xs text-gray-600 whitespace-nowrap">
                                                    <span>{as.count} {t('teacher.exercises', 'ex.')}</span>
                                                    <span>{t('teacher.accuracyShort', 'Acc:')}{Math.round(as.accuracy)}%</span>
                                                </div>
                                            </div>
                                            <div
                                                className="h-2 bg-gray-100 rounded-full overflow-hidden"
                                                role="progressbar"
                                                aria-valuenow={Math.round(pct)}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-label={`${getAreaName(as.areaId)}: ${Math.round(as.accuracy)}% accuracy`}
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

                    {/* Recent activity */}
                    {dailyProgress.length > 0 && (
                        <section className="mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-3">
                                {t('teacher.recentActivity', 'Recent Activity (30 days)')}
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm p-3">
                                <div className="flex items-end gap-1 h-24">
                                    {dailyProgress.slice(-14).map((day) => {
                                        const maxExercises = Math.max(...dailyProgress.slice(-14).map(d => d.exercises));
                                        const height = maxExercises > 0 ? (day.exercises / maxExercises) * 100 : 0;
                                        return (
                                            <div
                                                key={day.date}
                                                className="flex-1 flex flex-col items-center"
                                                title={`${day.date}: ${day.exercises} exercises, ${Math.round(day.accuracy)}% accuracy`}
                                            >
                                                <div
                                                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                                    style={{ height: `${Math.max(height, 4)}%` }}
                                                    role="img"
                                                    aria-label={`${day.date}: ${day.exercises} exercises`}
                                                />
                                                <span className="text-[8px] text-gray-400 mt-1 transform -rotate-45 origin-left">
                                                    {day.date.slice(5)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div role="tabpanel" id="panel-students" aria-labelledby="tab-students">
                    {profileStats.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">{t('teacher.noProfiles', 'No profiles yet')}</p>
                    ) : (
                        <div className="space-y-3">
                            {profileStats.map((ps) => (
                                <div
                                    key={ps.profile.id}
                                    className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setSelectedProfileId(ps.profile.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedProfileId(ps.profile.id); }}
                                    aria-label={`${ps.profile.nickname}: ${ps.exerciseCount} exercises, ${ps.accuracy}% accuracy`}
                                >
                                    <span className="text-4xl">{ps.profile.avatarId}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-800 truncate">{ps.profile.nickname}</div>
                                        <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                                            <span>{ps.exerciseCount} {t('teacher.exercises', 'ex.')}</span>
                                            <span>·</span>
                                            <span>{t('teacher.accuracyShort', 'Acc:')}{ps.accuracy}%</span>
                                            <span>·</span>
                                            <span>⭐ {ps.totalStars}</span>
                                            {ps.totalTime > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <span>⏱ {Math.round(ps.totalTime / 60)}m</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            🔥 {ps.profile.currentStreak} {t('teacher.streak', 'streak')} · {t('teacher.lastActive', 'Last:')} {ps.lastActive}
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics">
                    {/* Theme performance */}
                    {themeStats.length > 0 && (
                        <section className="mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-3">
                                {t('teacher.themePerformance', 'Theme Performance')}
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm" role="table" aria-label={t('teacher.themePerformance', 'Theme performance')}>
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-semibold text-gray-600">{t('teacher.theme', 'Theme')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.exercises', 'Ex.')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.accuracy', 'Accuracy')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.time', 'Time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {themeStats.map(ts => (
                                            <tr key={ts.themeId} className="border-t border-gray-100">
                                                <td className="px-4 py-2 font-medium text-gray-700">{ts.name}</td>
                                                <td className="text-right px-4 py-2 text-gray-600">{ts.count}</td>
                                                <td className="text-right px-4 py-2">
                                                    <span className={`font-medium ${ts.accuracy >= 70 ? 'text-green-600' : ts.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {Math.round(ts.accuracy)}%
                                                    </span>
                                                </td>
                                                <td className="text-right px-4 py-2 text-gray-600">{Math.round(ts.totalTime / 60)}m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Most difficult exercises */}
                    {difficultExercises.length > 0 && (
                        <section className="mb-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-3">
                                {t('teacher.difficultExercises', 'Most Difficult Exercises')}
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-sm" role="table" aria-label={t('teacher.difficultExercises', 'Difficult exercises')}>
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-semibold text-gray-600">{t('teacher.exercise', 'Exercise')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.attempts', 'Attempts')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.accuracy', 'Accuracy')}</th>
                                            <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('teacher.avgTime', 'Avg Time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {difficultExercises.map(es => (
                                            <tr key={es.exerciseId} className="border-t border-gray-100">
                                                <td className="px-4 py-2 font-medium text-gray-700 font-mono text-xs">{es.exerciseId}</td>
                                                <td className="text-right px-4 py-2 text-gray-600">{es.attempts}</td>
                                                <td className="text-right px-4 py-2">
                                                    <span className={`font-medium ${es.accuracy >= 70 ? 'text-green-600' : es.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {Math.round(es.accuracy)}%
                                                    </span>
                                                </td>
                                                <td className="text-right px-4 py-2 text-gray-600">{Math.round(es.avgTime)}s</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {difficultExercises.length === 0 && themeStats.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">
                            {t('teacher.noAnalyticsData', 'No data available for analytics yet')}
                        </p>
                    )}
                </div>
            )}

            {/* Student Detail Modal */}
            {selectedProfile && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="student-detail-title"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedProfileId(null); }}
                >
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fadeIn">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{selectedProfile.profile.avatarId}</span>
                                    <div>
                                        <h2 id="student-detail-title" className="text-xl font-bold text-gray-800">
                                            {selectedProfile.profile.nickname}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            {t('teacher.memberSince', 'Member since')} {selectedProfile.profile.createdAt.split('T')[0]}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedProfileId(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                    aria-label={t('common.close', 'Close')}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Quick stats */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <div className="text-xl font-bold text-blue-600">{selectedProfile.results.length}</div>
                                    <div className="text-xs text-gray-600">{t('teacher.exercises', 'Exercises')}</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <div className="text-xl font-bold text-green-600">{selectedProfile.accuracy}%</div>
                                    <div className="text-xs text-gray-600">{t('teacher.accuracy', 'Accuracy')}</div>
                                </div>
                                <div className="bg-orange-50 rounded-xl p-3 text-center">
                                    <div className="text-xl font-bold text-orange-600">{Math.round(selectedProfile.totalTime / 60)}m</div>
                                    <div className="text-xs text-gray-600">{t('teacher.totalTime', 'Total Time')}</div>
                                </div>
                            </div>

                            {/* Theme progress */}
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('teacher.themeProgress', 'Theme Progress')}</h3>
                            {selectedProfile.themeProgress.length > 0 ? (
                                <div className="space-y-2 mb-6">
                                    {selectedProfile.themeProgress.map(tp => (
                                        <div key={tp.themeId} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">{tp.name}</span>
                                                <span className="text-xs text-gray-600">{tp.count} ex. · {tp.accuracy}% {t('teacher.accuracy', 'accuracy')}</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${tp.accuracy >= 70 ? 'bg-green-500' : tp.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${tp.accuracy}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 mb-6">{t('teacher.noExercises', 'No exercises completed yet')}</p>
                            )}

                            {/* Level progress */}
                            {selectedProfile.levelProgress.length > 0 && (
                                <>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('teacher.levelProgress', 'Level Progress')}</h3>
                                    <div className="flex gap-2 mb-6">
                                        {selectedProfile.levelProgress.map(lp => (
                                            <div
                                                key={lp.level}
                                                className="flex-1 bg-gray-50 rounded-lg p-2 text-center"
                                            >
                                                <div className="text-lg font-bold text-gray-700">L{lp.level}</div>
                                                <div className="text-xs text-gray-600">{lp.count} ex.</div>
                                                <div className={`text-xs font-medium ${lp.accuracy >= 70 ? 'text-green-600' : lp.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {lp.accuracy}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleResetProgress(selectedProfile.profile.id)}
                                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors text-sm"
                                >
                                    {t('teacher.resetProgress', 'Reset Progress')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="reset-title"
                    aria-describedby="reset-description"
                    onClick={(e) => { if (e.target === e.currentTarget && !isResetting) setShowResetModal(false); }}
                >
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-fadeIn">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">⚠️</div>
                            <h2 id="reset-title" className="text-xl font-bold text-gray-800">
                                {t('teacher.resetConfirmTitle', 'Reset Progress?')}
                            </h2>
                            <p id="reset-description" className="text-sm text-gray-600 mt-2">
                                {t('teacher.resetConfirmMessage', 'This will permanently delete all exercise results for this student. This action cannot be undone.')}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                disabled={isResetting}
                                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={confirmReset}
                                disabled={isResetting}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                            >
                                {isResetting ? t('common.loading', 'Loading...') : t('common.confirm', 'Confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back to child mode */}
            <button
                onClick={handleLogout}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm mt-6"
            >
                ← {t('teacher.backToChild', 'Back to Student Mode')}
            </button>
        </div>
    );
}
