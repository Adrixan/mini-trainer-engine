import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { WritingContent } from '@/types/exercise';

interface Props {
    content: WritingContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

/** Count words in a string (split on whitespace, filter empties). */
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Writing exercise: scaffolded free-writing with a prompt, starter words,
 * and a minimum word count. Awards stars if the child meets or exceeds
 * minLength (effort-based, not auto-graded for correctness).
 */
export function WritingExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();
    const [text, setText] = useState('');

    const wordCount = useMemo(() => countWords(text), [text]);
    const meetsMinimum = wordCount >= content.minLength;

    const handleCheck = () => {
        if (!meetsMinimum) return;
        // Effort-based grading: always correct if minimum met
        onSubmit(true);
    };

    const handleAddStarterWord = (word: string) => {
        if (showSolution) return;
        setText((prev) => (prev ? `${prev} ${word}` : word));
    };

    return (
        <div className="space-y-4">
            {/* Prompt */}
            <div
                className="bg-primary/5 rounded-xl p-4 border border-primary/10"
                role="region"
                aria-label={t('exercises.writing.prompt')}
            >
                <p className="text-base font-semibold text-gray-800">
                    {content.prompt}
                </p>
            </div>

            {/* Scaffold hints (starter words) */}
            {content.starterWords.length > 0 && !showSolution && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                        {t('exercises.writing.starterWords')}
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t('exercises.writing.starterWords')}>
                        {content.starterWords.map((word, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAddStarterWord(word)}
                                aria-label={`${t('exercises.writing.addWord')}: ${word}`}
                                className="px-2.5 py-1 bg-white border-2 border-primary/20 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Scaffold level hint */}
            {content.scaffoldHints.length > 0 && !showSolution && (
                <div
                    className="bg-yellow-50 border border-yellow-200 rounded-xl p-3"
                    role="region"
                    aria-label={t('exercises.writing.scaffoldHints')}
                >
                    {content.scaffoldHints.map((hint, idx) => (
                        <p key={idx} className="text-sm text-yellow-800 font-medium">
                            💡 {hint}
                        </p>
                    ))}
                </div>
            )}

            {/* Text area */}
            <div>
                <label className="sr-only" htmlFor="writing-textarea">
                    {t('exercises.writing.placeholder')}
                </label>
                <textarea
                    id="writing-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={showSolution}
                    placeholder={t('exercises.writing.placeholder')}
                    aria-describedby="word-count"
                    className={`w-full h-32 p-3 rounded-xl border-2 text-sm font-medium resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${showSolution
                        ? 'bg-gray-50 border-gray-200 text-gray-600'
                        : 'bg-white border-gray-200 text-gray-800 focus:border-primary'
                        }`}
                />

                {/* Word count indicator */}
                <div id="word-count" className="flex items-center justify-between mt-1">
                    <span className={`text-xs font-semibold ${meetsMinimum ? 'text-green-600' : 'text-gray-600'}`}>
                        {t('exercises.writing.wordCount', { count: wordCount })}
                    </span>
                    <span className="text-xs text-gray-600">
                        {t('exercises.writing.minLength', { count: content.minLength })}
                    </span>
                </div>
            </div>

            {/* Too short warning */}
            {!showSolution && wordCount > 0 && !meetsMinimum && (
                <p
                    className="text-xs text-orange-500 font-semibold animate-fadeIn"
                    role="alert"
                    aria-live="polite"
                >
                    {t('exercises.writing.tooShort')}
                </p>
            )}

            {/* Hints */}
            {hints && hints.length > 0 && !showSolution && (
                <HintButton hints={hints} />
            )}

            {/* Check button */}
            {!showSolution && (
                <button
                    onClick={handleCheck}
                    disabled={!meetsMinimum}
                    className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                    {t('exercises.check')}
                </button>
            )}
        </div>
    );
}
