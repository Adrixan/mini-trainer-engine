import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { MultipleChoiceContent } from '@/types/exercise';

interface Props {
    content: MultipleChoiceContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

/**
 * Multiple choice exercise: select one correct answer from options.
 * Supports keyboard navigation and screen readers.
 */
export function MultipleChoiceExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        if (showSolution) return;
        setSelected(index);
    };

    const handleCheck = () => {
        if (selected === null) return;
        onSubmit(selected === content.correctIndex);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (showSolution) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                handleSelect(index);
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                if (index < content.options.length - 1) {
                    const nextButton = document.getElementById(`option-${index + 1}`);
                    nextButton?.focus();
                }
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                if (index > 0) {
                    const prevButton = document.getElementById(`option-${index - 1}`);
                    prevButton?.focus();
                }
                break;
        }
    };

    return (
        <div className="space-y-4">
            {/* Question */}
            <div
                className="bg-white rounded-xl shadow-sm p-4"
                role="region"
                aria-label={t('exercises.multipleChoice.question')}
            >
                <p className="text-lg font-bold text-gray-800">{content.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2" role="radiogroup" aria-label={t('exercises.multipleChoice.options')}>
                {content.options.map((option, idx) => {
                    const isSelected = selected === idx;
                    const isCorrect = idx === content.correctIndex;

                    let style = 'bg-white border-2 border-gray-200 text-gray-700';
                    if (showSolution) {
                        if (isCorrect) {
                            style = 'bg-green-50 border-2 border-green-400 text-green-800';
                        } else if (isSelected && !isCorrect) {
                            style = 'bg-red-50 border-2 border-red-400 text-red-700';
                        } else {
                            style = 'bg-gray-50 border-2 border-gray-200 text-gray-400';
                        }
                    } else if (isSelected) {
                        style = 'bg-primary/10 border-2 border-primary text-primary';
                    }

                    return (
                        <button
                            key={idx}
                            id={`option-${idx}`}
                            onClick={() => handleSelect(idx)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            disabled={showSolution}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${String.fromCharCode(65 + idx)}: ${option}`}
                            className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${style} ${showSolution ? 'cursor-default' : 'hover:border-primary/50'}`}
                        >
                            <span className="inline-flex items-center gap-3">
                                <span
                                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold"
                                    aria-hidden="true"
                                >
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span>{option}</span>
                                {showSolution && isCorrect && (
                                    <span className="ml-auto" aria-label={t('exercises.correct')}>✓</span>
                                )}
                                {showSolution && isSelected && !isCorrect && (
                                    <span className="ml-auto" aria-label={t('exercises.incorrect')}>✗</span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Hints */}
            {hints && hints.length > 0 && !showSolution && (
                <HintButton hints={hints} />
            )}

            {/* Check button */}
            {!showSolution && (
                <button
                    onClick={handleCheck}
                    disabled={selected === null}
                    className="w-full py-3 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                >
                    {t('exercises.check')}
                </button>
            )}
        </div>
    );
}
