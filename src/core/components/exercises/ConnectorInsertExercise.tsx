import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { ConnectorInsertContent } from '@/types/exercise';

interface Props {
    content: ConnectorInsertContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

/**
 * Connector-insert exercise: select the correct conjunction
 * or connector word to join two sentence halves.
 */
export function ConnectorInsertExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(null);

    const handleSelect = (option: string) => {
        if (showSolution) return;
        setSelected(option);
    };

    const handleCheck = () => {
        if (selected === null) return;
        onSubmit(selected === content.correctConnector);
    };

    const handleKeyDown = (e: React.KeyboardEvent, option: string) => {
        if (showSolution) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(option);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-600" id="connector-instruction">
                {t('exercises.connectorInsert.instruction')}
            </p>

            {/* Sentence preview */}
            <div
                className="bg-gray-50 rounded-xl p-4 text-center"
                role="region"
                aria-labelledby="connector-instruction"
                aria-live="polite"
            >
                <span className="text-base font-semibold text-gray-800">
                    {content.sentencePart1}
                </span>
                <span
                    className={`inline-block mx-2 px-3 py-1 rounded-lg text-base font-bold min-w-[80px] text-center transition-all ${showSolution
                        ? selected === content.correctConnector
                            ? 'bg-green-100 text-green-700 border-2 border-green-400'
                            : 'bg-red-100 text-red-700 border-2 border-red-400'
                        : selected
                            ? 'bg-primary/10 text-primary border-2 border-primary'
                            : 'bg-white text-gray-400 border-2 border-dashed border-gray-300'
                        }`}
                    role="status"
                    aria-label={selected ? t('exercises.connectorInsert.selectedConnector', { connector: selected }) : t('exercises.connectorInsert.noConnector')}
                >
                    {selected ?? '…'}
                </span>
                <span className="text-base font-semibold text-gray-800">
                    {content.sentencePart2}
                </span>
            </div>

            {/* Options */}
            <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-labelledby="connector-instruction"
            >
                {content.options.map((option, idx) => {
                    const isSelected = selected === option;
                    const isCorrect = showSolution && option === content.correctConnector;
                    const isWrong = showSolution && isSelected && option !== content.correctConnector;

                    let style = 'bg-white border-2 border-gray-200 text-gray-700';
                    if (isSelected && !showSolution) style = 'bg-primary/10 border-2 border-primary text-primary';
                    if (isCorrect) style = 'bg-green-50 border-2 border-green-400 text-green-700';
                    if (isWrong) style = 'bg-red-50 border-2 border-red-400 text-red-700';

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(option)}
                            onKeyDown={(e) => handleKeyDown(e, option)}
                            disabled={showSolution}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={option}
                            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${style}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>

            {/* Solution */}
            {showSolution && selected !== content.correctConnector && (
                <div
                    className="bg-green-50 border border-green-200 rounded-xl p-3 animate-fadeIn"
                    role="status"
                    aria-live="polite"
                >
                    <div className="text-xs text-green-600 font-semibold mb-1">
                        {t('exercises.connectorInsert.solution')}
                    </div>
                    <p className="text-sm text-green-800 font-semibold">
                        {content.sentencePart1}{' '}
                        <span className="underline">{content.correctConnector}</span>{' '}
                        {content.sentencePart2}
                    </p>
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
                    disabled={selected === null}
                    className="w-full py-3 bg-accent-500 text-white font-bold rounded-xl hover:bg-accent-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                >
                    {t('exercises.check')}
                </button>
            )}
        </div>
    );
}
