import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { SentenceBuilderContent } from '@/types/exercise';

interface Props {
    content: SentenceBuilderContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

/**
 * Sentence builder exercise: construct sentences from word columns.
 * Users select one word from each column to build a valid sentence.
 */
export function SentenceBuilderExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();
    const [selections, setSelections] = useState<(string | null)[]>(
        content.columns.map(() => null),
    );

    const builtSentence = selections.filter(Boolean).join(' ');
    const allSelected = selections.every((s) => s !== null);

    const handleSelectWord = (colIndex: number, word: string) => {
        if (showSolution) return;
        const next = [...selections];
        next[colIndex] = selections[colIndex] === word ? null : word;
        setSelections(next);
    };

    const handleCheck = () => {
        if (!allSelected) return;
        const sentence = selections.join(' ').trim();
        const isCorrect = content.targetSentences.some(
            (target) => target.toLowerCase() === sentence.toLowerCase(),
        );
        onSubmit(isCorrect);
    };

    return (
        <div className="space-y-4">
            {/* Instruction */}
            <p className="text-sm font-semibold text-gray-600" id="sentence-builder-instruction">
                {t('exercises.sentenceBuilder.instruction')}
            </p>

            {/* Column word selectors */}
            <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${content.columns.length}, 1fr)` }}
                role="group"
                aria-labelledby="sentence-builder-instruction"
            >
                {content.columns.map((col, colIdx) => (
                    <div key={col.label} className="space-y-1">
                        <div className="text-xs font-bold text-gray-600 uppercase text-center">
                            {col.label}
                        </div>
                        <div className="space-y-1" role="radiogroup" aria-label={col.label}>
                            {col.words.map((word) => {
                                const isSelected = selections[colIdx] === word;
                                return (
                                    <button
                                        key={word}
                                        onClick={() => handleSelectWord(colIdx, word)}
                                        disabled={showSolution}
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={word}
                                        className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isSelected
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary hover:bg-primary/5'
                                            } ${showSolution ? 'cursor-default' : ''}`}
                                    >
                                        {word}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Built sentence preview */}
            <div className="bg-gray-50 rounded-xl p-4 min-h-[56px]">
                <div className="text-xs text-gray-600 mb-1">
                    {t('exercises.sentenceBuilder.yourSentence')}
                </div>
                <div
                    className="text-lg font-bold text-gray-800"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {builtSentence || (
                        <span className="text-gray-300 italic">
                            {t('exercises.sentenceBuilder.selectWord')}
                        </span>
                    )}
                </div>
            </div>

            {/* Solution display */}
            {showSolution && (
                <div
                    className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fadeIn"
                    role="status"
                    aria-live="polite"
                >
                    <div className="text-xs text-green-600 font-semibold mb-1">
                        {t('exercises.solved')}
                    </div>
                    {content.targetSentences.map((sentence, idx) => (
                        <div key={idx} className="text-lg font-bold text-green-800">
                            {sentence}
                        </div>
                    ))}
                </div>
            )}

            {/* Hints */}
            {hints && hints.length > 0 && !showSolution && (
                <HintButton hints={hints} />
            )}

            {/* Check button */}
            {!showSolution && (
                <button
                    onClick={handleCheck}
                    disabled={!allSelected}
                    className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                    {t('exercises.check')}
                </button>
            )}
        </div>
    );
}
