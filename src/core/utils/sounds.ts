/**
 * Sound effects utility for the Mini Trainer Engine.
 * 
 * Uses Web Audio API to generate synthesized sounds.
 * No external audio files needed - works offline.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Sound effect identifiers.
 */
export type SoundEffect =
    | 'correct'
    | 'incorrect'
    | 'level-up'
    | 'badge'
    | 'star';

/**
 * Sound manager interface.
 */
export interface SoundManager {
    /** Play a sound effect */
    play: (effect: SoundEffect) => void;
    /** Play correct answer sound */
    playCorrect: () => void;
    /** Play incorrect answer sound */
    playIncorrect: () => void;
    /** Play level up celebration sound */
    playLevelUp: () => void;
    /** Play badge earned sound */
    playBadge: () => void;
    /** Play star earned sound */
    playStar: (index?: number) => void;
    /** Check if audio context is supported */
    isSupported: () => boolean;
}

// ============================================================================
// Audio Context Singleton
// ============================================================================

let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context.
 * Must be called after user interaction due to browser autoplay policies.
 */
function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Resume audio context if suspended (required by browsers).
 */
async function resumeContext(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
}

// ============================================================================
// Sound Generation Functions
// ============================================================================

/**
 * Play a note at the specified frequency and duration.
 */
function playNote(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    delay: number = 0
): void {
    try {
        const ctx = getAudioContext();
        const currentTime = ctx.currentTime;

        // Create oscillator
        const oscillator = ctx.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, currentTime + delay);

        // Create gain node for volume envelope
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + delay + duration);

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Play
        oscillator.start(currentTime + delay);
        oscillator.stop(currentTime + delay + duration);
    } catch {
        // Silently fail if audio context is not available
    }
}

/**
 * Play correct answer sound.
 * Ascending chime: C5 -> E5 -> G5 (major chord arpeggio)
 */
function playCorrectSound(): void {
    resumeContext();

    // C5, E5, G5 - major chord arpeggio
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
        playNote(freq, 0.3, 'sine', 0.25, i * 0.08);
    });
}

/**
 * Play incorrect answer sound.
 * Low buzz: A3 -> G3 (descending)
 */
function playIncorrectSound(): void {
    resumeContext();

    // A3, G3 - descending
    playNote(220.00, 0.15, 'square', 0.15, 0);    // A3
    playNote(196.00, 0.2, 'square', 0.12, 0.12);  // G3
}

/**
 * Play level up celebration sound.
 * Celebratory ascending scale with harmonics.
 */
function playLevelUpSound(): void {
    resumeContext();

    // Ascending scale: C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6
    const notes = [
        { freq: 261.63, delay: 0 },      // C4
        { freq: 329.63, delay: 0.1 },    // E4
        { freq: 392.00, delay: 0.2 },    // G4
        { freq: 523.25, delay: 0.3 },    // C5
        { freq: 659.25, delay: 0.4 },    // E5
        { freq: 783.99, delay: 0.5 },    // G5
        { freq: 1046.50, delay: 0.6 },   // C6
    ];

    notes.forEach(({ freq, delay }) => {
        playNote(freq, 0.4, 'sine', 0.2, delay);
        // Add a harmonic for richness
        playNote(freq * 2, 0.3, 'sine', 0.1, delay);
    });
}

/**
 * Play badge earned sound.
 * Sparkle sound with quick ascending notes.
 */
function playBadgeSound(): void {
    resumeContext();

    // Quick sparkle: G4 -> B4 -> D5 -> G5
    const notes = [
        { freq: 392.00, delay: 0 },      // G4
        { freq: 493.88, delay: 0.06 },   // B4
        { freq: 587.33, delay: 0.12 },   // D5
        { freq: 783.99, delay: 0.18 },   // G5
    ];

    notes.forEach(({ freq, delay }) => {
        playNote(freq, 0.25, 'sine', 0.25, delay);
        playNote(freq * 1.5, 0.2, 'triangle', 0.1, delay + 0.02);
    });
}

/**
 * Play star earned sound.
 * Twinkle sound with pitch varying by star index.
 * 
 * @param index - Star index (0, 1, or 2) - higher index = higher pitch
 */
function playStarSound(index: number = 0): void {
    resumeContext();

    // Base frequency increases with star index
    const baseFreq = 440 + (index * 100); // A4, B4, C#5-ish

    // Quick twinkle
    playNote(baseFreq, 0.15, 'sine', 0.3, 0);
    playNote(baseFreq * 1.5, 0.12, 'sine', 0.15, 0.05);
    playNote(baseFreq * 2, 0.1, 'sine', 0.08, 0.08);
}

// ============================================================================
// Sound Manager Export
// ============================================================================

/**
 * Sound manager instance.
 * Provides methods to play various sound effects.
 */
export const soundManager: SoundManager = {
    play: (effect: SoundEffect): void => {
        switch (effect) {
            case 'correct':
                playCorrectSound();
                break;
            case 'incorrect':
                playIncorrectSound();
                break;
            case 'level-up':
                playLevelUpSound();
                break;
            case 'badge':
                playBadgeSound();
                break;
            case 'star':
                playStarSound();
                break;
        }
    },

    playCorrect: playCorrectSound,
    playIncorrect: playIncorrectSound,
    playLevelUp: playLevelUpSound,
    playBadge: playBadgeSound,
    playStar: playStarSound,

    isSupported: (): boolean => {
        return typeof AudioContext !== 'undefined' ||
            typeof (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext !== 'undefined';
    },
};

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Play a sound effect if sound is enabled.
 * 
 * @param effect - Sound effect to play
 * @param enabled - Whether sound is enabled
 */
export function playSound(effect: SoundEffect, enabled: boolean = true): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.play(effect);
    }
}

/**
 * Play correct answer sound if enabled.
 */
export function playCorrect(enabled: boolean = true): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.playCorrect();
    }
}

/**
 * Play incorrect answer sound if enabled.
 */
export function playIncorrect(enabled: boolean = true): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.playIncorrect();
    }
}

/**
 * Play level up sound if enabled.
 */
export function playLevelUp(enabled: boolean = true): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.playLevelUp();
    }
}

/**
 * Play badge earned sound if enabled.
 */
export function playBadge(enabled: boolean = true): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.playBadge();
    }
}

/**
 * Play star earned sound if enabled.
 */
export function playStar(enabled: boolean = true, index: number = 0): void {
    if (enabled && soundManager.isSupported()) {
        soundManager.playStar(index);
    }
}

export default soundManager;
