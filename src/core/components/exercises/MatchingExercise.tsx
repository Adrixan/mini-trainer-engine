import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { MatchingContent } from '@/types/exercise';

interface Props {
    content: MatchingContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

/** Fisher–Yates shuffle (deterministic order per mount via useMemo) */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
}

/**
 * Matching exercise: match items from left column to right column.
 * Supports tap-to-select and keyboard navigation.
 */
export function MatchingExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();

    // Shuffle the right-hand side once on mount
    const shuffledRight = useMemo(
        () => shuffle(content.pairs.map((p) => p.right)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [matches, setMatches] = useState<Record<number, string>>({});

    const handleLeftClick = (idx: number) => {
        if (showSolution) return;

        // If this left item already has a match, unmatch it (tap to undo)
        if (matches[idx] != null) {
            setMatches((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
            });
            setSelectedLeft(null);
            return;
        }

        // Otherwise toggle selection
        setSelectedLeft(selectedLeft === idx ? null : idx);
    };

    const handleRightClick = (rightValue: string) => {
        if (showSolution || selectedLeft === null) return;
        setMatches((prev) => ({ ...prev, [selectedLeft]: rightValue }));
        setSelectedLeft(null);
    };

    const handleReset = () => {
        setMatches({});
        setSelectedLeft(null);
    };

    const allMatched = Object.keys(matches).length === content.pairs.length;
    const hasAnyMatch = Object.keys(matches).length > 0;

    const handleCheck = () => {
        if (!allMatched) return;
        const allCorrect = content.pairs.every(
            (pair, idx) => matches[idx] === pair.right,
        );
        onSubmit(allCorrect);
    };

    const rightUsed = new Set(Object.values(matches));

    return (
        <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-600" id="matching-instruction">
                {t('exercises.matching.instruction')}
            </p>

            <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="matching-instruction">
                {/* Left column */}
                <div className="space-y-2">
                    {content.pairs.map((pair, idx) => {
                        const isSelected = selectedLeft === idx;
                        const matchedValue = matches[idx];
                        const isCorrect = showSolution && matchedValue === pair.right;
                        const isWrong = showSolution && matchedValue != null && matchedValue !== pair.right;

                        let style = 'bg-white border-2 border-gray-200';
                        if (isSelected) style = 'bg-primary/10 border-2 border-primary';
                        if (matchedValue && !showSolution) style = 'bg-primary/5 border-2 border-primary/40';
                        if (isCorrect) style = 'bg-green-50 border-2 border-green-400';
                        if (isWrong) style = 'bg-red-50 border-2 border-red-400';

                        return (
                            <button
                                key={idx}
                                onClick={() => handleLeftClick(idx)}
                                disabled={showSolution}
                                aria-pressed={isSelected}
                                aria-label={`${pair.left}${matchedValue ? `, matched with ${matchedValue}` : ''}`}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${style}`}
                            >
                                <span className="text-gray-800">{pair.left}</span>
                                {matchedValue && !showSolution && (
                                    <span className="flex items-center gap-1 text-xs mt-0.5 text-primary/60">
                                        <span>→ {matchedValue}</span>
                                        <span
                                            className="ml-auto bg-gray-200 text-gray-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
                                            aria-hidden="true"
                                        >
                                            ✕
                                        </span>
                                    </span>
                                )}
                                {matchedValue && showSolution && (
                                    <span className="block text-xs mt-0.5 text-gray-400">
                                        → {matchedValue}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right column (shuffled) */}
                <div className="space-y-2">
                    {shuffledRight.map((rightValue, rIdx) => {
                        const used = rightUsed.has(rightValue);

                        let style = 'bg-white border-2 border-gray-200';
                        if (used && !showSolution) style = 'bg-gray-100 border-2 border-gray-200 opacity-50';
                        if (showSolution) {
                            const matchEntries = Object.entries(matches);
                            const matchedIdx = matchEntries.find(([, v]) => v === rightValue);
                            if (matchedIdx) {
                                const idx = Number(matchedIdx[0]);
                                const correct = content.pairs[idx]?.right === rightValue;
                                style = correct
                                    ? 'bg-green-50 border-2 border-green-400'
                                    : 'bg-red-50 border-2 border-red-400';
                            }
                        }

                        return (
                            <button
                                key={`right-${rIdx}`}
                                onClick={() => handleRightClick(rightValue)}
                                disabled={showSolution || used}
                                aria-disabled={used && !showSolution}
                                aria-label={rightValue}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${style}`}
                            >
                                {rightValue}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Show correct answers on solution */}
            {showSolution && (
                <div
                    className="bg-green-50 border border-green-200 rounded-xl p-3 animate-fadeIn"
                    role="status"
                    aria-live="polite"
                >
                    <div className="text-xs text-green-600 font-semibold mb-1">
                        {t('exercises.matching.solution')}
                    </div>
                    {content.pairs.map((pair, idx) => (
                        <div key={idx} className="text-sm text-green-800 font-semibold">
                            {pair.left} → {pair.right}
                        </div>
                    ))}
                </div>
            )}

            {/* Hints */}
            {hints && hints.length > 0 && !showSolution && (
                <HintButton hints={hints} />
            )}

            {/* Reset + Check buttons */}
            {!showSolution && (
                <div className="flex gap-2">
                    {hasAnyMatch && (
                        <button
                            onClick={handleReset}
                            className="py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                            {t('exercises.reset')}
                        </button>
                    )}
                    <button
                        onClick={handleCheck}
                        disabled={!allMatched}
                        className="flex-1 py-3 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                    >
                        {t('exercises.check')}
                    </button>
                </div>
            )}
        </div>
    );
}
