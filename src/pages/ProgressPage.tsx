/**
 * Progress page component.
 * 
 * Displays user's learning progress with a graph showing progress over time
 * and a table showing results for each exercise.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/router';
import { useProfileStore, selectActiveProfile } from '@core/stores/profileStore';
import { getAllExerciseResults } from '@core/storage';
import { useThemes, useAreas } from '@core/config';
import type { ExerciseResult } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Daily progress data for the graph.
 */
interface DailyProgress {
    date: string;
    exercisesCompleted: number;
    starsEarned: number;
    correctAnswers: number;
}

/**
 * Aggregated exercise result for the table.
 */
interface ExerciseRow {
    id: string;
    exerciseId: string;
    themeName: string;
    areaName: string;
    level: number;
    correct: boolean;
    score: number;
    attempts: number;
    timeSpentSeconds: number;
    completedAt: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Progress page component.
 * Shows progress graph and exercise results table.
 */
export function ProgressPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const profile = useProfileStore(selectActiveProfile);
    const themes = useThemes();
    const areas = useAreas();

    const [results, setResults] = useState<ExerciseResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');

    // Load exercise results
    useEffect(() => {
        async function loadResults() {
            if (!profile) return;

            try {
                const allResults = await getAllExerciseResults();
                // Filter to current profile
                const profileResults = allResults.filter(
                    r => r.childProfileId === profile.id
                );
                setResults(profileResults);
            } catch (error) {
                console.error('Failed to load results:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadResults();
    }, [profile]);

    // Aggregate daily progress for graph
    const dailyProgress = useMemo(() => {
        const dayMap = new Map<string, DailyProgress>();

        // Initialize last 30 days
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            if (dateStr) {
                dayMap.set(dateStr, {
                    date: dateStr,
                    exercisesCompleted: 0,
                    starsEarned: 0,
                    correctAnswers: 0,
                });
            }
        }

        // Aggregate results by day
        for (const result of results) {
            const dateStr = result.completedAt.split('T')[0];
            if (!dateStr) continue;
            const dayData = dayMap.get(dateStr);
            if (dayData) {
                dayData.exercisesCompleted += 1;
                dayData.starsEarned += result.score;
                if (result.correct) {
                    dayData.correctAnswers += 1;
                }
            }
        }

        return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [results]);

    // Transform results for table
    const tableRows = useMemo(() => {
        return results
            .map(result => {
                const theme = themes.find(t => t.id === result.themeId);
                const area = areas.find(a => a.id === result.areaId);

                return {
                    id: result.id,
                    exerciseId: result.exerciseId,
                    themeName: theme?.name ?? result.themeId,
                    areaName: area?.name ?? result.areaId,
                    level: result.level,
                    correct: result.correct,
                    score: result.score,
                    attempts: result.attempts,
                    timeSpentSeconds: result.timeSpentSeconds,
                    completedAt: result.completedAt,
                };
            })
            .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    }, [results, themes, areas]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const totalExercises = results.length;
        const totalStars = results.reduce((sum, r) => sum + r.score, 0);
        const correctCount = results.filter(r => r.correct).length;
        const accuracy = totalExercises > 0
            ? Math.round((correctCount / totalExercises) * 100)
            : 0;
        const totalTime = results.reduce((sum, r) => sum + r.timeSpentSeconds, 0);

        return {
            totalExercises,
            totalStars,
            correctCount,
            accuracy,
            totalTime,
        };
    }, [results]);

    // Calculate max values for graph scaling
    const maxExercises = Math.max(...dailyProgress.map(d => d.exercisesCompleted), 1);

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <p className="text-gray-500">{t('progress.noProfile', 'Please create a profile to view progress.')}</p>
                <button
                    onClick={() => navigate(ROUTES.HOME)}
                    className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('common.backHome', 'Back to Home')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[80vh] p-4 max-w-4xl mx-auto" role="main">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('progress.title', 'Progress')}
                </h1>
                <button
                    onClick={() => navigate(ROUTES.HOME)}
                    className="py-2 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                    {t('common.backHome', 'Back to Home')}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.totalExercises}</div>
                    <div className="text-sm text-blue-600">{t('progress.totalExercises', 'Exercises')}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{stats.totalStars}</div>
                    <div className="text-sm text-yellow-600">{t('progress.totalStars', 'Stars')}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.accuracy}%</div>
                    <div className="text-sm text-green-600">{t('progress.accuracy', 'Accuracy')}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">{formatTime(stats.totalTime)}</div>
                    <div className="text-sm text-purple-600">{t('progress.timeSpent', 'Time')}</div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('graph')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'graph'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    aria-selected={activeTab === 'graph'}
                    role="tab"
                >
                    {t('progress.graphTab', 'Progress Graph')}
                </button>
                <button
                    onClick={() => setActiveTab('table')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'table'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    aria-selected={activeTab === 'table'}
                    role="tab"
                >
                    {t('progress.tableTab', 'Exercise Results')}
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">{t('common.loading', 'Loading...')}</div>
                </div>
            ) : activeTab === 'graph' ? (
                <ProgressGraph
                    data={dailyProgress}
                    maxExercises={maxExercises}
                />
            ) : (
                <ResultsTable rows={tableRows} />
            )}
        </div>
    );
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Progress graph component.
 * Shows a bar chart of exercises completed over time.
 */
function ProgressGraph({
    data,
    maxExercises,
}: {
    data: DailyProgress[];
    maxExercises: number;
}) {
    const { t } = useTranslation();

    if (data.every(d => d.exercisesCompleted === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="text-4xl mb-2">📊</span>
                <p>{t('progress.noData', 'No exercise data yet. Start practicing to see your progress!')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('progress.last30Days', 'Last 30 Days')}
            </h2>

            {/* Graph Container */}
            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Y-axis labels */}
                    <div className="flex">
                        <div className="w-12 flex flex-col justify-between h-32 text-xs text-gray-500 pr-2">
                            <span>{maxExercises}</span>
                            <span>{Math.round(maxExercises / 2)}</span>
                            <span>0</span>
                        </div>

                        {/* Bars */}
                        <div className="flex-1 flex items-end gap-1 h-32 border-l border-b border-gray-200 pl-2 pb-2">
                            {data.map((day, index) => {
                                const heightPercent = (day.exercisesCompleted / maxExercises) * 100;
                                const showLabel = index % 5 === 0; // Show every 5th date

                                return (
                                    <div
                                        key={day.date}
                                        className="flex-1 flex flex-col items-center"
                                        title={`${day.date}: ${day.exercisesCompleted} exercises, ${day.starsEarned} stars`}
                                    >
                                        <div
                                            className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                            style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                        />
                                        {showLabel && (
                                            <span className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-left">
                                                {formatDate(day.date)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span>{t('progress.exercisesCompleted', 'Exercises Completed')}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Results table component.
 * Shows detailed results for each exercise.
 */
function ResultsTable({ rows }: { rows: ExerciseRow[] }) {
    const { t } = useTranslation();

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="text-4xl mb-2">📝</span>
                <p>{t('progress.noResults', 'No exercise results yet. Complete some exercises to see your results!')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                                {t('progress.table.theme', 'Theme')}
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                                {t('progress.table.area', 'Area')}
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">
                                {t('progress.table.level', 'Level')}
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">
                                {t('progress.table.result', 'Result')}
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">
                                {t('progress.table.stars', 'Stars')}
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">
                                {t('progress.table.attempts', 'Attempts')}
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">
                                {t('progress.table.time', 'Time')}
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">
                                {t('progress.table.date', 'Date')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900">
                                    {row.themeName}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {row.areaName}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-900">
                                    {row.level}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${row.correct
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {row.correct ? '✓' : '✗'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-yellow-500">
                                        {'⭐'.repeat(row.score)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    {row.attempts}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                    {formatTime(row.timeSpentSeconds)}
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                    {formatDateTime(row.completedAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format seconds to a human-readable time string.
 */
function formatTime(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
}

/**
 * Format date string to a shorter format.
 */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Format datetime string to a readable format.
 */
function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
