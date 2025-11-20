
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Card from './Card';
import { SCALES, CHORDS, CHORD_LIBRARY, chordTypes, MAJOR_SCALES_BY_ROOT_HU, MAJOR_SCALES_BY_ROOT_INTL } from '../constants';
import { useNotePlayer } from '../hooks/useNotePlayer';
import { getNoteNames } from '../services/notationService';
import { useMidiInput } from '../hooks/useMidiInput';

const FRET_COUNT = 15;

const GUITAR_TUNING = [
    { note: 'E', midi: 64 }, { note: 'H', midi: 59 }, { note: 'G', midi: 55 },
    { note: 'D', midi: 50 }, { note: 'A', midi: 45 }, { note: 'E', midi: 40 },
];
const BASS_4_STRING_TUNING = [
    { note: 'G', midi: 55 }, { note: 'D', midi: 50 }, { note: 'A', midi: 45 }, { note: 'E', midi: 40 },
];
const BASS_5_STRING_TUNING = [
    { note: 'G', midi: 55 }, { note: 'D', midi: 50 }, { note: 'A', midi: 45 }, { note: 'E', midi: 40 }, { note: 'H', midi: 35 },
];
const INSTRUMENT_TUNINGS_HU = { 'Gitár': GUITAR_TUNING, 'Basszus (4 húr)': BASS_4_STRING_TUNING, 'Basszus (5 húr)': BASS_5_STRING_TUNING };
const INSTRUMENT_TUNINGS_INTL = {
    'Guitar': GUITAR_TUNING.map(t => ({...t, note: t.note === 'H' ? 'B' : t.note})),
    'Bass (4-string)': BASS_4_STRING_TUNING.map(t => ({...t, note: t.note === 'H' ? 'B' : t.note})),
    'Bass (5-string)': BASS_5_STRING_TUNING.map(t => ({...t, note: t.note === 'H' ? 'B' : t.note})),
};
type Instrument = keyof typeof INSTRUMENT_TUNINGS_HU;
type DisplayRange = 'all' | 'one-octave' | 'position' | 'manual' | 'two-octaves';


const noteToMidi: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'H': 11, 'Cb': 11, 'B': 11, 'H#': 0,
    'Cx': 1, 'Dx': 3, 'Ex': 5, 'Fx': 7, 'Gx': 9, 'Ax': 11,
};
const getNoteMidi = (noteName: string): number => noteToMidi[noteName] ?? -1;
const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const midiToNoteName = (midi: number, requiredLetter: string, useHungarian: boolean): string => {
    const targetMidi = (midi + 12) % 12;

    if (useHungarian && requiredLetter === 'H' && targetMidi === 10) {
        return 'B';
    }

    const naturalMidi = getNoteMidi(requiredLetter);
    let diff = targetMidi - naturalMidi;

    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    const alterations: { [key: number]: string } = { [-2]: 'bb', [-1]: 'b', [0]: '', [1]: '#', [2]: 'x' };
    return requiredLetter + (alterations[diff] || '');
};


const getDiatonicChords = (scaleNotes: { name: string, midi: number }[]): {
    id: string;
    name: string;
    notes: { name: string; midi: number }[];
    notesMidiMod12: number[];
    type: 'triad' | 'seventh';
}[] => {
    if (scaleNotes.length !== 7) return [];
    const chords = [];
    const baseRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    for (let i = 0; i < 7; i++) {
        const root = scaleNotes[i]; const third = scaleNotes[(i + 2) % 7]; const fifth = scaleNotes[(i + 4) % 7]; const seventh = scaleNotes[(i + 6) % 7];
        
        const intervalToThird = (third.midi - root.midi + 12) % 12; const intervalToFifth = (fifth.midi - root.midi + 12) % 12; const intervalToSeventh = (seventh.midi - root.midi + 12) % 12;
        let quality = ''; let romanNumeral = baseRoman[i];
        if (intervalToThird === 4 && intervalToFifth === 7) quality = 'dúr';
        else if (intervalToThird === 3 && intervalToFifth === 7) { quality = 'moll'; romanNumeral = romanNumeral.toLowerCase(); }
        else if (intervalToThird === 3 && intervalToFifth === 6) { quality = 'szűkített'; romanNumeral = `${romanNumeral.toLowerCase()}°`; }
        else if (intervalToThird === 4 && intervalToFifth === 8) { quality = 'bővített'; romanNumeral = `${romanNumeral}+`; }
        let finalSuffix = '';
        if (quality === 'dúr' && intervalToSeventh === 11) finalSuffix = 'maj7'; else if (quality === 'dúr' && intervalToSeventh === 10) finalSuffix = '7'; else if (quality === 'moll' && intervalToSeventh === 10) finalSuffix = 'm7';
        else if (quality === 'szűkített' && intervalToSeventh === 10) { finalSuffix = 'm7♭5'; romanNumeral = `${romanNumeral.replace('°', '')}ø7`; } else if (quality === 'szűkített' && intervalToSeventh === 9) { finalSuffix = 'dim7'; romanNumeral = `${romanNumeral}°7`; }
        else if (quality === 'moll' && intervalToSeventh === 11) finalSuffix = 'm(maj7)'; else if (quality === 'bővített' && intervalToSeventh === 11) finalSuffix = 'maj7#5';
        
        if (quality) {
            const isSeventh = finalSuffix.includes('7') || finalSuffix.includes('dim');
            const chordNotes = isSeventh ? [root, third, fifth, seventh] : [root, third, fifth];
            chords.push({
                id: `${i}`,
                name: `${romanNumeral} - ${root.name}${finalSuffix}`,
                notes: chordNotes,
                notesMidiMod12: chordNotes.map(n => n.midi % 12),
                type: isSeventh ? 'seventh' : 'triad'
            });
        }
    }
    return chords;
};

const PianoRoll: React.FC<{ 
    notesToDisplay: { name: string; midi: number }[]; 
    primaryNoteMidi: number; 
    highlightedChordNotes: number[];
    midiActiveNotes: Set<number>;
    playNote: (midi: number) => void; 
    showRootNoteHighlight: boolean;
    displayRange: DisplayRange;
    rootNoteMidiForRange: number;
    manualMidiRange: { start: number; end: number } | null;
    firstMidiSelection: number | null;
    onKeySelect: (midi: number) => void;
    isSelectionLocked: boolean;
    isAbsoluteVoicingMode: boolean;
    noteNames: string[];
    fullScaleNotes: { name: string; midi: number }[];
}> = (props) => {
    const { notesToDisplay, primaryNoteMidi, highlightedChordNotes, midiActiveNotes, playNote, showRootNoteHighlight, displayRange, rootNoteMidiForRange, manualMidiRange, firstMidiSelection, onKeySelect, isSelectionLocked, isAbsoluteVoicingMode, noteNames, fullScaleNotes } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const checkSize = () => {
            if (containerRef.current) {
                const style = window.getComputedStyle(containerRef.current);
                const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
                setContainerWidth(containerRef.current.offsetWidth - paddingX);
            }
        };

        checkSize();
        const resizeObserver = new ResizeObserver(checkSize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);
    
    const { startMidi, endMidi } = useMemo(() => {
        if (isAbsoluteVoicingMode && notesToDisplay.length > 0) {
            const minMidi = Math.min(...notesToDisplay.map(n => n.midi));
            const maxMidi = Math.max(...notesToDisplay.map(n => n.midi));
            const startOctave = Math.floor(minMidi / 12) * 12;
            const endOctave = Math.ceil(maxMidi / 12) * 12 + 11;
            return { startMidi: Math.max(21, startOctave), endMidi: Math.min(108, endOctave) };
        }

        const isMobile = containerWidth > 0 && containerWidth < 500;
        const fullRange = { startMidi: 48, endMidi: isMobile ? 72 : 84 };

        if (displayRange === 'manual') {
            if (manualMidiRange && !firstMidiSelection) {
                return { startMidi: manualMidiRange.start, endMidi: manualMidiRange.end };
            }
             // During selection, show a wider range to make it easier.
            if (firstMidiSelection !== null) {
                const base = Math.floor(firstMidiSelection / 12) * 12;
                return { startMidi: base, endMidi: base + 23 };
            }
            return fullRange;
        }


        if (displayRange === 'one-octave' || displayRange === 'two-octaves') {
            const referenceNotes = notesToDisplay.filter(n => n.midi % 12 === (rootNoteMidiForRange % 12));
            const referenceMidi = referenceNotes.length > 0 ? Math.min(...referenceNotes.map(n => n.midi)) : (notesToDisplay.length > 0 ? Math.min(...notesToDisplay.map(n => n.midi)) : 60);

            if (referenceMidi === Infinity) return fullRange;
            
            const rootOctaveStartMidi = Math.floor(referenceMidi / 12) * 12;
            const octaves = displayRange === 'one-octave' ? 1 : 2;
            return { startMidi: rootOctaveStartMidi, endMidi: rootOctaveStartMidi + (12 * octaves) -1 };
        }

        return fullRange; // 'all' or default
    }, [displayRange, manualMidiRange, firstMidiSelection, containerWidth, notesToDisplay, rootNoteMidiForRange, isAbsoluteVoicingMode]);


    const whiteKeyIndices = [0, 2, 4, 5, 7, 9, 11];
    const numWhiteKeys = useMemo(() => {
        return Array.from({ length: endMidi - startMidi + 1 }, (_, i) => startMidi + i)
            .filter(m => whiteKeyIndices.includes(m % 12)).length;
    }, [startMidi, endMidi]);

    const whiteKeyWidth = containerWidth > 0 ? containerWidth / numWhiteKeys : 0;
    const blackKeyWidth = whiteKeyWidth * 0.6;

    const renderKeys = () => {
        if (containerWidth === 0) return null;

        const keys = [];
        let whiteKeyCounter = 0;
        const isSelectionMode = displayRange === 'manual';

        for (let midi = startMidi; midi <= endMidi; midi++) {
            const noteMod12 = midi % 12;
            const isBlack = !whiteKeyIndices.includes(noteMod12);

            const noteToRender = isAbsoluteVoicingMode
                ? notesToDisplay.find(n => n.midi === midi)
                : notesToDisplay.find(n => n.midi % 12 === noteMod12);

            const isMidiActive = midiActiveNotes.has(midi);
             let noteName = '';
            if (noteToRender || isMidiActive) {
                noteName = noteNames[midi % 12];
            } else if (!isAbsoluteVoicingMode) {
                // Show scale note names even when not "active"
                const scaleNote = fullScaleNotes.find(n => n.midi % 12 === midi % 12);
                if (scaleNote) {
                    noteName = scaleNote.name;
                }
            }
            
            let keyClasses = '';
            const isPendingSelection = firstMidiSelection === midi;
            const onClickHandler = (isSelectionMode && !isSelectionLocked) ? () => onKeySelect(midi) : () => playNote(midi);

            if (isMidiActive) {
                keyClasses = 'bg-yellow-400 border-yellow-200 text-gray-900 ring-2 ring-yellow-300 shadow-lg z-20';
            } else if (isPendingSelection) {
                keyClasses = 'bg-yellow-500 border-yellow-300 text-black ring-2 ring-yellow-200 z-20';
            } else if (noteToRender) {
                const isPrimary = showRootNoteHighlight && (isAbsoluteVoicingMode ? noteToRender.midi % 12 === primaryNoteMidi : noteMod12 === primaryNoteMidi);
                const isHighlightedChordNote = highlightedChordNotes.includes(isAbsoluteVoicingMode ? noteToRender.midi % 12 : noteMod12);

                if (isPrimary) keyClasses = 'bg-teal-400 border-teal-200 text-gray-900';
                else if (isHighlightedChordNote) keyClasses = 'bg-yellow-400 border-yellow-200 text-gray-900';
                else keyClasses = 'bg-gray-300 border-gray-400 text-black';
            }

            if (isBlack) {
                const defaultClasses = 'bg-gray-800 border-gray-900 text-gray-300';
                keys.push(<button key={midi} onClick={onClickHandler} className={`absolute h-2/3 border rounded-b-md z-10 flex items-end justify-center pb-1 text-xs font-semibold transition-colors ${keyClasses || defaultClasses} hover:opacity-80 active:opacity-100`} style={{ width: `${blackKeyWidth}px`, left: `${(whiteKeyCounter * whiteKeyWidth) - (blackKeyWidth / 2)}px` }}>{noteName.replace(/\d+$/, '')}</button>);
            } else {
                const defaultClasses = 'bg-white border-gray-300 text-gray-600';
                keys.push(<button key={midi} onClick={onClickHandler} className={`h-full border-r border-b border-gray-400 rounded-b-md flex items-end justify-center pb-2 font-semibold transition-colors relative ${keyClasses || defaultClasses} hover:opacity-80 active:opacity-100`} style={{ width: `${whiteKeyWidth}px` }}>{noteName.replace(/\d+$/, '')}</button>);
                whiteKeyCounter++;
            }
        }
        return keys;
    };

    return (
        <div ref={containerRef} className="mt-6 bg-gray-800/50 p-2 sm:p-4 rounded-lg shadow-inner">
            <div className="relative h-48 flex" style={{ width: '100%' }}>
                {renderKeys()}
            </div>
        </div>
    );
};

const FretboardVisualizer: React.FC = () => {
    const [useSharpNotation, setUseSharpNotation] = useState(true);
    const [useHungarianNotation, setUseHungarianNotation] = useState(true);
    const [view, setView] = useState<'Fogólap' | 'Zongora'>('Fogólap');
    const [visualizationType, setVisualizationType] = useState<'Skálák' | 'Akkordok'>('Skálák');
    const [selectedItem, setSelectedItem] = useState('Dúr (Ión)');
    const [rootMidi, setRootMidi] = useState(0); // Store root note as MIDI value (0 for C)
    const [highlightedChordId, setHighlightedChordId] = useState<string | null>(null);
    const [isSortedByBrightness, setIsSortedByBrightness] = useState(false);
    const [instrument, setInstrument] = useState<Instrument>('Gitár');
    const [voicingIndex, setVoicingIndex] = useState(0);
    const [isSequencePlaying, setIsSequencePlaying] = useState(false);
    const [showRootNoteHighlight, setShowRootNoteHighlight] = useState(true);
    const [selectedVoicingDegrees, setSelectedVoicingDegrees] = useState<Record<number, number>>({});
    const [displayRange, setDisplayRange] = useState<DisplayRange>('manual');
    const [manualFretRange, setManualFretRange] = useState<{ start: number; end: number } | null>(null);
    const [firstFretSelection, setFirstFretSelection] = useState<number | null>(null);
    const { playNote, playNotes, init: initAudio } = useNotePlayer();
    const [activeStrings, setActiveStrings] = useState<boolean[]>(INSTRUMENT_TUNINGS_HU[instrument].map(() => true));
    const [manualMidiRange, setManualMidiRange] = useState<{ start: number; end: number } | null>(null);
    const [firstMidiSelection, setFirstMidiSelection] = useState<number | null>(null);
    const [chordVoicing, setChordVoicing] = useState<'standard' | 'drop2' | 'drop3'>('standard');
    const [midiActiveNotes, setMidiActiveNotes] = useState<Set<number>>(new Set());
    const [midiHighlightedPositions, setMidiHighlightedPositions] = useState<Map<number, { stringIndex: number; fret: number }[]>>(new Map());
    
    // State for progression playback
    const [progressionNotesToDisplay, setProgressionNotesToDisplay] = useState<{ name: string; midi: number }[] | null>(null);
    const [activeProgressionChord, setActiveProgressionChord] = useState<string | null>(null);
    const [isProgressionPlaying, setIsProgressionPlaying] = useState(false);


    const noteNames = getNoteNames(useSharpNotation, useHungarianNotation);
    const rootNote = noteNames[rootMidi];

    useEffect(() => {
        const init = () => {
            initAudio();
        };
        window.addEventListener('click', init, { once: true });
        window.addEventListener('touchstart', init, { once: true });
        return () => {
            window.removeEventListener('click', init);
            window.removeEventListener('touchstart', init);
        };
    }, [initAudio]);
    
    const onMidiMessage = useCallback((event: MIDIMessageEvent) => {
        const tuning = useHungarianNotation ? INSTRUMENT_TUNINGS_HU[instrument] : INSTRUMENT_TUNINGS_INTL[instrument as keyof typeof INSTRUMENT_TUNINGS_INTL];
        const command = event.data[0];
        const noteMidi = event.data[1];
        const velocity = event.data.length > 2 ? event.data[2] : 0;
    
        // Note On
        if ((command & 0xF0) === 0x90 && velocity > 0) {
            playNote({
                frequency: midiToFreq(noteMidi),
                instrument: view === 'Zongora' ? 'piano' : 'guitar'
            });
            
            setMidiActiveNotes(prev => new Set(prev).add(noteMidi));

            const isTransposingFretboard = view === 'Fogólap' && (instrument === 'Gitár' || instrument.startsWith('Basszus'));
            const displayMidi = isTransposingFretboard ? noteMidi - 12 : noteMidi;

            // If a manual range is set on the fretboard, find all positions within that range.
            // Otherwise, fall back to showing the single, lowest-fret position.
            if (manualFretRange && view === 'Fogólap') {
                const positionsInRange: { stringIndex: number, fret: number }[] = [];
                for (let i = 0; i < tuning.length; i++) {
                    const stringMidi = tuning[i].midi;
                    const fret = displayMidi - stringMidi;
                    if (fret >= manualFretRange.start && fret <= manualFretRange.end && fret <= FRET_COUNT) {
                        positionsInRange.push({ stringIndex: i, fret: fret });
                    }
                }
                if (positionsInRange.length > 0) {
                    setMidiHighlightedPositions(prev => {
                        const newMap = new Map(prev);
                        newMap.set(noteMidi, positionsInRange);
                        return newMap;
                    });
                }
            } else {
                // Original logic: find the single best (lowest) position
                let bestPosition: { stringIndex: number, fret: number } | null = null;
                for (let i = 0; i < tuning.length; i++) {
                    const stringMidi = tuning[i].midi;
                    const fret = displayMidi - stringMidi;
                    if (fret >= 0 && fret <= FRET_COUNT) {
                        if (!bestPosition || fret < bestPosition.fret) {
                            bestPosition = { stringIndex: i, fret: fret };
                        }
                    }
                }
                if (bestPosition) {
                    setMidiHighlightedPositions(prev => {
                        const newMap = new Map(prev);
                        newMap.set(noteMidi, [bestPosition]); // Store as an array with one item
                        return newMap;
                    });
                }
            }
        } 
        // Note Off
        else if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocity === 0)) {
            setMidiActiveNotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(noteMidi);
                return newSet;
            });
            setMidiHighlightedPositions(prev => {
                const newMap = new Map(prev);
                newMap.delete(noteMidi);
                return newMap;
            });
        }
    }, [playNote, view, instrument, useHungarianNotation, manualFretRange]);

    const { midiInputs, midiAccessError } = useMidiInput(onMidiMessage);

    useEffect(() => {
        const tuning = useHungarianNotation ? INSTRUMENT_TUNINGS_HU[instrument] : INSTRUMENT_TUNINGS_INTL[instrument as keyof typeof INSTRUMENT_TUNINGS_INTL];
        setActiveStrings(tuning.map(() => true));
    }, [instrument, useHungarianNotation]);

    const handleToggleString = (indexToToggle: number) => {
        setActiveStrings(prev => prev.map((isActive, index) => (index === indexToToggle ? !isActive : isActive)));
    };

    useEffect(() => {
        setDisplayRange(view === 'Fogólap' ? 'manual' : 'all');
        setManualFretRange(null);
        setFirstFretSelection(null);
        setManualMidiRange(null);
        setFirstMidiSelection(null);
    }, [view]);

    const getEnharmonicallyCorrectNotes = useMemo(() => {
        const flatToSharpMap: Record<string, string> = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'B':'A#', 'Bb':'A#', 'Cb':'H' };

        return (root: string, intervals: number[], degreeFormula: string | undefined, useHungarian: boolean): { name: string; midi: number }[] => {
            const rootMidiValue = getNoteMidi(root);
            if (rootMidiValue === -1) return [];
            
            if (!degreeFormula) { // Fallback for simple chords without a scale context
                 return intervals.map((interval) => {
                    const finalMidi = rootMidiValue + interval;
                    const name = getNoteNames(useSharpNotation, useHungarian)[finalMidi % 12];
                    return { name, midi: finalMidi + 48 };
                });
            }

            const currentMajorScales = useHungarian ? MAJOR_SCALES_BY_ROOT_HU : MAJOR_SCALES_BY_ROOT_INTL;
            let referenceScaleKey = root;

            if (!currentMajorScales[referenceScaleKey]) {
                const convertedKey = flatToSharpMap[root];
                if (convertedKey && currentMajorScales[convertedKey]) {
                    referenceScaleKey = convertedKey;
                }
            }
            
            const majorScaleNames = currentMajorScales[referenceScaleKey as keyof typeof currentMajorScales];
            if (!majorScaleNames) {
                return intervals.map((interval) => {
                    const finalMidi = rootMidiValue + interval;
                    const name = getNoteNames(useSharpNotation, useHungarian)[finalMidi % 12];
                    return { name, midi: finalMidi + 48 };
                });
            }
            
            const formulaDegrees = degreeFormula.split('-').map(d => parseInt(d.replace(/[b#x]/g, ''), 10));

            return intervals.map((interval, i) => {
                const degreeNum = formulaDegrees[i];
                if (!degreeNum || degreeNum < 1 || degreeNum > majorScaleNames.length) return { name: '?', midi: 0 };
                const baseNoteName = majorScaleNames[degreeNum - 1];
                const requiredLetter = baseNoteName.replace(/[#b]/g, '');
                
                const finalMidi = rootMidiValue + interval;
                const name = midiToNoteName(finalMidi, requiredLetter, useHungarian);
                return { name, midi: finalMidi + 48 };
            });
        };
    }, [useSharpNotation, useHungarianNotation]);
    
    const availableRootNotes = useMemo(() => {
        if (view === 'Zongora') {
            return getNoteNames(useSharpNotation, useHungarianNotation);
        }
    
        const sharpHuRoots = Object.keys(CHORD_LIBRARY);
        const noteNamesSharpHu = getNoteNames(true, true);
    
        const availableMidiValues = sharpHuRoots.map(root => noteNamesSharpHu.indexOf(root)).filter(midi => midi !== -1);
        
        const targetNoteNames = getNoteNames(useSharpNotation, useHungarianNotation);
    
        const displayRoots = availableMidiValues.map(midi => targetNoteNames[midi]);
    
        return [...new Set(displayRoots)];
    }, [useSharpNotation, useHungarianNotation, view]);
    
    const rootKeyForLibrary = useMemo(() => {
        const noteNamesSharpHu = getNoteNames(true, true);
        return noteNamesSharpHu[rootMidi];
    }, [rootMidi]);
    

    const groupedScales: Record<string, [string, typeof SCALES[string]][]> = useMemo(() => {
        const categoryOrder = ['Dúr móduszai', 'Dallamos moll móduszai', 'Összhangzatos moll móduszai', 'Egyéb'];
        const grouped = Object.entries(SCALES).reduce((acc, [name, data]) => {
            const category = data.category || 'Egyéb';
            if (!acc[category]) { acc[category] = []; }
            acc[category].push([name, data] as [string, typeof SCALES[string]]);
            return acc;
        }, {} as Record<string, [string, typeof SCALES[string]][]>);
        for (const category in grouped) {
            if (isSortedByBrightness) { grouped[category].sort(([, aData], [, bData]) => (bData.brightness ?? 0) - (aData.brightness ?? 0)); }
            else { grouped[category].sort(([, aData], [, bData]) => (aData.modeOrder ?? 99) - (bData.modeOrder ?? 99)); }
        }
        return Object.fromEntries(Object.entries(grouped).sort(([catA], [catB]) => { const indexA = categoryOrder.indexOf(catA); const indexB = categoryOrder.indexOf(catB); return indexA === -1 ? 1 : indexB === -1 ? -1 : indexA - indexB; }));
    }, [isSortedByBrightness]);

    useEffect(() => {
        setVoicingIndex(0);
        setSelectedVoicingDegrees({});
        setChordVoicing('standard');
        if (visualizationType === 'Skálák') { setSelectedItem('Dúr (Ión)'); }
        else { 
            if (view === 'Fogólap') {
                const qualities = Object.keys(CHORD_LIBRARY[rootKeyForLibrary as keyof typeof CHORD_LIBRARY] || CHORD_LIBRARY['C']);
                setSelectedItem(qualities[0] || 'Major');
            } else {
                setSelectedItem(Object.keys(CHORDS)[0]);
            }
        }
    }, [visualizationType, rootNote, rootKeyForLibrary, view]);

    useEffect(() => { setVoicingIndex(0); }, [selectedItem]);
    useEffect(() => { setHighlightedChordId(null); }, [rootNote, selectedItem, visualizationType, view]);
    
    const { availableQualities, availableVoicings, selectedChordShape } = useMemo(() => {
        if (visualizationType !== 'Akkordok' || view !== 'Fogólap' || chordVoicing !== 'standard') return { availableQualities: [], availableVoicings: [], selectedChordShape: null };
        const rootChords = CHORD_LIBRARY[rootKeyForLibrary as keyof typeof CHORD_LIBRARY];
        if (!rootChords) return { availableQualities: [], availableVoicings: [], selectedChordShape: null };
        const qualities = Object.keys(rootChords);
        const voicings = rootChords[selectedItem as keyof typeof rootChords] || [];
        const shape = voicings[voicingIndex] || null;
        return { availableQualities: qualities, availableVoicings: voicings, selectedChordShape: shape };
    }, [visualizationType, rootKeyForLibrary, selectedItem, voicingIndex, view, chordVoicing]);

    const { notesToDisplay, primaryNoteMidi, scaleInfo, fullScaleNotes, detailedDiatonicChords, currentChordData, isAbsoluteVoicingMode } = useMemo(() => {
        if (progressionNotesToDisplay) {
            return {
                notesToDisplay: progressionNotesToDisplay,
                primaryNoteMidi: progressionNotesToDisplay.length > 0 ? progressionNotesToDisplay[0].midi % 12 : -1,
                scaleInfo: null,
                fullScaleNotes: [],
                detailedDiatonicChords: [],
                currentChordData: null,
                isAbsoluteVoicingMode: true,
            };
        }

        const rootMidiValue = getNoteMidi(rootNote);
        if (rootMidiValue === -1) return { notesToDisplay: [], primaryNoteMidi: -1, scaleInfo: null, fullScaleNotes: [], detailedDiatonicChords: [], currentChordData: null, isAbsoluteVoicingMode: false };
        
        let notes: { name: string; midi: number }[] = []; 
        let currentFullScaleNotes: { name: string; midi: number }[] = [];
        let info = null;
        let primaryMidi = rootMidiValue % 12;
        let diatonicChordsResult: ReturnType<typeof getDiatonicChords> = [];
        let chordDataResult = null;
        let isAbsolute = false;

        if (visualizationType === 'Skálák') {
            info = SCALES[selectedItem as keyof typeof SCALES]; 
            if (info) {
                currentFullScaleNotes = getEnharmonicallyCorrectNotes(rootNote, info.intervals, info.degreeFormula, useHungarianNotation);
                diatonicChordsResult = getDiatonicChords(currentFullScaleNotes);
                const selectedDiatonicChord = diatonicChordsResult.find(c => c.id === highlightedChordId);
                
                if (selectedDiatonicChord) {
                    notes = currentFullScaleNotes;
                    primaryMidi = selectedDiatonicChord.notes[0].midi % 12;
                } else if (Object.keys(selectedVoicingDegrees).length > 0) {
                    notes = Object.entries(selectedVoicingDegrees).map(([degreeStr, alteration]) => {
                        const degree = parseInt(degreeStr);
                        const octaveOffset = Math.floor((degree - 1) / 7) * 12;
                        const scaleIndex = (degree - 1) % 7;
                        const baseNote = currentFullScaleNotes[scaleIndex];
                        if (!baseNote) return null;

                        const finalMidi = baseNote.midi + octaveOffset + (alteration as number);
                        const noteName = noteNames[finalMidi % 12];
                        const displayOctave = Math.floor(finalMidi / 12) -1;
                        return { name: `${noteName}${displayOctave}`, midi: finalMidi };
                    }).filter((note): note is { name: string; midi: number } => Boolean(note));
                    isAbsolute = true;
                } else {
                    notes = currentFullScaleNotes;
                }
            }
        } else { // 'Akkordok'
            if (view === 'Fogólap' && chordVoicing === 'standard') {
                const chordKey = (chordTypes[selectedItem] || selectedItem).split(' ')[0];
                const chordDataEntry = Object.entries(CHORDS).find(([name]) => name.startsWith(chordKey));
                chordDataResult = chordDataEntry ? chordDataEntry[1] : null;
            } else {
                chordDataResult = CHORDS[selectedItem as keyof typeof CHORDS];
            }

            if (chordDataResult) {
                const closeVoicingNotes: {name: string, midi: number}[] = getEnharmonicallyCorrectNotes(rootNote, chordDataResult.intervals, chordDataResult.formula, useHungarianNotation);
                
                if (chordVoicing !== 'standard' && closeVoicingNotes.length === 4) {
                    isAbsolute = true;
                    const root = closeVoicingNotes[0]; const third = closeVoicingNotes[1]; const fifth = closeVoicingNotes[2]; const seventh = closeVoicingNotes[3];

                    if (chordVoicing === 'drop2') {
                        const droppedFifth = { ...fifth, midi: fifth.midi - 12 };
                        notes = [droppedFifth, root, third, seventh].sort((a: { midi: number }, b: { midi: number }) => a.midi - b.midi);
                    } else if (chordVoicing === 'drop3') {
                        const droppedThird = { ...third, midi: third.midi - 12 };
                        notes = [droppedThird, root, fifth, seventh].sort((a: { midi: number }, b: { midi: number }) => a.midi - b.midi);
                    }
                } else {
                    notes = closeVoicingNotes;
                }
            }
        }
        return { notesToDisplay: notes, primaryNoteMidi: primaryMidi, scaleInfo: info, fullScaleNotes: currentFullScaleNotes, detailedDiatonicChords: diatonicChordsResult, currentChordData: chordDataResult, isAbsoluteVoicingMode: isAbsolute };
    }, [progressionNotesToDisplay, visualizationType, selectedItem, rootNote, view, getEnharmonicallyCorrectNotes, highlightedChordId, selectedVoicingDegrees, useHungarianNotation, chordVoicing, noteNames]);
    
    const highlightedChordNotes = useMemo(() => {
        if (visualizationType !== 'Skálák' || !highlightedChordId) return [];
        const selectedDiatonicChord = detailedDiatonicChords.find(c => c.id === highlightedChordId);
        if (!selectedDiatonicChord) return [];

        if (Object.keys(selectedVoicingDegrees).length > 0) {
            return notesToDisplay.map(note => note.midi % 12);
        }
        return selectedDiatonicChord.notesMidiMod12;
    }, [visualizationType, detailedDiatonicChords, highlightedChordId, selectedVoicingDegrees, notesToDisplay]);
    
    const handlePlaySequence = () => {
        let notesToPlayMidi: number[] = []; let isChord = false;
        
        if (visualizationType === 'Skálák') {
            isChord = Object.keys(selectedVoicingDegrees).length > 0;
            if (notesToDisplay.length > 0) {
                 notesToPlayMidi = notesToDisplay.map(n => n.midi);
                 if (!isChord) { notesToPlayMidi.push(notesToDisplay[0].midi + 12); }
            }
        } else if (visualizationType === 'Akkordok') {
            isChord = true;
            if (view === 'Fogólap' && selectedChordShape && chordVoicing === 'standard') {
                const tuning = useHungarianNotation ? INSTRUMENT_TUNINGS_HU[instrument] : INSTRUMENT_TUNINGS_INTL[instrument as keyof typeof INSTRUMENT_TUNINGS_INTL];
                const chordMidiNotes = selectedChordShape.frets
                    .map((fret: number | 'x', i) => (activeStrings[i] && typeof fret === 'number' ? tuning[i].midi + fret : -1))
                    .filter(midi => midi !== -1);
                // FIX: Explicitly provide the type argument to `new Set()` to ensure correct type inference.
                notesToPlayMidi = [...new Set<number>(chordMidiNotes)].sort((a: number, b: number) => a - b);
            } else {
                 notesToPlayMidi = notesToDisplay.map(n => n.midi);
                 if (view === 'Zongora') {
                    notesToPlayMidi = notesToPlayMidi.map(midi => midi + 12);
                 }
            }
        }

        if (notesToPlayMidi.length === 0) return; 
        setIsSequencePlaying(true);
        const instrumentType = view === 'Zongora' ? 'piano' : 'guitar';
        playNotes(notesToPlayMidi.map(midiToFreq), isChord ? 'chord' : 'arpeggio', 300, instrumentType).then(() => { setIsSequencePlaying(false); });
    };
    
    const handlePlayNote = (midi: number) => {
        const finalMidi = (view === 'Zongora' && visualizationType === 'Akkordok') ? midi + 12 : midi;
        playNote({
            frequency: midiToFreq(finalMidi),
            instrument: view === 'Zongora' ? 'piano' : 'guitar'
        });
    };

    const handleVoicingDegreeToggle = (degree: number) => {
        setSelectedVoicingDegrees(prev => {
            const existingAlteration = prev[degree];
            const newDegrees = { ...prev };

            if (existingAlteration === undefined) {
                newDegrees[degree] = 0; // Natural
            } else if (existingAlteration === 0) {
                newDegrees[degree] = 1; // Sharp
            } else if (existingAlteration === 1) {
                newDegrees[degree] = -1; // Flat
            } else { // -1 (Flat) -> remove
                delete newDegrees[degree];
            }
            return newDegrees;
        });
    };

    const handleVoicingPresetClick = (degrees: number[]) => {
        const newVoicing: Record<number, number> = {};
        degrees.forEach(d => newVoicing[d] = 0);
        setSelectedVoicingDegrees(newVoicing);
    };

    const handleDiatonicChordClick = (chordId: string) => {
        setSelectedVoicingDegrees({});
        const isDeselecting = highlightedChordId === chordId;
        setHighlightedChordId(isDeselecting ? null : chordId);
        if (!isDeselecting) {
            setShowRootNoteHighlight(false);
        }
    };
    
    const handleFretNumberClick = (fret: number) => {
        if (displayRange !== 'manual') return;

        if (firstFretSelection === null) {
            setFirstFretSelection(fret);
            setManualFretRange({ start: fret, end: fret });
        } else {
            const start = Math.min(firstFretSelection, fret);
            const end = Math.max(firstFretSelection, fret);
            setManualFretRange({ start, end });
            setFirstFretSelection(null);
        }
    };
    
    const handlePianoKeySelection = (midi: number) => {
        if (displayRange !== 'manual' || view !== 'Zongora') return;

        if (firstMidiSelection === null) {
            setFirstMidiSelection(midi);
        } else {
            const start = Math.min(firstMidiSelection, midi);
            const end = Math.max(firstMidiSelection, midi);
            setManualMidiRange({ start, end });
            setFirstMidiSelection(null);
        }
    };

    const handleClearManualRange = () => {
        setManualFretRange(null);
        setFirstFretSelection(null);
        setManualMidiRange(null);
        setFirstMidiSelection(null);
    };

    const isPianoSelectionLocked = manualMidiRange !== null && firstMidiSelection === null;
    
    const handleRootNoteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newNoteName = event.target.value;
        const noteNamesForLookup = getNoteNames(useSharpNotation, useHungarianNotation);
        const newMidi = noteNamesForLookup.indexOf(newNoteName);
        if (newMidi !== -1) {
            setRootMidi(newMidi);
        }
    };

    const renderFretboard = () => {
        const frets = Array.from({ length: FRET_COUNT + 1 }, (_, i) => i);
        const fretMarkers = [3, 5, 7, 9, 12];
        const tuning = useHungarianNotation ? INSTRUMENT_TUNINGS_HU[instrument] : INSTRUMENT_TUNINGS_INTL[instrument as keyof typeof INSTRUMENT_TUNINGS_INTL];
        const baseFretForChord = selectedChordShape?.baseFret ?? 1;

        return (
            <div className="mt-6 bg-gray-800/50 p-2 sm:p-4 rounded-lg overflow-x-auto shadow-inner">
                <div className="relative inline-block min-w-[1100px] font-sans">
                    <div className="flex"><div style={{width: '40px'}} className="text-center font-bold text-lg text-gray-400">{visualizationType === 'Akkordok' && baseFretForChord > 1 && baseFretForChord}</div>{frets.slice(1).map(fret => {
                        const isSelected = manualFretRange && fret >= manualFretRange.start && fret <= manualFretRange.end;
                        const isPendingSelection = firstFretSelection === fret;
                        return (<div key={`num-${fret}`} style={{width: '70px'}} className="text-center text-xs text-gray-400 pb-1">
                             <button 
                                onClick={() => handleFretNumberClick(fret)}
                                disabled={displayRange !== 'manual'}
                                className={`w-full h-full rounded-md py-1 transition-colors ${displayRange === 'manual' ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'} ${isSelected ? 'bg-teal-600 text-white' : ''} ${isPendingSelection ? 'bg-yellow-500 text-black' : ''}`}
                            >
                                {fretMarkers.includes(fret) ? fret : ''}
                            </button>
                        </div>);
                    })}</div>
                    <div className="relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-md">
                        <div className="flex absolute top-0 left-0 right-0 bottom-0" style={{ paddingLeft: '40px' }}>{frets.slice(1).map(fret => (<div key={`wire-${fret}`} className="relative border-r border-gray-500/60" style={{width: '70px'}}>{fretMarkers.includes(fret) && fret !== 12 && ( <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-900/60 rounded-full"></div> )}{fret === 12 && ( <> <div className="absolute left-1/2 -translate-x-1/2 top-1/3 -translate-y-1/2 w-2.5 h-2.5 bg-gray-900/60 rounded-full"></div> <div className="absolute left-1/2 -translate-x-1/2 top-2/3 -translate-y-1/2 w-2.5 h-2.5 bg-gray-900/60 rounded-full"></div> </> )}</div>))}</div>
                        {manualFretRange && displayRange === 'manual' && (
                            <div 
                                className="absolute top-0 bottom-0 bg-teal-500/10"
                                style={{
                                    left: `${40 + (manualFretRange.start - 1) * 70}px`,
                                    width: `${(manualFretRange.end - manualFretRange.start + 1) * 70}px`,
                                }}
                            ></div>
                        )}
                        {visualizationType === 'Akkordok' && baseFretForChord === 1 && <div className="absolute top-0 bottom-0 left-[36px] w-1.5 bg-slate-300 rounded-sm"></div>}
                        <div className="relative z-10">{tuning.map((stringInfo, stringIndex) => {
                            const isActive = activeStrings[stringIndex];
                            return (<div key={stringIndex} className="relative flex items-center h-10"><div className={`absolute w-full ${isActive ? 'bg-gray-400/50' : 'bg-gray-700/50'}`} style={{ height: `${1 + (tuning.length - 1 - stringIndex) * 0.3}px` }}></div><div className="flex w-full items-center">{frets.map(fret => {
                                const shouldHighlightOpenString = (() => {
                                    if (fret !== 0) return false;
                                    const openStringMidiNote = stringInfo.midi;
                                    const noteToRender = notesToDisplay.find(n => n.midi % 12 === openStringMidiNote % 12);
                                    if (!noteToRender) return false;

                                    if (displayRange !== 'manual' || !manualFretRange) return true;
                                    return manualFretRange.start <= 1;
                                })();

                                return (<div key={`${stringIndex}-${fret}`} className="relative flex justify-center items-center" style={{ width: fret === 0 ? '40px' : '70px' }}>{(() => {
                                    if (fret === 0) {
                                        const openStringMidiNote = stringInfo.midi;
                                        const isMidiActiveOnOpenString = [...midiHighlightedPositions.values()].flat().some(p => p.stringIndex === stringIndex && p.fret === 0);
                                        const fretForChord = selectedChordShape?.frets[stringIndex];

                                        if (visualizationType === 'Akkordok' && selectedChordShape && chordVoicing === 'standard') {
                                            if (fretForChord === 'x') return <span className="text-red-400 text-2xl font-bold">×</span>;
                                            if (fretForChord === 0) {
                                                const isPrimary = showRootNoteHighlight && openStringMidiNote % 12 === primaryNoteMidi;
                                                const noteClass = isMidiActiveOnOpenString 
                                                    ? 'bg-yellow-400 text-gray-900 border-yellow-200 ring-2 ring-yellow-300' 
                                                    : (isPrimary ? 'bg-teal-400 text-gray-900 border-teal-200' : 'bg-slate-300 text-gray-800 border-slate-400');
                                                return <button onClick={() => handlePlayNote(stringInfo.midi)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 shadow-md border-2 ${noteClass}`}>{stringInfo.note}</button>;
                                            }
                                        }
                                        
                                        if (shouldHighlightOpenString || isMidiActiveOnOpenString) {
                                            const isPrimary = showRootNoteHighlight && openStringMidiNote % 12 === primaryNoteMidi;
                                            const isHighlighted = highlightedChordNotes.includes(openStringMidiNote % 12);
                                            let noteClasses = '';
                                            if (isMidiActiveOnOpenString) noteClasses = 'bg-yellow-400 text-gray-900 border-yellow-200 ring-2 ring-yellow-300';
                                            else if (isPrimary) noteClasses = 'bg-teal-400 text-gray-900 border-teal-200';
                                            else if (isHighlighted) noteClasses = 'bg-yellow-400 text-gray-900 border-yellow-200';
                                            else noteClasses = 'bg-slate-300 text-gray-800 border-slate-400';
                                            return <button onClick={() => handlePlayNote(stringInfo.midi)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 shadow-md border-2 ${noteClasses}`}>{stringInfo.note}</button>;
                                        }

                                        const buttonClass = isActive ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-800 text-gray-500';
                                        return (<button onClick={() => handleToggleString(stringIndex)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${buttonClass}`} title={isActive ? 'Húr kikapcsolása' : 'Húr bekapcsolása'}>{stringInfo.note}</button>);
                                    }
                                    
                                    if (!isActive) return null;

                                    const isFretVisible = (() => {
                                        if (displayRange !== 'manual' || !manualFretRange) return true;
                                        return fret >= manualFretRange.start && fret <= manualFretRange.end;
                                    })();
                                    if (!isFretVisible) return null;

                                    const noteMidiValue = stringInfo.midi + fret;
                                    let isMidiActive = false;
                                    for (const positions of midiHighlightedPositions.values()) {
                                        if (positions.some(p => p.stringIndex === stringIndex && p.fret === fret)) {
                                            isMidiActive = true;
                                            break;
                                        }
                                    }

                                    let noteClasses = '';
                                    if (isMidiActive) {
                                        noteClasses = 'bg-yellow-400 text-gray-900 border-yellow-200 ring-2 ring-yellow-300 shadow-lg';
                                    }

                                    if (visualizationType === 'Skálák') {
                                        const noteToRender = isAbsoluteVoicingMode ? notesToDisplay.find(n => n.midi === noteMidiValue) : notesToDisplay.find(n => n.midi % 12 === noteMidiValue % 12);
                                        if (!noteToRender && !isMidiActive) return null;
                                        const noteName = noteToRender ? noteToRender.name.replace(/\d+$/, '') : getNoteNames(useSharpNotation, useHungarianNotation)[noteMidiValue % 12];
                                        if (!isMidiActive) {
                                            const isPrimaryNote = showRootNoteHighlight && noteMidiValue % 12 === primaryNoteMidi;
                                            const isHighlightedChordNote = highlightedChordNotes.includes(noteMidiValue % 12);
                                            if (isPrimaryNote) noteClasses = 'bg-teal-400 text-gray-900 border-teal-200';
                                            else if (isHighlightedChordNote) noteClasses = 'bg-yellow-400 text-gray-900 border-yellow-200';
                                            else noteClasses = 'bg-slate-300 text-gray-800 border-slate-400';
                                        }
                                        return (<button onClick={() => handlePlayNote(noteMidiValue)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 shadow-md border-2 ${noteClasses} hover:scale-110 active:scale-100`}>{noteName}</button>);
                                    } else { // 'Akkordok'
                                        if (isAbsoluteVoicingMode) {
                                            const noteToRender = notesToDisplay.find(n => n.midi === noteMidiValue);
                                            if (!noteToRender && !isMidiActive) return null;
                                            const noteName = noteToRender ? noteToRender.name.replace(/\d+$/, '') : getNoteNames(useSharpNotation, useHungarianNotation)[noteMidiValue % 12];
                                            if (!isMidiActive) noteClasses = 'bg-teal-400 text-gray-900 border-teal-200';
                                            return (<button onClick={() => handlePlayNote(noteMidiValue)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shadow-md hover:scale-110 active:scale-100 ${noteClasses}`}>{noteName}</button>);
                                        }
                                        if (!selectedChordShape) return null;
                                        const fretForString = selectedChordShape.frets[stringIndex];
                                        if (fretForString === fret) {
                                            const finger = selectedChordShape.fingers[stringIndex];
                                            return (<button onClick={() => handlePlayNote(noteMidiValue)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 shadow-md hover:scale-110 active:scale-100 ${isMidiActive ? noteClasses : 'bg-teal-400 text-gray-900 border-teal-200'}`}>{finger !== 0 && finger !== 'x' ? finger : ''}</button>);
                                        }
                                        if (isMidiActive) {
                                            const noteName = getNoteNames(useSharpNotation, useHungarianNotation)[noteMidiValue % 12];
                                            return (<button onClick={() => handlePlayNote(noteMidiValue)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 shadow-md border-2 ${noteClasses} hover:scale-110 active:scale-100`}>{noteName}</button>);
                                        }
                                        return null;
                                    }
                                })()}</div>);
                            })}</div></div>);
                        })}</div>
                    </div>
                </div>
            </div>
        );
    };

    const Select = ({ label, value, onChange, children, ...props }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children?: React.ReactNode, [key: string]: any }) => (
        <div className="flex flex-col gap-2"><label className="text-sm font-medium text-gray-400">{label}</label><select value={value} onChange={onChange} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500 transition" {...props}>{children}</select></div>
    );
    
    const VoicingSelector = () => {
        const availableDegrees = [1,2,3,4,5,6,7,9,11,13];
        const presets: Record<string, number[]> = { 'Hármas (1-3-5)': [1, 3, 5], 'Négyes (1-3-5-7)': [1, 3, 5, 7], 'Shell (1-3-7)': [1, 3, 7] };

        const jazzVoicingPresets = {
            'Dúr (Ión)': { A: { name: 'A (3-7-9)', degrees: [3, 7, 9] }, B: { name: 'B (7-3-5)', degrees: [7, 3, 5] } },
            'Mixolíd': { A: { name: 'A (3-b7-9)', degrees: [3, 7, 9] }, B: { name: 'B (b7-3-6)', degrees: [7, 3, 6] } },
            'Dór': { A: { name: 'A (b3-b7-9)', degrees: [3, 7, 9] }, B: { name: 'B (b7-b3-5)', degrees: [7, 3, 5] } },
            'Lokriszi': { A: { name: 'A (b3-b5-b7-R)', degrees: [3, 5, 7, 1] }, B: { name: 'B (b7-R-b3-b5)', degrees: [7, 1, 3, 5] } },
            'Alterált Skála': { A: { name: 'A (3-#5-b7-b9)', degrees: [4, 6, 7, 2] }, B: { name: 'B (b7-b9-3-#5)', degrees: [7, 2, 4, 6] } }
        };

        const currentJazzVoicings = (visualizationType === 'Skálák' && selectedItem in jazzVoicingPresets)
            ? jazzVoicingPresets[selectedItem as keyof typeof jazzVoicingPresets] : null;

        const isMajorProgressionAvailable = ['Dúr (Ión)', 'Líd', 'Mixolíd'].includes(selectedItem);
        const isMinorProgressionAvailable = ['Moll (Eol)', 'Dallamos Moll', 'Összhangzatos Moll', 'Dór', 'Fríg'].includes(selectedItem);

        const getJazzVoicingNotes = (voicingRootMidi: number, scaleName: keyof typeof SCALES, voicingType: 'A' | 'B'): { name: string; midi: number }[] => {
            const scale = SCALES[scaleName];
            if (!scale) return [];
            const preset = jazzVoicingPresets[scaleName as keyof typeof jazzVoicingPresets];
            if (!preset) return [];
            
            const degrees = preset[voicingType].degrees;
            const voicingRootNoteName = noteNames[voicingRootMidi % 12];
            const scaleNotes = getEnharmonicallyCorrectNotes(voicingRootNoteName, scale.intervals, scale.degreeFormula, useHungarianNotation);

            return degrees.map(degree => {
                const scaleIndex = (degree - 1) % 7;
                const baseNote = scaleNotes[scaleIndex];
                const octaveOffset = Math.floor((degree - 1) / 7) * 12;
                const finalMidi = baseNote.midi + octaveOffset;
                const noteName = noteNames[finalMidi % 12];
                return { name: `${noteName}${Math.floor(finalMidi / 12) - 1}`, midi: finalMidi };
            }).filter((note): note is { name: string; midi: number } => Boolean(note));
        };

        const handlePlayProgression = async (type: 'major' | 'minor') => {
            setIsProgressionPlaying(true);
            const sequence = type === 'major'
                ? [
                    { name: 'IIm7', root: (rootMidi + 2), scale: 'Dór' as const, voicing: 'A' as const },
                    { name: 'V7', root: (rootMidi + 7), scale: 'Mixolíd' as const, voicing: 'B' as const },
                    { name: 'Imaj7', root: rootMidi, scale: 'Dúr (Ión)' as const, voicing: 'A' as const },
                  ]
                : [
                    { name: 'IIø', root: (rootMidi + 2), scale: 'Lokriszi' as const, voicing: 'A' as const },
                    { name: 'V7alt', root: (rootMidi + 7), scale: 'Alterált Skála' as const, voicing: 'B' as const },
                    { name: 'Im7', root: rootMidi, scale: 'Dór' as const, voicing: 'A' as const },
                  ];

            for (const chordSpec of sequence) {
                setActiveProgressionChord(chordSpec.name);
                const chordNotes = getJazzVoicingNotes(chordSpec.root, chordSpec.scale, chordSpec.voicing);
                setProgressionNotesToDisplay(chordNotes);
                await playNotes(chordNotes.map(n => n.midi), 'chord', 800, 'piano');
                await new Promise(res => setTimeout(res, 400));
            }
            
            setProgressionNotesToDisplay(null);
            setActiveProgressionChord(null);
            setIsProgressionPlaying(false);
        };

        return (
            <div className="md:col-span-3 lg:col-span-4 mt-4 p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
                <h4 className="text-lg font-semibold mb-3 text-teal-300">Felrakás (Voicing)</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {availableDegrees.map(degree => {
                        const alteration = selectedVoicingDegrees[degree];
                        const isActive = alteration !== undefined;
                        let text = `${degree}`;
                        if (isActive) {
                            if (alteration === 1) text = `#${degree}`;
                            else if (alteration === -1) text = `b${degree}`;
                        }
                        return (
                            <button key={degree} onClick={() => handleVoicingDegreeToggle(degree)} className={`w-12 h-10 font-bold rounded transition-colors text-sm ${isActive ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>
                                {text}
                            </button>
                        )
                    })}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedVoicingDegrees({})} className="px-3 py-1 rounded-md text-sm font-semibold bg-gray-600 hover:bg-gray-500">Törlés</button>
                    {Object.entries(presets).map(([name, degrees]) => ( <button key={name} onClick={() => handleVoicingPresetClick(degrees)} className="px-3 py-1 rounded-md text-sm font-semibold bg-gray-600 hover:bg-gray-500">{name}</button>))}
                </div>
                
                {view === 'Zongora' && currentJazzVoicings && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <h5 className="text-base font-semibold mb-3 text-yellow-300">Jazz Zongora Felrakások (Gyökér Nélküli)</h5>
                        <div className="flex flex-wrap gap-2">
                             <button onClick={() => handleVoicingPresetClick(currentJazzVoicings.A.degrees)} className="px-3 py-1 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500">
                                {currentJazzVoicings.A.name}
                            </button>
                            <button onClick={() => handleVoicingPresetClick(currentJazzVoicings.B.degrees)} className="px-3 py-1 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500">
                                {currentJazzVoicings.B.name}
                            </button>
                        </div>
                    </div>
                )}
                
                {view === 'Zongora' && (isMajorProgressionAvailable || isMinorProgressionAvailable) && (
                     <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <h5 className="text-base font-semibold mb-3 text-yellow-300">II-V-I Progressziók</h5>
                        <div className="flex flex-wrap gap-2">
                            {isMajorProgressionAvailable && (
                                <button
                                    onClick={() => handlePlayProgression('major')}
                                    disabled={isProgressionPlaying}
                                    className="px-4 py-2 rounded-md font-semibold bg-sky-600 text-white hover:bg-sky-500 disabled:bg-gray-500"
                                >
                                    <i className="fa-solid fa-play mr-2"></i> Major II-V-I Lejátszása
                                </button>
                            )}
                             {isMinorProgressionAvailable && (
                                <button
                                    onClick={() => handlePlayProgression('minor')}
                                    disabled={isProgressionPlaying}
                                    className="px-4 py-2 rounded-md font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:bg-gray-500"
                                >
                                    <i className="fa-solid fa-play mr-2"></i> Minor IIø-V7alt-I- Lejátszása
                                </button>
                            )}
                        </div>
                         {activeProgressionChord && (
                            <div className="mt-3 text-sm font-semibold text-yellow-300 animate-pulse">
                                Jelenleg játszott: {activeProgressionChord}
                            </div>
                         )}
                    </div>
                )}
            </div>
        );
    };

    const MidiStatusPanel = () => (
        <div className="p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
            <h4 className="font-semibold text-teal-300 mb-2">MIDI Státusz</h4>
            {midiAccessError ? (
                <p className="text-sm text-yellow-400">{midiAccessError}</p>
            ) : midiInputs.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-sm text-green-400 flex items-center gap-2"><i className="fa-solid fa-check-circle"></i> Csatlakoztatva</p>
                    <ul className="text-xs text-gray-400 list-disc list-inside">
                        {midiInputs.map(input => <li key={input.id}>{input.name}</li>)}
                    </ul>
                </div>
            ) : (
                <p className="text-sm text-gray-400">Nincs MIDI eszköz csatlakoztatva...</p>
            )}
        </div>
    );

    return (
        <Card title="Hangszeres Vizualizáció" icon="fa-solid fa-table-cells">
            <div className="flex justify-end items-center gap-2 mb-4">
                <button
                    onClick={() => setUseHungarianNotation(prev => !prev)}
                    className="w-20 h-10 flex-shrink-0 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center gap-2 text-white hover:bg-gray-600 transition"
                    aria-label="Toggle Hungarian/English notation"
                    title="Hang elnevezés váltása (Magyar/Angol)"
                >
                    <i className="fa-solid fa-globe text-lg"></i>
                    <span className="font-semibold">{useHungarianNotation ? 'HUN' : 'ENG'}</span>
                </button>
                <button
                    onClick={() => setUseSharpNotation(prev => !prev)}
                    className="w-12 h-10 flex-shrink-0 bg-gray-700 border border-gray-600 rounded-lg font-mono text-xl text-white hover:bg-gray-600 transition"
                    aria-label="Toggle sharp/flat notes"
                    title="Hangnem jelölés váltása (♯/♭)"
                >
                    {useSharpNotation ? '♯' : '♭'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4 border-t border-slate-700/50 pt-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-400">Nézet</label>
                    <div className="flex bg-gray-700 rounded-lg border border-gray-600 p-1">
                        <button onClick={() => setView('Fogólap')} className={`w-1/2 py-1 rounded-md text-sm font-semibold transition ${view === 'Fogólap' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Fogólap</button>
                        <button onClick={() => setView('Zongora')} className={`w-1/2 py-1 rounded-md text-sm font-semibold transition ${view === 'Zongora' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Zongora</button>
                    </div>
                </div>
                <Select label="Alaphang" value={rootNote} onChange={handleRootNoteChange} key={`root-note-select-${useSharpNotation}-${useHungarianNotation}`}>{availableRootNotes.map(option => <option key={option} value={option}>{option}</option>)}</Select>
                {view === 'Fogólap' && <Select label="Hangszer" value={instrument} onChange={e => setInstrument(e.target.value as Instrument)}>{Object.keys(useHungarianNotation ? INSTRUMENT_TUNINGS_HU : INSTRUMENT_TUNINGS_INTL).map(inst => <option key={inst} value={inst}>{inst}</option>)}</Select>}
                <Select label="Típus" value={visualizationType} onChange={e => setVisualizationType(e.target.value as 'Skálák' | 'Akkordok')}><option value="Skálák">Skálák</option><option value="Akkordok">Akkordok</option></Select>
                <Select label={visualizationType === 'Skálák' ? 'Skála' : 'Akkord'} value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                    {visualizationType === 'Akkordok' && view === 'Fogólap' && availableQualities.map(key => <option key={key} value={key}>{chordTypes[key] || key}</option>)}
                    {visualizationType === 'Akkordok' && view === 'Zongora' && Object.keys(CHORDS).map(key => <option key={key} value={key}>{key}</option>)}
                    {visualizationType === 'Skálák' && groupedScales && Object.entries(groupedScales).map(([category, scales]) => ( <optgroup label={category} key={category}>{scales.map(([name]) => <option key={name} value={name}>{name}</option>)}</optgroup> ))}
                </Select>
                 <Select label="Látható tartomány" value={displayRange} onChange={e => {
                    const newRange = e.target.value as DisplayRange;
                    if (newRange !== 'manual') {
                        handleClearManualRange();
                    }
                    setDisplayRange(newRange);
                 }}>
                    {view === 'Fogólap' ? (
                        <>
                            <option value="all">Teljes Fogólap</option>
                            <option value="manual">Manuális Kijelölés</option>
                        </>
                    ) : (
                        <>
                            <option value="all">Teljes Zongora</option>
                            <option value="one-octave">Egy Oktáv</option>
                            <option value="two-octaves">Két Oktáv</option>
                            <option value="manual">Manuális Kijelölés</option>
                        </>
                    )}
                </Select>
                {visualizationType === 'Akkordok' && (
                    <Select label="Voicing" value={chordVoicing} onChange={e => setChordVoicing(e.target.value as any)} disabled={!currentChordData || currentChordData.intervals.length !== 4}>
                        <option value="standard">Alap Helyzet</option>
                        <option value="drop2">Drop 2</option>
                        <option value="drop3">Drop 3</option>
                    </Select>
                )}
                
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-400">Alaphang Kiemelés</label>
                    <button onClick={() => setShowRootNoteHighlight(prev => !prev)} className={`w-full border rounded-lg px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500 transition text-left font-semibold ${showRootNoteHighlight ? 'bg-teal-600 border-teal-500' : 'bg-gray-700 border-gray-600'}`}>
                        <i className={`fa-regular ${showRootNoteHighlight ? 'fa-check-square' : 'fa-square'} mr-2`}></i>
                        {showRootNoteHighlight ? 'Bekapcsolva' : 'Kikapcsolva'}
                    </button>
                </div>
                {visualizationType === 'Skálák' && ( <div className="flex flex-col gap-2"><label className="text-sm font-medium text-gray-400">Rendezés</label><button onClick={() => setIsSortedByBrightness(prev => !prev)} className={`w-full border rounded-lg px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500 transition text-left font-semibold ${isSortedByBrightness ? 'bg-teal-600 border-teal-500' : 'bg-gray-700 border-gray-600'}`}><i className={`fa-regular ${isSortedByBrightness ? 'fa-check-square' : 'fa-square'} mr-2`}></i>Rendezés világostól sötétig</button></div> )}
                <div className="sm:col-span-2 lg:col-span-4"><MidiStatusPanel /></div>
                {(visualizationType === 'Skálák' || isAbsoluteVoicingMode) && <VoicingSelector />}
                
                {view === 'Fogólap' && displayRange === 'manual' && (
                    <div className="md:col-span-3 lg:col-span-4 mt-4 p-3 bg-gray-900/40 rounded-lg border border-slate-700/50 flex items-center justify-between gap-4">
                        <p className="text-sm text-gray-300">
                            <i className="fa-solid fa-hand-pointer mr-2"></i>
                            {firstFretSelection === null 
                                ? 'Kattints egy bund számára a kijelölés megkezdéséhez.' 
                                : `Jelöld ki a tartomány végét. Jelenlegi: ${firstFretSelection}. bund.`}
                        </p>
                        {manualFretRange && (
                            <button onClick={handleClearManualRange} className="px-3 py-1 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-500 text-white flex-shrink-0">
                                Kijelölés Törlése
                            </button>
                        )}
                    </div>
                )}
                 {view === 'Zongora' && displayRange === 'manual' && (
                    <div className="md:col-span-3 lg:col-span-4 mt-4 p-3 bg-gray-900/40 rounded-lg border border-slate-700/50 flex items-center justify-between gap-4">
                        <p className="text-sm text-gray-300">
                            <i className="fa-solid fa-hand-pointer mr-2"></i>
                            {firstMidiSelection === null 
                                ? 'Kattints egy billentyűre a kijelölés megkezdéséhez.' 
                                : 'Kattints egy másik billentyűre a tartomány végének kijelöléséhez.'}
                        </p>
                        {(manualMidiRange && firstMidiSelection === null) && (
                            <button onClick={handleClearManualRange} className="px-3 py-1 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-500 text-white flex-shrink-0">
                                Kijelölés Törlése
                            </button>
                        )}
                    </div>
                )}
            </div>
            {visualizationType === 'Akkordok' && view === 'Fogólap' && chordVoicing === 'standard' && (<div className="mt-6"><div className="flex items-center justify-center gap-4"><button onClick={() => setVoicingIndex(p => (p - 1 + availableVoicings.length) % availableVoicings.length)} disabled={availableVoicings.length <= 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Előző</button><span className="font-mono text-gray-400 text-sm">Fekvés: {availableVoicings.length > 0 ? `${voicingIndex + 1} / ${availableVoicings.length}` : 'N/A'}</span><button onClick={() => setVoicingIndex(p => (p + 1) % availableVoicings.length)} disabled={availableVoicings.length <= 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Következő</button></div></div>)}
            {visualizationType === 'Skálák' && detailedDiatonicChords.length > 0 && (<div className="mt-6"><h4 className="text-lg font-semibold mb-2 text-teal-300">Skála Akkordjai (Négyeshangzatok)</h4><div className="flex flex-wrap gap-2 p-3 bg-gray-900/40 rounded-lg">{detailedDiatonicChords.map(chord => (<button key={chord.id} onClick={() => handleDiatonicChordClick(chord.id)} className={`px-3 py-1 rounded-md text-sm font-semibold transition-all duration-200 border-2 ${highlightedChordId === chord.id ? 'bg-yellow-400 text-gray-900 border-yellow-200' : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'}`}>{chord.name}</button>))} {highlightedChordId && ( <button onClick={() => setHighlightedChordId(null)} className="text-gray-400 hover:text-white transition-colors text-xs p-2"><i className="fa-solid fa-times mr-1"></i> Törlés</button> )}</div></div>)}
            {((visualizationType === 'Skálák' && scaleInfo) || (visualizationType === 'Akkordok' && notesToDisplay.length > 0)) && (<div className="mt-4 text-center p-2 bg-gray-900/40 rounded-lg flex justify-center items-center gap-4">
                    {visualizationType === 'Skálák' && scaleInfo && <><span className="text-sm text-gray-400">{scaleInfo.shortName}: </span><span className="font-mono text-teal-300">{scaleInfo.degreeFormula}</span></>}
                    {visualizationType === 'Akkordok' && view === 'Fogólap' && selectedChordShape && chordVoicing === 'standard' && <span className="font-semibold text-teal-300">{selectedChordShape.name}</span>}
                    {(visualizationType === 'Akkordok' && (view === 'Zongora' || chordVoicing !== 'standard')) && <span className="font-semibold text-teal-300">{rootNote} {selectedItem} {chordVoicing !== 'standard' ? `(${chordVoicing})` : ''}</span>}
                    <button onClick={handlePlaySequence} disabled={isSequencePlaying} className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 rounded-full text-white transition" aria-label={visualizationType === 'Skálák' ? 'Skála lejátszása' : 'Akkord lejátszása'}><i className={`fa-solid ${isSequencePlaying ? 'fa-spinner fa-spin' : 'fa-play'}`}></i></button>
                </div>)}
            {view === 'Fogólap' ? renderFretboard() : <PianoRoll 
                notesToDisplay={notesToDisplay}
                primaryNoteMidi={primaryNoteMidi}
                highlightedChordNotes={highlightedChordNotes}
                midiActiveNotes={midiActiveNotes}
                playNote={handlePlayNote}
                showRootNoteHighlight={showRootNoteHighlight}
                displayRange={displayRange}
                rootNoteMidiForRange={primaryNoteMidi}
                manualMidiRange={manualMidiRange}
                firstMidiSelection={firstMidiSelection}
                onKeySelect={handlePianoKeySelection}
                isSelectionLocked={isPianoSelectionLocked}
                isAbsoluteVoicingMode={isAbsoluteVoicingMode}
                noteNames={noteNames}
                fullScaleNotes={fullScaleNotes}
            />}
        </Card>
    );
};

export default FretboardVisualizer;
