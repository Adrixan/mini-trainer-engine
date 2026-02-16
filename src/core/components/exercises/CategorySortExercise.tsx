import { useState, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HintButton } from './HintButton';
import type { SortingContent } from '@/types/exercise';

interface Props {
    content: SortingContent;
    hints?: string[];
    onSubmit: (correct: boolean) => void;
    showSolution: boolean;
}

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i]!;
        copy[i] = copy[j]!;
        copy[j] = tmp;
    }
    return copy;
}

/** Encodes drag data for both pool and bucket sources. */
interface DragData {
    item: string;
    source: 'pool' | number; // 'pool' or category index
}

/**
 * Category sorting exercise: sort items into categories.
 * Supports both drag-and-drop and tap-to-select interactions.
 * Fully accessible with keyboard navigation.
 */
export function CategorySortExercise({ content, hints, onSubmit, showSolution }: Props) {
    const { t } = useTranslation();

    // All items scrambled (computed once)
    const allItems = useMemo(() => {
        const items = content.categories.flatMap((cat) => cat.items);
        return shuffle(items);
    }, [content]);

    // Which items are still unplaced
    const [pool, setPool] = useState<string[]>(allItems);
    // Placed items per category index
    const [buckets, setBuckets] = useState<Record<number, string[]>>(
        Object.fromEntries(content.categories.map((_, i) => [i, []])),
    );
    // Currently selected item from pool (tap fallback)
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    // Result state
    const [results, setResults] = useState<Record<number, Record<string, boolean>> | null>(null);
    // Drag-over feedback: which category is currently hovered
    const [dragOverCat, setDragOverCat] = useState<number | null>(null);
    // Currently being dragged (for visual feedback)
    const [draggingItem, setDraggingItem] = useState<string | null>(null);

    // Touch-drag state
    const touchRef = useRef<{
        data: DragData;
        ghostEl: HTMLDivElement | null;
        startX: number;
        startY: number;
        moved: boolean;
    } | null>(null);
    const categoryRefs = useRef<Map<number, HTMLElement>>(new Map());
    const poolRef = useRef<HTMLDivElement | null>(null);

    // Build correct lookup: item → category index
    const correctMap = useMemo(() => {
        const map = new Map<string, number>();
        content.categories.forEach((cat, idx) => {
            cat.items.forEach((item) => map.set(item, idx));
        });
        return map;
    }, [content]);

    // --- Move helpers ---
    const moveToCategory = useCallback((item: string, catIdx: number, source: 'pool' | number) => {
        if (source === 'pool') {
            setPool((prev) => prev.filter((i) => i !== item));
        } else {
            setBuckets((prev) => ({
                ...prev,
                [source]: (prev[source] || []).filter((i) => i !== item),
            }));
        }
        setBuckets((prev) => ({
            ...prev,
            [catIdx]: [...(prev[catIdx] || []), item],
        }));
        setSelectedItem(null);
    }, []);

    const moveToPool = useCallback((item: string, fromCat: number) => {
        setBuckets((prev) => ({
            ...prev,
            [fromCat]: (prev[fromCat] || []).filter((i) => i !== item),
        }));
        setPool((prev) => [...prev, item]);
    }, []);

    // --- HTML5 Drag & Drop handlers ---
    const handleDragStart = (e: React.DragEvent, data: DragData) => {
        if (showSolution) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        setDraggingItem(data.item);
    };

    const handleDragEnd = () => {
        setDraggingItem(null);
        setDragOverCat(null);
    };

    const handleDragOver = (e: React.DragEvent, catIdx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCat(catIdx);
    };

    const handleDragOverPool = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCat(-1); // -1 = pool
    };

    const handleDragLeave = () => {
        setDragOverCat(null);
    };

    const handleDrop = (e: React.DragEvent, catIdx: number) => {
        e.preventDefault();
        setDragOverCat(null);
        setDraggingItem(null);
        try {
            const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.source === catIdx) return; // dropped on same category
            moveToCategory(data.item, catIdx, data.source);
        } catch { /* invalid drag data */ }
    };

    const handleDropOnPool = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverCat(null);
        setDraggingItem(null);
        try {
            const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.source === 'pool') return;
            moveToPool(data.item, data.source as number);
        } catch { /* invalid drag data */ }
    };

    // --- Touch drag handlers (for mobile) ---
    const findCategoryAtPoint = (x: number, y: number): number | 'pool' | null => {
        // Check pool first
        if (poolRef.current) {
            const rect = poolRef.current.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return 'pool';
            }
        }
        // Check category buckets
        for (const [catIdx, el] of categoryRefs.current.entries()) {
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return catIdx;
            }
        }
        return null;
    };

    const handleTouchStart = (e: React.TouchEvent, data: DragData) => {
        if (showSolution) return;
        const touch = e.touches[0]!;
        // Create ghost element
        const ghost = document.createElement('div');
        ghost.textContent = data.item;
        ghost.className = 'fixed z-50 px-3 py-1.5 rounded-lg font-bold text-sm bg-primary text-white shadow-lg pointer-events-none';
        ghost.style.left = `${touch.clientX - 30}px`;
        ghost.style.top = `${touch.clientY - 20}px`;
        ghost.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ghost);

        touchRef.current = {
            data,
            ghostEl: ghost,
            startX: touch.clientX,
            startY: touch.clientY,
            moved: false,
        };
        setDraggingItem(data.item);
    };

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchRef.current) return;
        const touch = e.touches[0]!;
        const dx = Math.abs(touch.clientX - touchRef.current.startX);
        const dy = Math.abs(touch.clientY - touchRef.current.startY);
        if (dx > 5 || dy > 5) {
            touchRef.current.moved = true;
            // Prevent scrolling when dragging
            e.preventDefault();
        }

        if (touchRef.current.ghostEl) {
            touchRef.current.ghostEl.style.left = `${touch.clientX - 30}px`;
            touchRef.current.ghostEl.style.top = `${touch.clientY - 20}px`;
        }

        // Update drag-over highlight
        const target = findCategoryAtPoint(touch.clientX, touch.clientY);
        if (target === 'pool') {
            setDragOverCat(-1);
        } else if (target !== null) {
            setDragOverCat(target);
        } else {
            setDragOverCat(null);
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!touchRef.current) return;
        const td = touchRef.current;

        // Capture coordinates BEFORE removing the ghost from DOM
        let dropX = 0;
        let dropY = 0;
        if (td.ghostEl) {
            dropX = parseFloat(td.ghostEl.style.left) + 30;
            dropY = parseFloat(td.ghostEl.style.top) + 20;
            document.body.removeChild(td.ghostEl);
        }

        if (td.moved && dropX > 0 && dropY > 0) {
            const target = findCategoryAtPoint(dropX, dropY);
            if (target === 'pool' && td.data.source !== 'pool') {
                moveToPool(td.data.item, td.data.source as number);
            } else if (typeof target === 'number' && target !== td.data.source) {
                moveToCategory(td.data.item, target, td.data.source);
            }
        }

        touchRef.current = null;
        setDraggingItem(null);
        setDragOverCat(null);
    }, [moveToCategory, moveToPool]);

    // --- Tap fallback handlers ---
    const handleTapItem = (item: string) => {
        if (showSolution) return;
        // If there's an active touch drag, ignore taps
        if (touchRef.current?.moved) return;
        setSelectedItem((prev) => (prev === item ? null : item));
    };

    const handleTapCategory = (catIdx: number) => {
        if (!selectedItem || showSolution) return;
        moveToCategory(selectedItem, catIdx, pool.includes(selectedItem) ? 'pool' : (() => {
            // Find which bucket the selected item is in
            for (const [idx, items] of Object.entries(buckets)) {
                if (items.includes(selectedItem)) return Number(idx);
            }
            return 'pool';
        })());
    };

    const handleTapBucketItem = (catIdx: number, item: string) => {
        if (showSolution) return;
        if (touchRef.current?.moved) return;
        moveToPool(item, catIdx);
    };

    const handleCheck = () => {
        if (pool.length > 0) return;

        const res: Record<number, Record<string, boolean>> = {};
        let allCorrect = true;

        content.categories.forEach((_, catIdx) => {
            res[catIdx] = {};
            (buckets[catIdx] || []).forEach((item) => {
                const isCorrect = correctMap.get(item) === catIdx;
                res[catIdx]![item] = isCorrect;
                if (!isCorrect) allCorrect = false;
            });
        });

        setResults(res);
        onSubmit(allCorrect);
    };

    const handleReset = () => {
        setPool(allItems);
        setBuckets(Object.fromEntries(content.categories.map((_, i) => [i, []])));
        setSelectedItem(null);
        setResults(null);
        setDraggingItem(null);
        setDragOverCat(null);
    };

    const allPlaced = pool.length === 0;

    return (
        <div className="space-y-4">
            {/* Item pool */}
            {!showSolution && (
                <div
                    ref={poolRef}
                    className={`rounded-xl p-4 transition-colors ${dragOverCat === -1 ? 'bg-primary/10 border-2 border-primary/30' : 'bg-gray-50 border-2 border-transparent'
                        }`}
                    onDragOver={handleDragOverPool}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropOnPool}
                    role="region"
                    aria-label={t('exercises.sorting.itemPool')}
                >
                    <p className="text-xs text-gray-600 mb-2 font-semibold">
                        {t('exercises.sorting.dragOrTap')}
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {pool.length === 0 ? (
                            <span className="text-gray-300 italic text-sm">
                                {t('exercises.sorting.allSorted')}
                            </span>
                        ) : (
                            pool.map((item, idx) => (
                                <button
                                    key={`pool-${idx}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, { item, source: 'pool' })}
                                    onDragEnd={handleDragEnd}
                                    onTouchStart={(e) => handleTouchStart(e, { item, source: 'pool' })}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onClick={() => handleTapItem(item)}
                                    aria-pressed={selectedItem === item}
                                    aria-label={`${item}${selectedItem === item ? ', selected' : ''}`}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all shadow-sm select-none touch-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${draggingItem === item
                                            ? 'opacity-40 scale-95'
                                            : selectedItem === item
                                                ? 'bg-primary text-white border-2 border-primary scale-105'
                                                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary hover:text-primary active:scale-95 cursor-grab active:cursor-grabbing'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Category buckets */}
            <div
                className={`grid gap-3 ${content.categories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
                role="group"
                aria-label={t('exercises.sorting.categories')}
            >
                {content.categories.map((cat, catIdx) => {
                    const items = buckets[catIdx] || [];
                    const isOver = dragOverCat === catIdx;
                    return (
                        <div
                            key={catIdx}
                            ref={(el) => { if (el) categoryRefs.current.set(catIdx, el); }}
                            onClick={() => handleTapCategory(catIdx)}
                            onDragOver={(e) => handleDragOver(e, catIdx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, catIdx)}
                            role="region"
                            aria-label={`${cat.label}${selectedItem ? `, click to place ${selectedItem}` : ''}`}
                            className={`rounded-xl p-3 border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isOver
                                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-md'
                                    : selectedItem && !showSolution
                                        ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 cursor-pointer'
                                        : 'border-gray-200 bg-white cursor-default'
                                }`}
                            tabIndex={selectedItem ? 0 : -1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleTapCategory(catIdx);
                                }
                            }}
                        >
                            <p className="text-sm font-bold text-gray-700 mb-2 text-center">
                                {cat.label}
                            </p>
                            <div className="flex flex-wrap gap-1 min-h-[32px] justify-center">
                                {items.map((item, iIdx) => {
                                    const itemResult = results?.[catIdx]?.[item];
                                    return (
                                        <span
                                            key={`bucket-${catIdx}-${iIdx}`}
                                            draggable={!showSolution}
                                            onDragStart={(e) => handleDragStart(e, { item, source: catIdx })}
                                            onDragEnd={handleDragEnd}
                                            onTouchStart={(e) => !showSolution && handleTouchStart(e, { item, source: catIdx })}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTapBucketItem(catIdx, item);
                                            }}
                                            role="button"
                                            tabIndex={showSolution ? -1 : 0}
                                            aria-label={`${item}, click to return to pool`}
                                            onKeyDown={(e) => {
                                                if ((e.key === 'Enter' || e.key === ' ') && !showSolution) {
                                                    e.preventDefault();
                                                    moveToPool(item, catIdx);
                                                }
                                            }}
                                            className={`px-2 py-1 rounded text-xs font-semibold transition-all select-none focus:outline-none focus:ring-2 focus:ring-primary ${showSolution
                                                    ? itemResult
                                                        ? 'bg-green-100 text-green-800 border border-green-300'
                                                        : 'bg-red-100 text-red-700 border border-red-300'
                                                    : draggingItem === item
                                                        ? 'opacity-40 bg-primary/10 text-primary border border-primary/20'
                                                        : 'bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-grab active:cursor-grabbing touch-none'
                                                }`}
                                        >
                                            {item}{!showSolution && ' ✕'}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Show correct sorting when wrong */}
            {showSolution && results && Object.values(results).some((cat) => Object.values(cat).some((v) => !v)) && (
                <div
                    className="bg-green-50 border border-green-200 rounded-xl p-3 animate-fadeIn"
                    role="status"
                    aria-live="polite"
                >
                    <span className="text-xs text-green-600 font-semibold">
                        {t('exercises.sorting.correctSorting')}
                    </span>
                    {content.categories.map((cat, idx) => (
                        <p key={idx} className="mt-1 text-sm">
                            <span className="font-bold text-green-800">{cat.label}:</span>{' '}
                            <span className="text-green-700">{cat.items.join(', ')}</span>
                        </p>
                    ))}
                </div>
            )}

            {/* Hints */}
            {hints && hints.length > 0 && !showSolution && (
                <HintButton hints={hints} />
            )}

            {/* Buttons */}
            {!showSolution && (
                <div className="flex gap-2">
                    {Object.values(buckets).some((b) => b.length > 0) && (
                        <button
                            onClick={handleReset}
                            aria-label={t('exercises.reset')}
                            className="px-4 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                            🔄
                        </button>
                    )}
                    <button
                        onClick={handleCheck}
                        disabled={!allPlaced}
                        className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    >
                        {t('exercises.check')}
                    </button>
                </div>
            )}
        </div>
    );
}
