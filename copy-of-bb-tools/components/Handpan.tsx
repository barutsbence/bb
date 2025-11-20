
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Card from './Card';
import { useNotePlayer } from '../hooks/useNotePlayer';
import { getNoteNames } from '../services/notationService';
import { useMidiInput } from '../hooks/useMidiInput';
import usePolyphonicTuner from '../hooks/usePolyphonicTuner';
import AccordionSection from './AccordionSection';
// FIX: Use named imports for VexFlow to avoid namespace/type collision and ensure correct types.
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
// IMPORT NEW CHORD PATTERNS
import { CHORD_PATTERNS } from '../constants';


const noteToMidiValue: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'H': 11
};

interface HandpanScale {
    name: string;
    notes: string[];
    type?: string;
    baseOctave?: number;
}

interface DisplayedNote {
    name: string;
    midi: number;
}

interface CalibrationStats {
    volume: number;
    normalization: number;
    domeSensitivity: number;
    dingSensitivity: number;
    tonefieldSensitivity: number;
    bodySensitivity: number;
    domeAmplify: number;
    dingAmplify: number;
    tonefieldAmplify: number;
    bodyAmplify: number;
}


// --- Chord Progression Types ---
// Note: VexFlow imports are handled above via named imports.


const assignOctaves = (notes: string[], baseOctave = 4): DisplayedNote[] => {
    if (!notes || notes.length < 2) return [];

    const dingNoteName = notes[0].replace(/\d/, '');
    const tonefieldNames = notes.slice(1).map(n => n.replace(/\d/, ''));
    
    // The lowest note of the tone circle determines the base octave start point.
    const lowestTonefieldNoteName = tonefieldNames[0];
    const lowestTonefieldMidiMod12 = noteToMidiValue[lowestTonefieldNoteName];
    
    const dingMidiMod12 = noteToMidiValue[dingNoteName];

    // The Ding is usually in the octave below the main tonefield.
    // If the Ding's pitch class is lower than the lowest tonefield note, it's in the same octave number, otherwise it's one lower.
    const dingOctave = (dingMidiMod12 < lowestTonefieldMidiMod12) ? baseOctave : baseOctave - 1;
    const dingNote: DisplayedNote = { name: `${dingNoteName}${dingOctave}`, midi: dingMidiMod12 + dingOctave * 12 };

    let currentOctave = baseOctave;
    let lastMidi = -1;

    const resultTonefields: DisplayedNote[] = [];

    for (const noteName of tonefieldNames) {
        const noteMidiValue = noteToMidiValue[noteName];
        if (noteMidiValue === undefined) continue;
        
        // If the current note's pitch class is lower than the previous one, we've crossed an octave boundary.
        if (lastMidi !== -1 && noteMidiValue < (lastMidi % 12)) {
            currentOctave++;
        }
        
        const currentMidi = noteMidiValue + currentOctave * 12;
        resultTonefields.push({ name: `${noteName}${currentOctave}`, midi: currentMidi });
        lastMidi = currentMidi;
    }

    return [dingNote, ...resultTonefields];
};


const CHORD_QUALITIES: Record<string, number[]> = {
    'maj7': [0, 4, 7, 11], 'maj': [0, 4, 7], '': [0, 4, 7], 
    'm7': [0, 3, 7, 10], 'm': [0, 3, 7], 'min': [0, 3, 7], '-': [0, 3, 7],
    '7': [0, 4, 7, 10],
    'dim7': [0, 3, 6, 9], 'dim': [0, 3, 6], '°': [0, 3, 6],
    'aug': [0, 4, 8], '+': [0, 4, 8],
    'sus4': [0, 5, 7], 'sus2': [0, 2, 7],
    'm7b5': [0, 3, 6, 10], 'ø': [0, 3, 6, 10],
};

interface HandpanNoteProps {
    note: DisplayedNote;
    xPercent: number;
    yPercent: number;
    sizePercent: number;
    isActive: boolean;
    onClick: (note: DisplayedNote) => void;
}

const HandpanNote: React.FC<HandpanNoteProps> = React.memo(({ note, xPercent, yPercent, sizePercent, isActive, onClick }) => {
    const scale = isActive ? 1.05 : 1;

    return (
        <button
            onClick={() => onClick(note)}
            className="absolute rounded-full flex items-center justify-center transition-all duration-150 transform-gpu"
            style={{
                width: `${sizePercent}%`,
                paddingBottom: `${sizePercent}%`, // Aspect ratio trick, though absolute sizing might be cleaner if container is square
                height: 0, // Height handled by padding
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                willChange: 'transform' 
            }}
            aria-label={`Play note ${note.name}`}
        >
             {/* Inner content container because button has 0 height */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full" style={{ background: 'radial-gradient(circle, #2D3748 0%, #1A202C 70%)', boxShadow: `inset 0 0 15px rgba(0,0,0,0.6), 0 0 10px 2px rgba(0,0,0,0.5)` }} />
                <div className="absolute w-full h-full rounded-full transition-colors" style={{ background: isActive ? 'rgba(50, 215, 185, 0.4)' : 'transparent', boxShadow: isActive ? '0 0 20px rgba(50, 215, 185, 0.6)' : 'none'}} />
                <span className="absolute text-white font-semibold text-sm sm:text-base lg:text-lg drop-shadow-lg">{note.name ? note.name.replace(/\d+$/, '') : ''}</span>
            </div>
        </button>
    );
});

// --- Enhanced Chord Detection Helper ---
const detectChord = (midiNotes: number[], noteNames: string[]): string | null => {
    if (midiNotes.length < 2) return null;
    
    // Sort notes to find the bass (lowest) note
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);
    const bassNote = sortedMidi[0];
    const bassPC = bassNote % 12;

    // Normalize notes to 0-11 pitch classes
    const pitchClasses = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);
    if (pitchClasses.length < 2) return null; // Need at least 2 distinct pitch classes

    const matches: { root: number; name: string }[] = [];

    // Try every note in the set as the potential root
    for (const root of pitchClasses) {
        // Calculate intervals relative to this root
        const currentIntervals = pitchClasses.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);

        // Check against all known patterns in CHORD_PATTERNS (includes sus2, sus4, etc.)
        for (const [name, patternIntervals] of Object.entries(CHORD_PATTERNS)) {
            // Exact match check
            if (currentIntervals.length === patternIntervals.length && 
                currentIntervals.every((val, index) => val === patternIntervals[index])) {
                matches.push({ root, name });
            }
        }
        
        // Explicit check for Power Chords (5) if not in CHORD_PATTERNS
        if (pitchClasses.length === 2) {
             const i1 = currentIntervals[0];
             const i2 = currentIntervals[1];
             if (i1 === 0 && i2 === 7) {
                 matches.push({ root, name: '5' });
             }
        }
    }

    if (matches.length === 0) return null;

    // Sort/Prioritize matches
    matches.sort((a, b) => {
        const aIsRootPos = a.root === bassPC;
        const bIsRootPos = b.root === bassPC;
        
        // 1. Priority: The chord is in root position (Root == Lowest Note)
        if (aIsRootPos && !bIsRootPos) return -1;
        if (!aIsRootPos && bIsRootPos) return 1;
        
        return 0;
    });

    const bestMatch = matches[0];
    const rootName = noteNames[bestMatch.root];

    // If the root of the matched chord is NOT the lowest note played, it's a slash chord (inversion)
    if (bestMatch.root !== bassPC) {
        const bassName = noteNames[bassPC];
        return `${rootName} ${bestMatch.name} / ${bassName}`;
    }

    return `${rootName} ${bestMatch.name}`;
};

// Helper function for non-linear velocity mapping (Sensitivity Curve)
// curveFactor: 1.0 = Linear, <1.0 = Compresses low velocity (boosts sensitivity), >1.0 = Expands (harder to hit loud)
const applyVelocityCurve = (rawVelocity: number, curveFactor: number = 0.6): number => {
    const normalizedInput = rawVelocity / 127.0;
    const curvedOutput = Math.pow(normalizedInput, curveFactor);
    return Math.min(127, Math.floor(curvedOutput * 127));
};


const Handpan: React.FC = () => {
    const [scales, setScales] = useState<HandpanScale[]>([]);
    const [selectedScaleName, setSelectedScaleName] = useState<string>('');
    const [rootNoteMidi, setRootNoteMidi] = useState(2); // D
    const [useSharpNotation, setUseSharpNotation] = useState(false);
    const [rotation, setRotation] = useState(-20);
    const [masterVolume, setMasterVolume] = useState(0.6); // Default volume at 60% to prevent clipping
    const [activeClickNotes, setActiveClickNotes] = useState<Set<number>>(new Set());
    const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
    const { playNote, playNotes, isMuted, toggleMute } = useNotePlayer();
    
    const noteNames = useMemo(() => getNoteNames(useSharpNotation, true), [useSharpNotation]);

    const { detectedNotes, isListening, error: tunerError, start: startTuner, stop: stopTuner } = usePolyphonicTuner(440, useSharpNotation, true);
    const [activeTunerNoteMidis, setActiveTunerNoteMidis] = useState<Set<number>>(new Set());
    
    const [progressionInput, setProgressionInput] = useState('Dm C | Bb Am');
    // FIX: Use correct type 'StaveNote' instead of namespace 'Vex.Flow.StaveNote'.
    const [parsedProgression, setParsedProgression] = useState<{ notes: StaveNote[], midi: number[] }[][]>([]);
    const [playbackState, setPlaybackState] = useState<{ isPlaying: boolean; currentMeasure: number }>({ isPlaying: false, currentMeasure: -1 });
    const [parseError, setParseError] = useState<string | null>(null);
    const [bpm, setBpm] = useState(100);
    
    // --- Calibration State ---
    const [velocityCurve, setVelocityCurve] = useState(0.6); // Default sensitivity increased (0.6)
    const [calibrationState, setCalibrationState] = useState<'idle' | 'measuring' | 'complete'>('idle');
    const [calibrationCountdown, setCalibrationCountdown] = useState(0);
    const calibrationDataRef = useRef<{note: number, velocity: number}[]>([]);
    const [calibrationStats, setCalibrationStats] = useState<CalibrationStats | null>(null);


    // Refs for scores
    const progressionContainerRef = useRef<HTMLDivElement>(null);
    // FIX: Use correct type 'Renderer' instead of namespace 'Vex.Flow.Renderer'.
    const progressionRendererRef = useRef<Renderer | null>(null);
    const liveScoreContainerRef = useRef<HTMLDivElement>(null);
    // FIX: Use correct type 'Renderer' instead of namespace 'Vex.Flow.Renderer'.
    const liveScoreRendererRef = useRef<Renderer | null>(null);

    const playbackTimeoutRef = useRef<number | null>(null);
    const [activePlaybackNotes, setActivePlaybackNotes] = useState<Set<number>>(new Set());
    const highlightTimeoutRefs = useRef<number[]>([]);
    
    // Combined active notes for live display
    const [liveMidiNotes, setLiveMidiNotes] = useState<number[]>([]);
    const [detectedChordName, setDetectedChordName] = useState<string | null>(null);
    
    // Refs for managing visual sustain duration
    const clickTimeoutsRef = useRef<Record<number, number>>({});
    const midiTimeoutsRef = useRef<Record<number, number>>({});
    const lastNoteMidiRef = useRef<number | null>(null);

    useEffect(() => {
        const notes = [...activeClickNotes, ...activeMidiNotes, ...activeTunerNoteMidis, ...activePlaybackNotes].sort((a,b) => a-b);
        // Only update if different to avoid constant re-renders
        if (JSON.stringify(notes) !== JSON.stringify(liveMidiNotes)) {
            setLiveMidiNotes(notes);
            // Attempt to detect chord
            const chordName = detectChord(notes, noteNames);
            setDetectedChordName(chordName);
        }
    }, [activeClickNotes, activeMidiNotes, activeTunerNoteMidis, activePlaybackNotes, liveMidiNotes, noteNames]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(clickTimeoutsRef.current).forEach(window.clearTimeout);
            Object.values(midiTimeoutsRef.current).forEach(window.clearTimeout);
        };
    }, []);

    useEffect(() => {
        fetch('./scales.json')
            .then(res => res.json())
            .then(data => {
                if (data && data.scales && Array.isArray(data.scales)) {
                    setScales(data.scales);
                    if (data.scales.length > 0) {
                        setSelectedScaleName(data.scales[0].name);
                    }
                }
            })
            .catch(err => console.error("Failed to load scales.json", err));
    }, []);

    useEffect(() => {
        setRotation(-20);
    }, [selectedScaleName]);

    const selectedScale = useMemo(() => {
        return scales.find(s => s.name === selectedScaleName);
    }, [scales, selectedScaleName]);

    const displayedNotes = useMemo(() => {
        if (!selectedScale) return { ding: null, tonefields: [] };
        
        const baseNotesWithOctaves = assignOctaves(selectedScale.notes, selectedScale.baseOctave);
        
        const transpositionInterval = rootNoteMidi - noteToMidiValue['D'];
        
        const transposedNotes = baseNotesWithOctaves.map(note => {
            const transposedMidi = note.midi + transpositionInterval;
            const noteName = noteNames[transposedMidi % 12];
            const octave = Math.floor(transposedMidi / 12) - 1;
            return {
                name: `${noteName}${octave}`,
                midi: transposedMidi
            };
        });

        return {
            ding: transposedNotes[0],
            tonefields: transposedNotes.slice(1)
        };
    }, [selectedScale, rootNoteMidi, noteNames]);

    useEffect(() => {
        if (isListening && detectedNotes.length > 0) {
            const newActiveMidis = new Set<number>();
            for (const note of detectedNotes) {
                const noteIndex = noteNames.indexOf(note.noteName);
                if (noteIndex !== -1) {
                    const midi = noteIndex + (note.octave + 1) * 12;
                    newActiveMidis.add(midi);
                }
            }
            setActiveTunerNoteMidis(newActiveMidis);
        } else {
            setActiveTunerNoteMidis(new Set());
        }
    }, [isListening, detectedNotes, noteNames]);
    
    // Helper to handle Smart Sustain (Melody vs Arpeggio) logic
    const handleSmartSustain = useCallback((noteMidi: number, source: 'click' | 'midi') => {
        const lastMidi = lastNoteMidiRef.current;
        let isMelody = false;
        
        if (lastMidi !== null) {
            const interval = Math.abs(noteMidi - lastMidi);
            // If interval is small (semitone or tone), treat as melody line -> clear previous notes quickly
            if (interval > 0 && interval <= 2) {
                isMelody = true;
            }
        }
        lastNoteMidiRef.current = noteMidi;

        if (isMelody) {
            // Clear all existing notes rapidly to "clean up" the visual score for melody
            if (source === 'click') {
                Object.values(clickTimeoutsRef.current).forEach(window.clearTimeout);
                clickTimeoutsRef.current = {};
                setActiveClickNotes(new Set());
            } else {
                 Object.values(midiTimeoutsRef.current).forEach(window.clearTimeout);
                 midiTimeoutsRef.current = {};
                 setActiveMidiNotes(new Set());
            }
        }
    }, []);

    const handleNoteClick = useCallback((note: DisplayedNote) => {
        const noteMidi = note.midi;
        // Apply master volume to click interaction
        const volume = 0.5 * masterVolume;
        playNote({ frequency: 440 * Math.pow(2, (noteMidi - 69) / 12), instrument: 'handpan', volume });
        
        handleSmartSustain(noteMidi, 'click');

        // Clear any existing timeout for this specific note
        if (clickTimeoutsRef.current[noteMidi]) {
            window.clearTimeout(clickTimeoutsRef.current[noteMidi]);
        }

        setActiveClickNotes(prev => new Set(prev).add(noteMidi));
        
        // Set a timeout of 1.5s (standard) or less if we are playing fast? 
        // The Smart Sustain handles the "cutting off" of previous notes.
        // This timeout just handles the natural decay of *this* note.
        clickTimeoutsRef.current[noteMidi] = window.setTimeout(() => {
            setActiveClickNotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(noteMidi);
                return newSet;
            });
            delete clickTimeoutsRef.current[noteMidi];
        }, 1500);
    }, [playNote, handleSmartSustain, masterVolume]);

    const calculateSuggestedSettings = useCallback(() => {
        const data = calibrationDataRef.current;
        if (data.length === 0) return null;

        const velocities = data.map(d => d.velocity);
        const maxVel = Math.max(...velocities);
        const minVel = Math.min(...velocities);
        const avgVel = velocities.reduce((a,b) => a+b, 0) / velocities.length;

        // Find Ding (lowest note played) vs Tonefields
        const notes = data.map(d => d.note);
        const lowestNote = Math.min(...notes);
        
        const dingData = data.filter(d => d.note === lowestNote);
        const tonefieldData = data.filter(d => d.note !== lowestNote);
        
        const dingAvg = dingData.length ? dingData.reduce((a,b) => a + b.velocity, 0) / dingData.length : avgVel;
        const toneAvg = tonefieldData.length ? tonefieldData.reduce((a,b) => a + b.velocity, 0) / tonefieldData.length : avgVel;

        // Heuristic calculations
        const volume = Math.min(100, Math.max(40, 100 - (avgVel / 127) * 50)); // Lower avg velocity -> Higher suggested volume
        const normalization = Math.min(100, Math.max(0, 127 - (maxVel - minVel))); // Smaller dynamic range -> Higher normalization
        
        // Sensitivity: If user hits softly (low max), sensitivity > 100%
        const globalSens = (127 / Math.max(10, maxVel)) * 100; 
        
        // Amplify: Boost specific zones if their average is low compared to global
        const dingAmplify = dingAvg < avgVel * 0.8 ? 120 : 100;
        const toneAmplify = toneAvg < avgVel * 0.8 ? 120 : 100;

        // Simulate "Body" and "Dome" parameters (since standard MIDI implies notes, we infer based on extreme outliers or defaults)
        const bodySens = globalSens * 1.1; // Usually body hits are softer
        const domeSens = globalSens;

        setCalibrationStats({
            volume: Math.round(volume),
            normalization: Math.round(normalization),
            domeSensitivity: Math.round(domeSens),
            dingSensitivity: Math.round(globalSens),
            tonefieldSensitivity: Math.round(globalSens * 1.1), // Tonefields often need a bit more boost
            bodySensitivity: Math.round(bodySens),
            domeAmplify: 100,
            dingAmplify: dingAmplify,
            tonefieldAmplify: toneAmplify,
            bodyAmplify: 100
        });
        
        // Apply a general fix to our active settings based on calibration
        // Logarithmic curve factor: 
        // If max velocity is low (e.g. 60), we need a curve < 1.0 to boost sensitivity.
        const newCurve = Math.max(0.4, Math.min(1.0, maxVel / 140)); 
        setVelocityCurve(newCurve);

    }, []);

    const startCalibration = useCallback(() => {
        setCalibrationState('measuring');
        setCalibrationCountdown(5);
        calibrationDataRef.current = [];
        setCalibrationStats(null);

        const interval = setInterval(() => {
            setCalibrationCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        setTimeout(() => {
            setCalibrationState('complete');
            calculateSuggestedSettings();
        }, 5000);
    }, [calculateSuggestedSettings]);

    const onMidiMessage = useCallback((event: MIDIMessageEvent) => {
        const command = event.data[0];
        const noteMidi = event.data[1];
        const rawVelocity = event.data.length > 2 ? event.data[2] : 0;
    
        // Handle Note On (0x90 with velocity > 0)
        if ((command & 0xF0) === 0x90 && rawVelocity > 0) {
            // Calibration Logic
            if (calibrationState === 'measuring') {
                calibrationDataRef.current.push({ note: noteMidi, velocity: rawVelocity });
            }
            
            handleSmartSustain(noteMidi, 'midi');

            // Apply Optimized Sensitivity Curve AND Master Volume
            const curvedVelocity = applyVelocityCurve(rawVelocity, velocityCurve);
            const volume = (curvedVelocity / 127) * masterVolume;

            // Play Note
            playNote({ 
                frequency: 440 * Math.pow(2, (noteMidi - 69) / 12), 
                instrument: 'handpan',
                volume: volume 
            });

            // Visual Feedback - Note On
            if (midiTimeoutsRef.current[noteMidi]) {
                window.clearTimeout(midiTimeoutsRef.current[noteMidi]);
                delete midiTimeoutsRef.current[noteMidi];
            }
            setActiveMidiNotes(prev => new Set(prev).add(noteMidi));
        }
        // Handle Note Off (0x80 OR 0x90 with velocity 0)
        else if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && rawVelocity === 0)) {
            // Visual Feedback - Note Off (Delayed)
            if (midiTimeoutsRef.current[noteMidi]) {
                 window.clearTimeout(midiTimeoutsRef.current[noteMidi]);
            }
            
            midiTimeoutsRef.current[noteMidi] = window.setTimeout(() => {
                setActiveMidiNotes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(noteMidi);
                    return newSet;
                });
                delete midiTimeoutsRef.current[noteMidi];
            }, 1500);
        }
    }, [playNote, velocityCurve, calibrationState, handleSmartSustain, masterVolume]);
    
    const { midiInputs, midiAccessError } = useMidiInput(onMidiMessage);

    const layoutNotesWithPositions = useMemo(() => {
        const { ding, tonefields } = displayedNotes;
        if (!ding) return [];
        
        const rotationInRadians = rotation * (Math.PI / 180);
        const angleStep = (2 * Math.PI) / tonefields.length;
        const zigZagOrder = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
        
        // Using a 400x400 coordinate system base
        const BASE_SIZE = 400;
        const CENTER = BASE_SIZE / 2;
        const RADIUS = 130;

        const sideNotes = tonefields.map((note, originalIndex) => {
             const angleOffset = zigZagOrder[originalIndex] * angleStep;
             const angleWithoutRotation = (Math.PI / 2) + angleOffset;

            const angle = angleWithoutRotation + rotationInRadians;
            const x = CENTER + RADIUS * Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);
            
            // Convert to percentage
            const xPercent = (x / BASE_SIZE) * 100;
            const yPercent = (y / BASE_SIZE) * 100;
            const sizePercent = (75 / BASE_SIZE) * 100; // ~18.75%

            return { note, originalIndex, xPercent, yPercent, sizePercent };
        });

        const dingNote = { 
            note: ding, 
            originalIndex: 'ding' as const, 
            xPercent: 50, 
            yPercent: 50, 
            sizePercent: (110 / BASE_SIZE) * 100 // ~27.5%
        };
        return [dingNote, ...sideNotes];
    }, [displayedNotes, rotation]);
    
    const handleParseProgression = useCallback(() => {
        setParseError(null);
        setParsedProgression([]);

        const allNotesOnPan = [...displayedNotes.tonefields, displayedNotes.ding].filter(Boolean) as DisplayedNote[];
        if (allNotesOnPan.length === 0) {
            return;
        }

        const measures = progressionInput.trim().split('|');
        const newParsedProgression: { notes: StaveNote[], midi: number[] }[][] = [];

        for (const measureStr of measures) {
            const chordSymbols = measureStr.trim().split(/\s+/).filter(Boolean);
            if (chordSymbols.length === 0) continue;

            const duration = { 1: 'w', 2: 'h', 3: 'q', 4: 'q' }[chordSymbols.length] || 'q';
            const parsedMeasure: { notes: StaveNote[], midi: number[] }[] = [];

            for (const symbol of chordSymbols) {
                const rootMatch = symbol.match(/^([A-G][#b]?|H)/);
                if (!rootMatch) {
                    parsedMeasure.push({ notes: [new StaveNote({ keys: ["b/4"], duration: `${duration}r` })], midi: [] });
                    continue;
                }
                const rootName = rootMatch[1];
                const quality = symbol.substring(rootName.length);
                const rootMidi = noteToMidiValue[rootName];
                const qualityKey = Object.keys(CHORD_QUALITIES).filter(q => quality.startsWith(q)).sort((a,b) => b.length - a.length)[0];
                
                if (rootMidi === undefined || qualityKey === undefined) {
                    parsedMeasure.push({ notes: [new StaveNote({ keys: ["b/4"], duration: `${duration}r` })], midi: [] });
                    continue;
                }

                const intervals = CHORD_QUALITIES[qualityKey];
                const isSeventh = intervals.length === 4;

                const rootMidiMod12 = rootMidi % 12;
                const thirdInterval = intervals.find(i => i === 3 || i === 4);
                const thirdMidiMod12 = thirdInterval !== undefined ? (rootMidi + thirdInterval) % 12 : -1;
                const fifthInterval = intervals.find(i => i === 6 || i === 7 || i === 8);
                const fifthMidiMod12 = fifthInterval !== undefined ? (rootMidi + fifthInterval) % 12 : -1;
                const seventhInterval = intervals.find(i => i >= 9 && i <= 11);
                const seventhMidiMod12 = seventhInterval !== undefined ? (rootMidi + seventhInterval) % 12 : -1;

                const rootNotes = allNotesOnPan.filter(n => n.midi % 12 === rootMidiMod12).sort((a,b) => a.midi - b.midi);
                const thirdNotes = allNotesOnPan.filter(n => n.midi % 12 === thirdMidiMod12).sort((a,b) => a.midi - b.midi);
                const fifthNotes = allNotesOnPan.filter(n => n.midi % 12 === fifthMidiMod12).sort((a,b) => a.midi - b.midi);
                const seventhNotes = allNotesOnPan.filter(n => n.midi % 12 === seventhMidiMod12).sort((a,b) => a.midi - b.midi);

                const isSusChord = quality.toLowerCase().includes('sus');
                let bestVoicing: DisplayedNote[] = [];

                if (rootNotes.length > 0) bestVoicing.push(rootNotes[0]);
                if (fifthNotes.length > 0) bestVoicing.push(fifthNotes[0]);

                if (isSusChord) {
                    const susInterval = intervals.find(i => i === 2 || i === 5);
                    if (susInterval !== undefined) {
                        const susMidiMod12 = (rootMidi + susInterval) % 12;
                        const susNotes = allNotesOnPan.filter(n => n.midi % 12 === susMidiMod12).sort((a,b) => a.midi - b.midi);
                        if (susNotes.length > 0) {
                            bestVoicing.push(susNotes[0]);
                        } else {
                            bestVoicing = []; // Sus chord without the sus note is unplayable
                        }
                    }
                } else {
                    if (thirdNotes.length > 0) {
                        bestVoicing.push(thirdNotes[0]);
                    } else {
                        bestVoicing = []; // Major/minor chord requires a third
                    }
                }
                
                if (isSeventh && bestVoicing.length > 0) {
                     if (seventhNotes.length > 0) {
                        bestVoicing.push(seventhNotes[0]);
                     } else {
                        bestVoicing = []; // Seventh chord requires a seventh
                     }
                }
                
                bestVoicing = [...new Set(bestVoicing)].sort((a, b) => a.midi - b.midi);

                if (bestVoicing.length === 0) {
                    parsedMeasure.push({ notes: [new StaveNote({ keys: ["b/4"], duration: `${duration}r` })], midi: [] });
                } else {
                    const LOWEST_ALLOWED_MIDI = 57; // A3
                    const lowestNoteMidi = Math.min(...bestVoicing.map(n => n.midi));
                    
                    let octaveShift = 0;
                    if (bestVoicing.length > 0 && lowestNoteMidi < LOWEST_ALLOWED_MIDI) {
                        octaveShift = 12 * Math.ceil((LOWEST_ALLOWED_MIDI - lowestNoteMidi) / 12);
                    }

                    const vexKeys = bestVoicing.map(n => {
                        const displayMidi = n.midi + octaveShift;
                        // Enharmonic handling for chords display: use user preference
                        const noteNameFromMidi = noteNames[displayMidi % 12];
                        const vexNoteName = (noteNameFromMidi === 'H' ? 'B' : noteNameFromMidi).toLowerCase();
                        const octave = Math.floor(displayMidi / 12) - 1;
                        return `${vexNoteName}/${octave}`;
                    });

                    const note = new StaveNote({ keys: vexKeys, duration: duration });
                    vexKeys.forEach((key, index) => {
                        if (key.includes('#')) note.addModifier(new Accidental('#'), index);
                        if (key.includes('b')) note.addModifier(new Accidental('b'), index);
                    });

                    parsedMeasure.push({
                        notes: [note],
                        midi: bestVoicing.map(n => n.midi) // Use original MIDI for audio playback
                    });
                }
            }
            newParsedProgression.push(parsedMeasure);
        }
        setParsedProgression(newParsedProgression);
    }, [progressionInput, displayedNotes, noteNames]);

    // Auto-parse when progression input changes
    useEffect(() => {
        const timer = setTimeout(() => {
            handleParseProgression();
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [progressionInput, handleParseProgression]);

    const drawLiveScore = useCallback(() => {
        if (!liveScoreContainerRef.current) return;
        
        if (!liveScoreRendererRef.current) {
            liveScoreRendererRef.current = new Renderer(liveScoreContainerRef.current, Renderer.Backends.SVG);
        }
        const renderer = liveScoreRendererRef.current;
        const context = renderer.getContext();
        context.clear();
        renderer.resize(250, 140);

        const stave = new Stave(10, 10, 230);
        stave.addClef('treble').setContext(context).draw();

        if (liveMidiNotes.length > 0) {
             try {
                const vexKeys = liveMidiNotes.map(midi => {
                    const octave = Math.floor(midi / 12) - 1;
                    const noteIndex = midi % 12;
                    // Choose note name based on user preference
                    const sharpNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
                    const flatNames = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
                    const name = useSharpNotation ? sharpNames[noteIndex] : flatNames[noteIndex];
                    return `${name}/${octave}`;
                });

                // VexFlow duration needs to be valid. 'w' is whole note.
                const note = new StaveNote({ keys: vexKeys, duration: 'w' });
                note.setStyle({ fillStyle: '#14b8a6', strokeStyle: '#14b8a6' }); // Teal color

                vexKeys.forEach((key, index) => {
                    if (key.includes('#')) note.addModifier(new Accidental('#'), index);
                    if (key.includes('b')) note.addModifier(new Accidental('b'), index);
                });

                // FIX: Use camelCase properties 'numBeats' and 'beatValue' for Voice constructor.
                const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
                voice.addTickables([note]);
                
                new Formatter().joinVoices([voice]).format([voice], 180);
                voice.draw(context, stave);
            } catch (e) {
                console.error("Error drawing live notes:", e);
            }
        }
    }, [liveMidiNotes, useSharpNotation]);

    useEffect(() => {
        drawLiveScore();
    }, [drawLiveScore]);

    const drawProgressionScore = useCallback(() => {
        if (!progressionContainerRef.current) return;
        
        if (!progressionRendererRef.current) {
            progressionRendererRef.current = new Renderer(progressionContainerRef.current, Renderer.Backends.SVG);
        }
        const renderer = progressionRendererRef.current;
        const context = renderer.getContext();
        context.clear();

        const measureWidth = 200;
        const totalWidth = Math.max(400, (parsedProgression.length > 0 ? parsedProgression.length : 1) * measureWidth + 20);
        const height = 150; 
        renderer.resize(totalWidth, height);

        if (parsedProgression.length > 0) {
            let x = 10;
            const progressionY = 10;
            parsedProgression.forEach((measure, i) => {
                const stave = new Stave(x, progressionY, measureWidth + (i === 0 ? 50 : 0));
                if (i === 0) stave.addClef('treble').addTimeSignature('4/4');
                stave.setContext(context).draw();
                
                const notes = measure.flatMap(chord => chord.notes);
                if (notes.length > 0) {
                    Formatter.FormatAndDraw(context, stave, notes);
                }
                if (playbackState.isPlaying && playbackState.currentMeasure === i) {
                    context.save();
                    context.setFillStyle('rgba(20, 184, 166, 0.2)');
                    context.fillRect(stave.getX(), stave.getY(), stave.getWidth(), stave.getHeight());
                    context.restore();
                }
                x += stave.getWidth();
            });
        } else {
             const stave = new Stave(10, 10, 300);
             stave.addClef('treble').addTimeSignature('4/4');
             stave.setContext(context).draw();
             context.save();
             context.setFont("Arial", 14, "").setFillStyle("#888");
             context.fillText("Írj be akkordokat a lenti mezőbe...", 50, 70);
             context.restore();
        }

    }, [parsedProgression, playbackState]);
    
    useEffect(() => {
        drawProgressionScore();
    }, [drawProgressionScore]);

    const stopPlayback = useCallback(() => {
        if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
        highlightTimeoutRefs.current.forEach(clearTimeout);
        highlightTimeoutRefs.current = [];
        setActivePlaybackNotes(new Set());
        setPlaybackState({ isPlaying: false, currentMeasure: -1 });
    }, []);

    const playProgression = useCallback(() => {
        if (parsedProgression.flat().length === 0) return;
        
        highlightTimeoutRefs.current.forEach(clearTimeout);
        highlightTimeoutRefs.current = [];

        let measureIndex = 0;
        const measureDuration = (60 / bpm) * 4 * 1000;

        const scheduleNextMeasure = () => {
            if (measureIndex >= parsedProgression.length) {
                stopPlayback();
                return;
            }
            setPlaybackState({ isPlaying: true, currentMeasure: measureIndex });
            
            const currentMeasure = parsedProgression[measureIndex];
            const noteDuration = measureDuration / currentMeasure.length;
            currentMeasure.forEach((chord, chordIndex) => {
                const midiNotes = chord.midi;
                const startTime = chordIndex * noteDuration;
                
                if (midiNotes.length > 0) {
                    const soundTimeout = setTimeout(() => {
                         playNotes(midiNotes.map(midi => 440 * Math.pow(2, (midi - 69) / 12)), 'chord', noteDuration * 0.9, 'handpan');
                    }, startTime);

                    const highlightStartTimeout = setTimeout(() => setActivePlaybackNotes(p => new Set([...p, ...midiNotes])), startTime);
                    const highlightEndTimeout = setTimeout(() => setActivePlaybackNotes(p => { const n = new Set(p); midiNotes.forEach(m => n.delete(m)); return n; }), startTime + (noteDuration * 0.9));
                    highlightTimeoutRefs.current.push(soundTimeout, highlightStartTimeout, highlightEndTimeout);
                }
            });
            
            measureIndex++;
            playbackTimeoutRef.current = window.setTimeout(scheduleNextMeasure, measureDuration);
        };

        scheduleNextMeasure();

    }, [parsedProgression, bpm, playNotes, stopPlayback]);

    const handlePlayToggle = () => {
        if (playbackState.isPlaying) stopPlayback();
        else playProgression();
    };
    
    useEffect(() => stopPlayback, [stopPlayback]);
    
    return (
        <Card title="Handpan" icon="fa-solid fa-compact-disc">
            {/* 1. Handpan Visualizer & Live Score Row */}
            <div className="flex flex-col xl:flex-row items-center justify-center gap-8 mb-10">
                {/* Visualizer */}
                 <div className="relative w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] transition-all duration-300 flex-shrink-0">
                    <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
                       <defs>
                            <radialGradient id="handpanGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <stop offset="0%" stopColor="#4A5568" />
                                <stop offset="70%" stopColor="#2D3748" />
                                <stop offset="100%" stopColor="#1A202C" />
                            </radialGradient>
                       </defs>
                       <circle cx="200" cy="200" r="200" fill="url(#handpanGradient)" />
                       <circle cx="200" cy="200" r="195" fill="none" stroke="#1A202C" strokeWidth="10" strokeOpacity="0.5"/>
                    </svg>
                    
                    {layoutNotesWithPositions.map(({ note, originalIndex, xPercent, yPercent, sizePercent }) => {
                        const isNoteActive = activeClickNotes.has(note.midi) || activeMidiNotes.has(note.midi) || activeTunerNoteMidis.has(note.midi) || activePlaybackNotes.has(note.midi);
                        
                        return (
                            <HandpanNote
                                key={`${note.name}-${originalIndex}`}
                                note={note}
                                xPercent={xPercent}
                                yPercent={yPercent}
                                sizePercent={sizePercent}
                                isActive={isNoteActive}
                                onClick={handleNoteClick}
                            />
                        );
                    })}
                </div>

                {/* Live Score - Positioned next to visualizer on large screens */}
                <div className="bg-white/95 rounded-lg shadow-lg p-4 flex flex-col justify-center items-center min-w-[280px] min-h-[200px] border-2 border-teal-500/30 relative">
                    <div className="w-full flex justify-between items-start mb-2 px-2">
                        <h4 className="text-gray-600 font-bold text-xs uppercase tracking-wide self-start mt-2">Élő Kotta</h4>
                    </div>
                    
                    {/* Big Chord Display */}
                     <div className="w-full flex items-center justify-center h-12 mb-2">
                         {detectedChordName ? (
                            <div className="text-3xl sm:text-4xl font-black text-teal-500 drop-shadow-sm animate-pulse text-center">
                                {detectedChordName}
                            </div>
                        ) : (
                             <div className="text-sm text-gray-300 italic">...</div>
                        )}
                    </div>

                    <div ref={liveScoreContainerRef} className="mt-2"></div>
                    <p className="text-xs text-gray-400 mt-1 text-center max-w-[200px]">
                        Játssz a handpanen vagy használj MIDI eszközt.
                    </p>
                </div>
            </div>

            {/* 2. Controls Panel - Accordion */}
            <AccordionSection title="Vezérlőpult (Beállítások, Hangolás, MIDI)" defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Scale & Transposition */}
                    <div className="p-4 bg-gray-900/40 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Skála</label>
                            <select 
                                value={selectedScaleName} 
                                onChange={(e) => setSelectedScaleName(e.target.value)} 
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                            >
                                {scales.map(scale => (<option key={scale.name} value={scale.name}>{scale.name}</option>))}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-gray-400 mb-1">Transzponálás</label>
                             <div className="flex gap-2">
                                 <select 
                                    value={noteNames[rootNoteMidi]}
                                    onChange={(e) => setRootNoteMidi(noteNames.indexOf(e.target.value))} 
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    {noteNames.map(note => <option key={note} value={note}>{note}</option>)}
                                </select>
                                <button
                                    onClick={() => setUseSharpNotation(prev => !prev)}
                                    className="w-10 h-10 flex-shrink-0 bg-gray-700 border border-gray-600 rounded-lg font-mono text-lg text-white hover:bg-gray-600 transition"
                                    title="Hangnem jelölés váltása (♯/♭)"
                                >
                                    {useSharpNotation ? '♯' : '♭'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Rotation, Volume & Audio Settings */}
                    <div className="p-4 bg-gray-900/40 rounded-lg border border-slate-700/50 flex flex-col gap-3 justify-center">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Elforgatás</label>
                            <div className="flex items-center gap-2">
                                 <input type="range" min="-180" max="180" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                 <button onClick={() => setRotation(0)} className="text-gray-400 hover:text-white" title="Alaphelyzetbe állítás"><i className="fa-solid fa-arrow-rotate-left"></i></button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Fő Hangerő</label>
                             <div className="flex items-center gap-2">
                                <i className="fa-solid fa-volume-low text-gray-500 text-xs"></i>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={masterVolume}
                                    onChange={e => setMasterVolume(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                 <i className="fa-solid fa-volume-high text-gray-500 text-xs"></i>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-medium text-gray-400">Hangszóró</span>
                            <button
                                onClick={toggleMute}
                                className={`w-10 h-8 rounded-lg text-white transition-colors flex items-center justify-center ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-500'}`}
                                title={isMuted ? 'Némítás feloldása' : 'Némítás'}
                            >
                                <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                            </button>
                        </div>
                    </div>

                    {/* Tuner & MIDI & Calibration */}
                     <div className="p-4 bg-gray-900/40 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2 flex-grow">
                                <button
                                    onClick={isListening ? stopTuner : startTuner}
                                    className={`w-10 h-10 rounded-full text-white font-bold text-lg flex items-center justify-center transition-all duration-300 shadow-lg flex-shrink-0 ${
                                        isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                                    }`}
                                    title="Mikrofon (Tuner)"
                                >
                                    {isListening ? <i className="fa-solid fa-microphone-slash"></i> : <i className="fa-solid fa-microphone"></i>}
                                </button>
                                 <div className="text-center">
                                    {tunerError ? ( <p className="text-red-400 text-[10px]">{tunerError}</p> ) : 
                                    isListening ? ( detectedNotes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {detectedNotes.slice(0, 2).map(note => (
                                                <span key={note.frequency} className="text-xs font-bold text-teal-300">{note.noteName}{note.octave}</span>
                                            ))}
                                        </div>
                                    ) : ( <p className="text-gray-400 text-[10px] animate-pulse">Hallgatózás...</p> )) : 
                                    ( <p className="text-gray-500 text-[10px]">Mikrofon ki</p> )}
                                </div>
                            </div>
                             <div>
                                 {midiAccessError ? ( <p className="text-[10px] text-yellow-400">{midiAccessError}</p> ) : 
                                midiInputs.length > 0 ? (
                                    <div className="flex items-center gap-1 text-green-400 text-[10px]">
                                        <i className="fa-solid fa-check-circle"></i> <span>MIDI</span>
                                    </div>
                                ) : ( <p className="text-[10px] text-gray-400">No MIDI</p> )}
                            </div>
                        </div>

                        <div className="border-t border-gray-700 pt-2 mt-1">
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    onClick={startCalibration}
                                    disabled={calibrationState === 'measuring'}
                                    className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-colors ${calibrationState === 'measuring' ? 'bg-yellow-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                                >
                                    {calibrationState === 'measuring' ? `Mérés... ${calibrationCountdown}s` : 'Haladó Kalibrálás'}
                                </button>
                            </div>
                             {calibrationStats && (
                                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-300 bg-black/30 p-2 rounded">
                                    <div className="flex justify-between"><span>Volume:</span> <span className="text-teal-400">{calibrationStats.volume}%</span></div>
                                    <div className="flex justify-between"><span>Normalize:</span> <span className="text-teal-400">{calibrationStats.normalization}%</span></div>
                                    <div className="flex justify-between"><span>Ding Sens:</span> <span className="text-teal-400">{calibrationStats.dingSensitivity}%</span></div>
                                    <div className="flex justify-between"><span>Ding Amp:</span> <span className="text-teal-400">{calibrationStats.dingAmplify}%</span></div>
                                    <div className="flex justify-between"><span>Tone Sens:</span> <span className="text-teal-400">{calibrationStats.tonefieldSensitivity}%</span></div>
                                    <div className="flex justify-between"><span>Tone Amp:</span> <span className="text-teal-400">{calibrationStats.tonefieldAmplify}%</span></div>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            </AccordionSection>
            
            {/* 3. Chord Progression Editor */}
            <AccordionSection title="Akkordmenet Szerkesztő" defaultOpen={true}>
                <div className="space-y-4">
                     <h4 className="text-lg font-bold text-teal-300 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-layer-group"></i> Akkordok és Lejátszás
                    </h4>
                    <div>
                        <textarea
                            value={progressionInput}
                            onChange={(e) => setProgressionInput(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 font-mono text-white focus:ring-2 focus:ring-teal-500 outline-none transition-shadow text-base"
                            rows={3}
                            placeholder="Dm C | Bb Am"
                        />
                         <p className="text-xs text-gray-500 mt-1">Írj be akkordokat (pl. Dm, C, Bb) elválasztva szóközzel. Az ütemeket '|' jellel válaszd el.</p>
                    </div>
                    {parseError && <p className="text-red-400 text-sm">{parseError}</p>}

                    <div className="space-y-4 pt-4">
                        <div ref={progressionContainerRef} className="w-full bg-white/95 rounded-lg p-4 overflow-x-auto shadow-inner min-h-[160px]"></div>
                        
                        {parsedProgression.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-gray-900/40 p-4 rounded-lg border border-slate-700/50">
                                <button
                                    onClick={handlePlayToggle}
                                    className={`w-16 h-16 rounded-full text-white font-bold text-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 flex-shrink-0 ${playbackState.isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                                >
                                    <i className={`fa-solid ${playbackState.isPlaying ? 'fa-stop' : 'fa-play'}`}></i>
                                </button>
                                <div className="w-full max-w-xs">
                                    <label className="block text-sm font-medium text-center text-gray-300 mb-2 font-mono">Tempó: <span className="text-teal-400 font-bold">{bpm} BPM</span></label>
                                    <input type="range" min="60" max="180" value={bpm} onChange={e => setBpm(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>60</span>
                                        <span>180</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </AccordionSection>
        </Card>
    );
};

export default Handpan;