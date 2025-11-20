import { NOTE_NAMES_SHARP_HU } from '../constants';

const noteToMidi: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'H': 11, 'B': 11
};

// Maps suffixes/qualities to semitone intervals from the root.
// This is based on the keys used in the GuitarChords.tsx CHORD_LIBRARY.
const suffixToIntervals: { [key: string]: number[] } = {
    'Major': [0, 4, 7],
    'Minor': [0, 3, 7],
    '7': [0, 4, 7, 10],
    'maj7': [0, 4, 7, 11],
    'm7': [0, 3, 7, 10],
    'm7b5': [0, 3, 6, 10],
    'dim7': [0, 3, 6, 9],
    '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9],
    'add9': [0, 4, 7, 14], // 14 % 12 = 2
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
};

/**
 * Parses a full chord name (e.g., "C Major", "F# Minor") and returns its constituent notes.
 * @param chordSymbol The full name of the chord.
 * @returns An object with the root, suffix, and an array of note names, or null if parsing fails.
 */
export function parseChord(chordSymbol: string): { root: string; suffix: string; notes: string[] } | null {
    // Matches a root note (like C, F#, H) followed by a space and the rest of the name.
    const match = chordSymbol.match(/^([A-G][#b]?|H|B)\s*(.*)$/);
    if (!match) return null;

    const root = match[1];
    const suffix = match[2].trim();

    const intervals = suffixToIntervals[suffix];
    const rootMidi = noteToMidi[root];

    if (rootMidi === undefined || !intervals) {
        return null; // Could not parse the root or find the suffix
    }

    // Calculate the notes based on the root and intervals
    const notes = intervals.map(interval => {
        const noteMidi = (rootMidi + interval) % 12;
        return NOTE_NAMES_SHARP_HU[noteMidi];
    });

    return { root, suffix, notes };
}