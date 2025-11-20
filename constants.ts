
import { Scale, ChordData, ChordShape } from './types'; // Assuming types.ts exists with these interfaces

// FIX: Re-export ChordShape to make it available to other modules.
export type { ChordShape };

// From ChordGenerator.tsx
export const MUSIC_SCALES = ['Dúr', 'Moll (Természetes)', 'Moll (Harmonikus)', 'Moll (Dallamos)'];
export const MUSIC_MOODS = ['Vidám', 'Szomorú', 'Energikus', 'Nyugodt', 'Rejtélyes', 'Epikus'];

// From useTuner.ts, FretboardVisualizer.tsx, GuitarChords.tsx, services/chordParser.ts
export const NOTE_NAMES_SHARP_HU = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];
export const NOTE_NAMES_SHARP_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT_HU = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'H'];
export const NOTE_NAMES_FLAT_INTL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];


// From TheoryGuide.tsx and FretboardVisualizer.tsx
export const SCALES: Record<string, Scale> = {
    // Dúr Móduszai (Major Modes)
    'Dúr (Ión)': { intervals: [0, 2, 4, 5, 7, 9, 11], degreeFormula: '1-2-3-4-5-6-7', category: 'Dúr móduszai', brightness: 3, modeOrder: 1, notesFromC: 'C-D-E-F-G-A-H', shortName: 'Dúr' },
    'Dór': { intervals: [0, 2, 3, 5, 7, 9, 10], degreeFormula: '1-2-b3-4-5-6-b7', category: 'Dúr móduszai', brightness: 2, modeOrder: 2, notesFromC: 'C-D-Eb-F-G-A-Bb', shortName: 'Dór' },
    'Fríg': { intervals: [0, 1, 3, 5, 7, 8, 10], degreeFormula: '1-b2-b3-4-5-b6-b7', category: 'Dúr móduszai', brightness: -2, modeOrder: 3, notesFromC: 'C-Db-Eb-F-G-Ab-Bb', shortName: 'Fríg' },
    'Líd': { intervals: [0, 2, 4, 6, 7, 9, 11], degreeFormula: '1-2-3-#4-5-6-7', category: 'Dúr móduszai', brightness: 4, modeOrder: 4, notesFromC: 'C-D-E-F#-G-A-H', shortName: 'Líd' },
    'Mixolíd': { intervals: [0, 2, 4, 5, 7, 9, 10], degreeFormula: '1-2-3-4-5-6-b7', category: 'Dúr móduszai', brightness: 1, modeOrder: 5, notesFromC: 'C-D-E-F-G-A-Bb', shortName: 'Mixolíd' },
    'Moll (Eol)': { intervals: [0, 2, 3, 5, 7, 8, 10], degreeFormula: '1-2-b3-4-5-b6-b7', category: 'Dúr móduszai', brightness: -1, modeOrder: 6, notesFromC: 'C-D-Eb-F-G-Ab-Bb', shortName: 'Term. Moll' },
    'Lokriszi': { intervals: [0, 1, 3, 5, 6, 8, 10], degreeFormula: '1-b2-b3-4-b5-b6-b7', category: 'Dúr móduszai', brightness: -4, modeOrder: 7, notesFromC: 'C-Db-Eb-F-Gb-Ab-Bb', shortName: 'Lokriszi' },
    
    // Dallamos Moll Móduszai (Melodic Minor Modes)
    'Dallamos Moll': { intervals: [0, 2, 3, 5, 7, 9, 11], degreeFormula: '1-2-b3-4-5-6-7', category: 'Dallamos moll móduszai', brightness: 0, modeOrder: 1, notesFromC: 'C-D-Eb-F-G-A-H', shortName: 'Dall. Moll' },
    'Fríg #6': { intervals: [0, 1, 3, 5, 7, 9, 10], degreeFormula: '1-b2-b3-4-5-6-b7', category: 'Dallamos moll móduszai', brightness: -3, modeOrder: 2, notesFromC: 'C-Db-Eb-F-G-A-Bb', shortName: 'Fríg #6' },
    'Líd #5': { intervals: [0, 2, 4, 6, 8, 9, 11], degreeFormula: '1-2-3-#4-#5-6-7', category: 'Dallamos moll móduszai', brightness: 5, modeOrder: 3, notesFromC: 'C-D-E-F#-G#-A-H', shortName: 'Líd #5' },
    'Líd Domináns': { intervals: [0, 2, 4, 6, 7, 9, 10], degreeFormula: '1-2-3-#4-5-6-b7', category: 'Dallamos moll móduszai', brightness: 2, modeOrder: 4, notesFromC: 'C-D-E-F#-G-A-Bb', shortName: 'Líd Dom.' },
    'Mixolíd b6': { intervals: [0, 2, 4, 5, 7, 8, 10], degreeFormula: '1-2-3-4-5-b6-b7', category: 'Dallamos moll móduszai', brightness: -1, modeOrder: 5, notesFromC: 'C-D-E-F-G-Ab-Bb', shortName: 'Mixolíd b6' },
    'Lokriszi #2': { intervals: [0, 2, 3, 5, 6, 8, 10], degreeFormula: '1-2-b3-4-b5-b6-b7', category: 'Dallamos moll móduszai', brightness: -3, modeOrder: 6, notesFromC: 'C-D-Eb-F-Gb-Ab-Bb', shortName: 'Lokriszi #2' },
    'Alterált Skála': { intervals: [0, 1, 3, 4, 6, 8, 10], degreeFormula: '1-b9-#9-3-#11-b13-b7', category: 'Dallamos moll móduszai', brightness: -5, modeOrder: 7, notesFromC: 'C-Db-D#-E-F#-G#-Bb', shortName: 'Alterált' },

    // Összhangzatos Moll Móduszai (Harmonic Minor Modes)
    'Összhangzatos Moll': { intervals: [0, 2, 3, 5, 7, 8, 11], degreeFormula: '1-2-b3-4-5-b6-7', category: 'Összhangzatos moll móduszai', brightness: -1, modeOrder: 1, notesFromC: 'C-D-Eb-F-G-Ab-H', shortName: 'Harm. Moll' },
    'Lokriszi #6': { intervals: [0, 1, 3, 5, 6, 9, 10], degreeFormula: '1-b2-b3-4-b5-6-b7', category: 'Összhangzatos moll móduszai', brightness: -4, modeOrder: 2, notesFromC: 'C-Db-Eb-F-Gb-A-Bb', shortName: 'Lokriszi #6' },
    'Ión #5': { intervals: [0, 2, 4, 5, 8, 9, 11], degreeFormula: '1-2-3-4-#5-6-7', category: 'Összhangzatos moll móduszai', brightness: 4, modeOrder: 3, notesFromC: 'C-D-E-F-G#-A-H', shortName: 'Ión #5' },
    'Dór #4': { intervals: [0, 2, 3, 6, 7, 9, 10], degreeFormula: '1-2-b3-#4-5-6-b7', category: 'Összhangzatos moll móduszai', brightness: 1, modeOrder: 4, notesFromC: 'C-D-Eb-F#-G-A-Bb', shortName: 'Dór #4' },
    'Fríg Domináns': { intervals: [0, 1, 4, 5, 7, 8, 10], degreeFormula: '1-b2-3-4-5-b6-b7', category: 'Összhangzatos moll móduszai', brightness: -2, modeOrder: 5, notesFromC: 'C-Db-E-F-G-Ab-Bb', shortName: 'Fríg Dom.' },
    'Líd #2': { intervals: [0, 3, 4, 6, 7, 9, 11], degreeFormula: '1-#2-3-#4-5-6-7', category: 'Összhangzatos moll móduszai', brightness: 5, modeOrder: 6, notesFromC: 'C-D#-E-F#-G-A-H', shortName: 'Líd #2' },
    'Alterált bb7': { intervals: [0, 1, 3, 4, 6, 8, 9], degreeFormula: '1-b2-b3-b4-b5-b6-bb7', category: 'Összhangzatos moll móduszai', brightness: -6, modeOrder: 7, notesFromC: 'C-Db-Eb-E-Gb-Ab-A', shortName: 'Alt. bb7' },
    
    // Egyéb Skálák (Other Scales)
    'Dúr Pentaton': { intervals: [0, 2, 4, 7, 9], degreeFormula: '1-2-3-5-6', category: 'Egyéb', brightness: 3 },
    'Moll Pentaton': { intervals: [0, 3, 5, 7, 10], degreeFormula: '1-b3-4-5-b7', category: 'Egyéb', brightness: -1 },
    'Blues Skála': { intervals: [0, 3, 5, 6, 7, 10], degreeFormula: '1-b3-4-b5-5-b7', category: 'Egyéb', brightness: 0 },
    'Egészhangú': { intervals: [0, 2, 4, 6, 8, 10], degreeFormula: '1-2-3-#4-#5-b7', category: 'Egyéb', brightness: 2 },
    'Szűkített (e-f)': { intervals: [0, 2, 3, 5, 6, 8, 9, 11], degreeFormula: '1-2-b3-4-b5-b6-6-7', category: 'Egyéb', brightness: 0 },
    'Szűkített (f-e)': { intervals: [0, 1, 3, 4, 6, 7, 9, 10], degreeFormula: '1-b2-b3-3-b5-5-6-b7', category: 'Egyéb', brightness: -2 },
    'Összhangzatos Dúr': { intervals: [0, 2, 4, 5, 7, 8, 11], degreeFormula: '1-2-3-4-5-b6-7', category: 'Egyéb', brightness: 2 },
};

export const CHORDS: Record<string, ChordData> = {
    // Triads
    'Dúr hármas': { intervals: [0, 4, 7], formula: '1-3-5' },
    'Moll hármas': { intervals: [0, 3, 7], formula: '1-b3-5' },
    'Szűkített hármas': { intervals: [0, 3, 6], formula: '1-b3-b5' },
    'Bővített hármas': { intervals: [0, 4, 8], formula: '1-3-#5' },
    // Seventh Chords
    'Domináns szeptim (7)': { intervals: [0, 4, 7, 10], formula: '1-3-5-b7' },
    'Major szeptim (maj7)': { intervals: [0, 4, 7, 11], formula: '1-3-5-7' },
    'Moll szeptim (m7)': { intervals: [0, 3, 7, 10], formula: '1-b3-5-b7' },
    'Félszűkített szeptim (m7♭5)': { intervals: [0, 3, 6, 10], formula: '1-b3-b5-b7' },
    'Szűkített szeptim (dim7)': { intervals: [0, 3, 6, 9], formula: '1-b3-b5-bb7' },
    'Moll-major szeptim (m-maj7)': { intervals: [0, 3, 7, 11], formula: '1-b3-5-7' },
    'Bővített major szeptim (maj7#5)': { intervals: [0, 4, 8, 11], formula: '1-3-#5-7' },
    'Bővített szeptim (7#5)': { intervals: [0, 4, 8, 10], formula: '1-3-#5-b7' },
};

// Used for chord detection logic (International names)
export const CHORD_PATTERNS: Record<string, number[]> = {
    // Triads (Hármashangzatok)
    'Major': [0, 4, 7],
    'Minor': [0, 3, 7],
    'Dim': [0, 3, 6],
    'Aug': [0, 4, 8],
    'Maj(b5)': [0, 4, 6], // Lydian triad
    
    // Suspended (Késleltetett)
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    'sus2(b5)': [0, 2, 6],
    '7sus4': [0, 5, 7, 10],
    '7sus2': [0, 2, 7, 10],

    // Sevenths (Négyeshangzatok)
    'Maj7': [0, 4, 7, 11],
    '7': [0, 4, 7, 10],
    'm7': [0, 3, 7, 10],
    'mMaj7': [0, 3, 7, 11],
    'dim7': [0, 3, 6, 9],
    'm7b5': [0, 3, 6, 10],
    'aug7': [0, 4, 8, 10],
    'Maj7#5': [0, 4, 8, 11],
    
    // Sixth
    '6': [0, 4, 7, 9],
    'm6': [0, 3, 7, 9],
    '6/9': [0, 4, 7, 9, 14],
    
    // Extended (Add/9/11)
    'add9': [0, 4, 7, 14], // 14 is equivalent to 2
    'm(add9)': [0, 3, 7, 14],
    '9': [0, 4, 7, 10, 14],
    'maj9': [0, 4, 7, 11, 14],
    'm9': [0, 3, 7, 10, 14],
    '11': [0, 7, 10, 14, 17], // 17 eq to 5
    '13': [0, 4, 7, 10, 21],
};


export const chordTypes: { [key: string]: string } = {
    'Major': 'Dúr',
    'Minor': 'Moll',
    '7': 'Domináns 7',
    'maj7': 'Major 7',
    'm7': 'Moll 7',
    'm7b5': 'Félszűkített 7 (m7♭5)',
    'dim7': 'Szűkített 7 (dim7)',
    '6': '6',
    'm6': 'm6',
    'add9': 'add9',
    'sus2': 'sus2',
    'sus4': 'sus4',
};

export const CHORD_LIBRARY: { [root: string]: { [quality: string]: ChordShape[] } } = {
    'C': {
        'Major': [
            { name: 'C Major', frets: ['x', 3, 2, 0, 1, 0], fingers: ['x', 3, 2, 0, 1, 0] },
            { name: 'C Major', frets: ['x', 3, 5, 5, 5, 3], fingers: ['x', 1, 3, 4, 4, 1], baseFret: 3 },
            { name: 'C Major', frets: [8, 10, 10, 9, 8, 8], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8 },
        ],
        'Minor': [
            { name: 'C Minor', frets: ['x', 3, 5, 5, 4, 3], fingers: ['x', 1, 3, 4, 2, 1], baseFret: 3 },
            { name: 'C Minor', frets: [8, 10, 10, 8, 8, 8], fingers: [1, 3, 4, 1, 1, 1], baseFret: 8 },
        ],
        '7': [
            { name: 'C7', frets: ['x', 3, 2, 3, 1, 0], fingers: ['x', 3, 2, 4, 1, 0] },
            { name: 'C7', frets: ['x', 3, 5, 3, 5, 3], fingers: ['x', 1, 3, 1, 4, 1], baseFret: 3 },
        ],
    },
    'D': {
        'Major': [
            { name: 'D Major', frets: ['x', 'x', 0, 2, 3, 2], fingers: ['x', 'x', 0, 1, 3, 2] },
            { name: 'D Major', frets: ['x', 5, 7, 7, 7, 5], fingers: ['x', 1, 3, 4, 4, 1], baseFret: 5 },
        ],
        'Minor': [
             { name: 'D Minor', frets: ['x', 'x', 0, 2, 3, 1], fingers: ['x', 'x', 0, 2, 3, 1] },
             { name: 'D Minor', frets: ['x', 5, 7, 7, 6, 5], fingers: ['x', 1, 3, 4, 2, 1], baseFret: 5 },
        ],
    },
    'E': {
        'Major': [
            { name: 'E Major', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
        ],
        'Minor': [
            { name: 'E Minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
        ],
    },
    'F': {
        'Major': [
            { name: 'F Major', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
        ],
        'Minor': [
             { name: 'F Minor', frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1] },
        ],
    },
    'G': {
        'Major': [
            { name: 'G Major', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
            { name: 'G Major', frets: [3, 5, 5, 4, 3, 3], fingers: [2, 4, 4, 3, 1, 1], baseFret: 3 },
        ],
        'Minor': [
            { name: 'G Minor', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3 },
        ],
    },
    'A': {
        'Major': [
            { name: 'A Major', frets: ['x', 0, 2, 2, 2, 0], fingers: ['x', 0, 1, 2, 3, 0] },
            { name: 'A Major', frets: [5, 7, 7, 6, 5, 5], fingers: [1, 3, 4, 2, 1, 1], baseFret: 5 },
        ],
        'Minor': [
            { name: 'A Minor', frets: ['x', 0, 2, 2, 1, 0], fingers: ['x', 0, 2, 3, 1, 0] },
        ],
    },
    'H': {
        'Major': [
            { name: 'H Major', frets: ['x', 2, 4, 4, 4, 2], fingers: ['x', 1, 3, 4, 4, 1], baseFret: 2 },
        ],
        'Minor': [
            { name: 'H Minor', frets: ['x', 2, 4, 4, 3, 2], fingers: ['x', 1, 3, 4, 2, 1], baseFret: 2 },
        ],
    },
};

// From FretboardVisualizer.tsx
export const MAJOR_SCALES_BY_ROOT_HU: Record<string, string[]> = {
    'C':  ['C', 'D', 'E', 'F', 'G', 'A', 'H'], 'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'H#'],
    'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'], 'D':  ['D', 'E', 'F#', 'G', 'A', 'H', 'C#'],
    'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'], 'E':  ['E', 'F#', 'G#', 'A', 'H', 'C#', 'D#'],
    'F':  ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'F#': ['F#', 'G#', 'A#', 'H', 'C#', 'D#', 'E#'],
    'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'], 'G':  ['G', 'A', 'H', 'C', 'D', 'E', 'F#'],
    'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'], 'A':  ['A', 'H', 'C#', 'D', 'E', 'F#', 'G#'],
    'B': ['B', 'C', 'D', 'Eb', 'F', 'G', 'A'], 'H':  ['H', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
};
export const MAJOR_SCALES_BY_ROOT_INTL: Record<string, string[]> = Object.fromEntries(
    Object.entries(MAJOR_SCALES_BY_ROOT_HU).map(([key, value]) => [ 
        key === 'H' ? 'B' : (key === 'B' ? 'Bb' : key), 
        value.map(note => note.replace(/H(?!#)/g, 'B').replace(/^B$/, 'Bb')) 
    ])
);

// --- Metronome syllable feature ---
export type SyllableLanguage = 'magyar' | 'tala';

export interface SyllablePattern {
  name: string;
  syllables: string[];
}

export type SubdivisionPatterns = Partial<Record<number, SyllablePattern[]>>; // Key is subdivision (1, 2, 3, 4)

export const SYLLABLE_DATA: Record<number, Partial<Record<SyllableLanguage, SubdivisionPatterns>>> = {
  1: {
    tala: { 1: [{ name: '1', syllables: ['Ta'] }] },
  },
  2: {
    tala: {
      1: [{ name: '2', syllables: ['Ta', 'Ka'] }],
      2: [{ name: '2 - Nyolcad', syllables: ['Ta', 'ka', 'Ta', 'ka'] }],
    },
    magyar: {
      1: [{ name: '2', syllables: ['egy', 'két'] }],
      2: [{ name: '2 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt'] }],
      3: [{ name: '2 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként'] }],
      4: [{ name: '2 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel'] }],
    },
  },
  3: {
    tala: {
      1: [{ name: '3', syllables: ['Ta', 'Ki', 'Ta'] }],
      2: [{ name: '3 - Nyolcad', syllables: ['Ta', 'Ki', 'Ta', 'Ta', 'Ki', 'Ta'] }],
    },
    magyar: {
      1: [{ name: '3', syllables: ['egy', 'két', 'há'] }],
      2: [{ name: '3 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat'] }],
      3: [{ name: '3 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként'] }],
      4: [{ name: '3 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val'] }],
    },
  },
  4: {
    tala: {
      1: [{ name: '4', syllables: ['Ta', 'Ka', 'Di', 'Mi'] }],
      2: [{ name: '4 - Nyolcad', syllables: ['Ta', 'Ka', 'Di', 'Mi', 'Ta', 'Ka', 'Di', 'Mi'] }],
      4: [{ name: '4 - Tizenhatod', syllables: ['Ta', 'ka', 'Di', 'mi', 'Ta', 'ka', 'Di', 'mi', 'Ta', 'ka', 'Di', 'mi', 'Ta', 'ka', 'Di', 'mi'] }],
    },
    magyar: {
      1: [{ name: '4', syllables: ['egy', 'két', 'há', 'négy'] }],
      2: [{ name: '4 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet'] }],
      3: [{ name: '4 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként'] }],
      4: [{ name: '4 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel'] }],
    },
  },
  5: {
    tala: {
      1: [
        { name: '2+3', syllables: ['Ta', 'Ka', 'Ta', 'Ki', 'Ta'] },
        { name: '3+2', syllables: ['Ta', 'Ki', 'Ta', 'Ta', 'Ka'] },
      ],
    },
    magyar: {
      1: [
        { name: '5', syllables: ['egy', 'két', 'há', 'négy', 'öt'] },
        { name: '2+3', syllables: ['egy', 'két', 'egy', 'két', 'há'] },
        { name: '3+2', syllables: ['egy', 'két', 'há', 'egy', 'két'] },
      ],
      2: [{ name: '5 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt'] }],
      3: [{ name: '5 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként'] }],
      4: [{ name: '5 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel'] }],
    },
  },
  6: {
    tala: {
      1: [
        { name: '3+3', syllables: ['Ta', 'Ki', 'Ta', 'Ta', 'Ki', 'Ta'] },
        { name: '4+2', syllables: ['Ta', 'Ka', 'Di', 'Mi', 'Ta', 'Ka'] },
        { name: '2+4', syllables: ['Ta', 'Ka', 'Ta', 'Ka', 'Di', 'Mi'] },
        { name: '2+2+2', syllables: ['Ta', 'Ka', 'Ta', 'Ka', 'Ta', 'Ka'] },
      ],
    },
    magyar: {
      1: [
        { name: '6', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'hat'] },
        { name: '3+3', syllables: ['egy', 'két', 'há', 'egy', 'két', 'há'] },
        { name: '4+2', syllables: ['egy', 'két', 'há', 'négy', 'egy', 'két'] },
        { name: '2+4', syllables: ['egy', 'két', 'egy', 'két', 'há', 'négy'] },
        { name: '2+2+2', syllables: ['egy', 'két', 'egy', 'két', 'egy', 'két'] },
      ],
      2: [{ name: '6 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt', 'ha', 'tot'] }],
      3: [{ name: '6 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként', 'ha', 'ton', 'ként'] }],
      4: [{ name: '6 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel', 'ha', 'to', 'sá', 'val'] }],
    },
  },
  7: {
    tala: {
      1: [
        { name: '3+4', syllables: ['Ta', 'Ki', 'Te', 'Ta', 'Ka', 'Di', 'Mi'] },
        { name: '4+3', syllables: ['Ta', 'Ka', 'Di', 'Mi', 'Ta', 'Ki', 'Te'] },
      ],
    },
    magyar: {
      1: [
        { name: '7', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'hat', 'hét'] },
        { name: '3+4', syllables: ['egy', 'két', 'há', 'egy', 'két', 'há', 'négy'] },
        { name: '4+3', syllables: ['egy', 'két', 'há', 'négy', 'egy', 'két', 'há'] },
      ],
      2: [{ name: '7 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt', 'ha', 'tot', 'he', 'tet'] }],
      3: [{ name: '7 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként', 'ha', 'ton', 'ként', 'he', 'ten', 'ként'] }],
      4: [{ name: '7 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel', 'ha', 'to', 'sá', 'val', 'he', 'te', 'sé', 'vel'] }],
    },
  },
  8: {
    tala: { 1: [{ name: '4+4', syllables: ['Ta', 'Ka', 'Di', 'Mi', 'Ta', 'Ka', 'Di', 'Mi'] }] },
    magyar: { 
        1: [
            { name: '8', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'hat', 'hét', 'nyolc'] },
            { name: '4+4', syllables: ['egy', 'két', 'há', 'négy', 'egy', 'két', 'há', 'négy'] },
        ],
        2: [{ name: '8 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt', 'ha', 'tot', 'he', 'tet', 'nyol', 'cat'] }],
        3: [{ name: '8 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként', 'ha', 'ton', 'ként', 'he', 'ten', 'ként', 'nyol', 'can', 'ként'] }],
        4: [{ name: '8 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel', 'ha', 'to', 'sá', 'val', 'he', 'te', 'sé', 'vel', 'nyol', 'ca', 'sá', 'val'] }],
    },
  },
  9: {
    tala: { 1: [{ name: '3+3+3', syllables: ['Ta', 'Ki', 'Ta', 'Ta', 'Ki', 'Ta', 'Ta', 'Ki', 'Ta'] }] },
    magyar: { 
      1: [
        { name: '9', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc'] },
        { name: '3+3+3', syllables: ['egy', 'két', 'há', 'egy', 'két', 'há', 'egy', 'két', 'há'] },
      ],
      2: [{ name: '9 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt', 'ha', 'tot', 'he', 'tet', 'nyol', 'cat', 'ki', 'len', 'cet'] }],
      3: [{ name: '9 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként', 'ha', 'ton', 'ként', 'he', 'ten', 'ként', 'nyol', 'can', 'ként', 'ki', 'len', 'cen', 'ként'] }],
      4: [{ name: '9 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel', 'ha', 'to', 'sá', 'val', 'he', 'te', 'sé', 'vel', 'nyol', 'ca', 'sá', 'val', 'ki', 'len', 'ce', 'dik', 're'] }],
    },
  },
  10: {
    tala: { 1: [{ name: '5+5', syllables: ['Ta', 'Di', 'Ki', 'Na', 'Ka', 'Ta', 'Di', 'Ki', 'Na', 'Ka'] }] },
    magyar: { 
      1: [
        { name: '10', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz'] },
        { name: '5+5', syllables: ['egy', 'két', 'há', 'négy', 'öt', 'egy', 'két', 'há', 'négy', 'öt'] },
      ],
      2: [{ name: '10 - Nyolcad', syllables: ['e', 'gyet', 'ke', 'tőt', 'hár', 'mat', 'né', 'gyet', 'ö', 'töt', 'ha', 'tot', 'he', 'tet', 'nyol', 'cat', 'ki', 'len', 'cet', 'tí', 'zet'] }],
      3: [{ name: '10 - Triola', syllables: ['e', 'gyen', 'ként', 'ke', 'tőn', 'ként', 'hár', 'man', 'ként', 'né', 'gyen', 'ként', 'ö', 'tön', 'ként', 'ha', 'ton', 'ként', 'he', 'ten', 'ként', 'nyol', 'can', 'ként', 'ki', 'len', 'cen', 'ként', 'tí', 'zen', 'ként'] }],
      4: [{ name: '10 - Tizenhatod', syllables: ['e', 'gye', 'sé', 'vel', 'ke', 'te', 'sé', 'vel', 'hár', 'ma', 'sá', 'val', 'né', 'gye', 'sé', 'vel', 'ö', 'tö', 'sé', 'vel', 'ha', 'to', 'sá', 'val', 'he', 'te', 'sé', 'vel', 'nyol', 'ca', 'sá', 'val', 'ki', 'len', 'ce', 'dik', 're', 'ti', 'ze', 'dik', 're'] }],
    },
  },
};
