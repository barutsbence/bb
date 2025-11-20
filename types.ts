export enum Tab {
  Chords = 'Akkordmenet',
  Ideas = 'Ötletek',
  Quiz = 'Kvíz',
  Metronome = 'Metronóm',
  Tuner = 'Hangoló',
  Theory = 'Elmélet',
  Fretboard = 'Hangszeres Vizualizáció',
  Handpan = 'Handpan',
  BackingTracks = 'Kísérő Sávok',
  MidiToSheet = 'Kottaíró',
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Chord {
  name: string;
  voicing: string;
}

// FIX: Added missing type definitions for Scale, ChordData, and ChordShape.
export interface Scale {
  intervals: number[];
  degreeFormula: string;
  category: string;
  brightness?: number;
  modeOrder?: number;
  notesFromC?: string;
  shortName?: string;
}

export interface ChordData {
  intervals: number[];
  formula: string;
}

export interface ChordShape {
  name: string;
  frets: (number | 'x')[];
  fingers: (number | 'x')[];
  baseFret?: number;
}
