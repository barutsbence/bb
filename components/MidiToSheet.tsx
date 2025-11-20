
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from './Card';
import { useMidiInput } from '../hooks/useMidiInput';
// FIX: Use named imports for VexFlow to avoid namespace/type collision.
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, StaveConnector, Resolution } from 'vexflow';
import { NOTE_NAMES_SHARP_HU, NOTE_NAMES_FLAT_HU } from '../constants';

type Mode = 'record' | 'live';
type TimeSignature = '4/4' | '3/4' | '2/4';
type QuantizeValue = '4' | '8' | '16';

// --- Types for State Management ---
type NoteData = { keys: string[]; duration: string; clef: string };
type ActiveNoteInfo = { noteData: NoteData; startTime: number };

// FIX: VexFlow 4 Resolution constant. Use hardcoded value or import if available. Standard is 16384.
const VEX_RESOLUTION = 16384;


// --- Key Signature Data ---
const KEY_SIGNATURES: Record<string, { vexKey: string; notes: string[] }> = {
    'C-dúr / a-moll': { vexKey: 'C', notes: ['C','D','E','F','G','A','H'] },
    'G-dúr / e-moll': { vexKey: 'G', notes: ['G','A','H','C','D','E','F#'] },
    'D-dúr / h-moll': { vexKey: 'D', notes: ['D','E','F#','G','A','H','C#'] },
    'A-dúr / f#-moll': { vexKey: 'A', notes: ['A','H','C#','D','E','F#','G#'] },
    'E-dúr / c#-moll': { vexKey: 'E', notes: ['E','F#','G#','A','H','C#','D#'] },
    'H-dúr / g#-moll': { vexKey: 'B', notes: ['H','C#','D#','E','F#','G#','A#'] },
    'F#-dúr / d#-moll': { vexKey: 'F#', notes: ['F#','G#','A#','H','C#','D#','E#'] },
    'C#-dúr / a#-moll': { vexKey: 'C#', notes: ['C#','D#','E#','F#','G#','A#','H#'] },
    'F-dúr / d-moll': { vexKey: 'F', notes: ['F','G','A','Bb','C','D','E'] },
    'Bb-dúr / g-moll': { vexKey: 'Bb', notes: ['Bb','C','D','Eb','F','G','A'] },
    'Eb-dúr / c-moll': { vexKey: 'Eb', notes: ['Eb','F','G','Ab','Bb','C','D'] },
    'Ab-dúr / f-moll': { vexKey: 'Ab', notes: ['Ab','Bb','C','Db','Eb','F','G'] },
    'Db-dúr / bb-moll': { vexKey: 'Db', notes: ['Db','Eb','F','Gb','Ab','Bb','C'] },
    'Gb-dúr / eb-moll': { vexKey: 'Gb', notes: ['Gb','Ab','Bb','Cb','Db','Eb','F'] },
    'Cb-dúr / ab-moll': { vexKey: 'Cb', notes: ['Cb','Db','Eb','Fb','Gb','Ab','Bb'] },
};
const noteToMidi: { [key: string]: number } = {'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3, 'E':4, 'E#':5, 'F':5, 'F#':6, 'Gb':6, 'G':7, 'G#':8, 'Ab':8, 'A':9, 'A#':10, 'Bb':10, 'H':11, 'B':11, 'Cb':11};
const diatonicKeyMidiNotes = Object.fromEntries(Object.entries(KEY_SIGNATURES).map(([key, data]) => [key, data.notes.map(note => noteToMidi[note])]));

const MidiToSheet: React.FC = () => {
    const [mode, setMode] = useState<Mode>('record');
    const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
    const [quantizeValue, setQuantizeValue] = useState<QuantizeValue>('16');
    const [keySignature, setKeySignature] = useState('C-dúr / a-moll');
    const [preferSharps, setPreferSharps] = useState(true);

    const recordedNotesRef = useRef<NoteData[]>([]);
    const activeNotesRef = useRef<Map<number, ActiveNoteInfo>>(new Map());
    const needsRedrawRef = useRef(false);

    const containerRef = useRef<HTMLDivElement>(null);
    // FIX: Use correct type 'Renderer' instead of namespace 'Vex.Flow.Renderer'.
    const rendererRef = useRef<Renderer | null>(null);

    const midiToVexKey = useCallback((midi: number): string => {
        const octave = Math.floor(midi / 12) - 1;
        const midiMod12 = midi % 12;
        const scaleNoteNames = KEY_SIGNATURES[keySignature].notes;
        const scaleMidiNotes = diatonicKeyMidiNotes[keySignature];
        const diatonicIndex = scaleMidiNotes.indexOf(midiMod12);
        let noteName: string;

        if (diatonicIndex !== -1) {
            noteName = scaleNoteNames[diatonicIndex];
        } else {
            const noteNames = preferSharps ? NOTE_NAMES_SHARP_HU : NOTE_NAMES_FLAT_HU;
            noteName = noteNames[midiMod12];
        }
        
        let vexNoteName = noteName.toLowerCase();
        if (vexNoteName === 'h') vexNoteName = 'b';
        return `${vexNoteName}/${octave}`;
    }, [keySignature, preferSharps]);
    
    const quantizeDuration = useCallback((durationMs: number): string => {
        const bpm = 120; // A fixed BPM for quantization, as there's no tempo control in this component.
        const quarterNoteMs = 60000 / bpm;
        const sixteenthNoteMs = quarterNoteMs / 4;

        // The smallest rhythmic value to snap to, based on user selection.
        const quantizeGrid = parseInt(quantizeValue, 10); // 4, 8, or 16
        const minGridInSixteenths = 16 / quantizeGrid; // e.g., for 8th notes, the grid is 2 sixteenths.

        // Calculate the duration in terms of 16th notes.
        const totalSixteenths = durationMs / sixteenthNoteMs;

        // Round the duration to the nearest multiple of the selected quantization grid.
        const quantizedSixteenths = Math.max(
            minGridInSixteenths, // Ensure at least the minimum duration
            Math.round(totalSixteenths / minGridInSixteenths) * minGridInSixteenths
        );

        // This map helps find the best single VexFlow note to represent a duration.
        // It doesn't handle ties, but finds the closest match.
        const durationMap: { vex: string, sixteenths: number }[] = [
            { vex: 'w', sixteenths: 16 },   // whole note
            { vex: 'hd', sixteenths: 12 },  // dotted half
            { vex: 'h', sixteenths: 8 },   // half
            { vex: 'qd', sixteenths: 6 },   // dotted quarter
            { vex: 'q', sixteenths: 4 },   // quarter
            { vex: '8d', sixteenths: 3 },   // dotted eighth
            { vex: '8', sixteenths: 2 },   // eighth
            { vex: '16', sixteenths: 1 },  // sixteenth
        ];

        // Find the VexFlow duration that is closest to our quantized duration.
        let bestMatch = durationMap[durationMap.length - 1]; // Default to the smallest unit
        let smallestDifference = Infinity;

        for (const duration of durationMap) {
            const difference = Math.abs(quantizedSixteenths - duration.sixteenths);
            if (difference < smallestDifference) {
                smallestDifference = difference;
                bestMatch = duration;
            }
        }

        return bestMatch.vex;
    }, [quantizeValue]);

    const onMidiMessage = useCallback((event: MIDIMessageEvent) => {
        const command = event.data[0];
        const noteMidi = event.data[1];
        const velocity = event.data.length > 2 ? event.data[2] : 0;

        if ((command & 0xF0) === 0x90 && velocity > 0) { // Note On
            if (activeNotesRef.current.has(noteMidi)) return;
            const vexKey = midiToVexKey(noteMidi);
            const clef = noteMidi >= 60 ? 'treble' : 'bass';
            const noteData: NoteData = { keys: [vexKey], duration: '16', clef };
            
            activeNotesRef.current.set(noteMidi, { noteData, startTime: Date.now() });
            needsRedrawRef.current = true;
        } else if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocity === 0)) { // Note Off
            const activeNote = activeNotesRef.current.get(noteMidi);
            if (activeNote) {
                const durationMs = Date.now() - activeNote.startTime;
                const vexDuration = quantizeDuration(durationMs);
                const vexKey = midiToVexKey(noteMidi);
                const clef = noteMidi >= 60 ? 'treble' : 'bass';
                const finalNoteData: NoteData = { keys: [vexKey], duration: vexDuration, clef };

                if (mode === 'record') {
                    recordedNotesRef.current.push(finalNoteData);
                }
                activeNotesRef.current.delete(noteMidi);
                needsRedrawRef.current = true;
            }
        }
    }, [mode, midiToVexKey, quantizeDuration]);
    
    const { midiInputs, midiAccessError } = useMidiInput(onMidiMessage);

    const drawScore = useCallback(() => {
        if (!containerRef.current || !rendererRef.current) return;
        const renderer = rendererRef.current;
        const context = renderer.getContext();
        context.clear();

        const recordedVexNotes = recordedNotesRef.current.map(data => new StaveNote(data));

        const activeNotes = Array.from(activeNotesRef.current.values());
        // FIX: Use correct type 'StaveNote' instead of namespace 'Vex.Flow.StaveNote'.
        const activeVexNotes: StaveNote[] = [];
        if (activeNotes.length > 0) {
            const trebleNotes = activeNotes.filter((n: ActiveNoteInfo) => n.noteData.clef === 'treble');
            const bassNotes = activeNotes.filter((n: ActiveNoteInfo) => n.noteData.clef === 'bass');

            if (trebleNotes.length > 0) {
                const chord = new StaveNote({
                    keys: trebleNotes.map((n: ActiveNoteInfo) => n.noteData.keys[0]),
                    duration: 'q',
                    clef: 'treble'
                });
                chord.setStyle({ fillStyle: '#14b8a6', strokeStyle: '#14b8a6' });
                (chord as any).isLive = true;
                activeVexNotes.push(chord);
            }
            if (bassNotes.length > 0) {
                const chord = new StaveNote({
                    keys: bassNotes.map((n: ActiveNoteInfo) => n.noteData.keys[0]),
                    duration: 'q',
                    clef: 'bass'
                });
                chord.setStyle({ fillStyle: '#14b8a6', strokeStyle: '#14b8a6' });
                (chord as any).isLive = true;
                activeVexNotes.push(chord);
            }
        }
        
        const allVexNotes = mode === 'record'
            ? [...recordedVexNotes, ...activeVexNotes]
            : activeVexNotes;
        
        // FIX: Use VEX_RESOLUTION instead of Flow.RESOLUTION.
        const ticksPerMeasure = (parseInt(timeSignature[0]) / parseInt(timeSignature[2])) * VEX_RESOLUTION;

        // FIX: Use correct type 'StaveNote' instead of namespace 'Vex.Flow.StaveNote'.
        const groupIntoMeasures = (notes: StaveNote[]): StaveNote[][] => {
            if (notes.length === 0) return [];
            // FIX: Use correct type 'StaveNote' instead of namespace 'Vex.Flow.StaveNote'.
            const measures: StaveNote[][] = [];
            // FIX: Use correct type 'StaveNote' instead of namespace 'Vex.Flow.StaveNote'.
            let currentMeasure: StaveNote[] = [];
            let currentTicks = 0;

            notes.forEach(note => {
                const isLiveNote = (note as any).isLive === true;
                const noteTicks = isLiveNote ? 0 : note.getTicks().value();

                if (currentTicks + noteTicks > ticksPerMeasure && currentMeasure.length > 0) {
                    measures.push(currentMeasure);
                    currentMeasure = [note];
                    currentTicks = noteTicks;
                } else {
                    currentMeasure.push(note);
                    currentTicks += noteTicks;
                }
            });
            if (currentMeasure.length > 0) measures.push(currentMeasure);
            return measures;
        };

        const trebleMeasures = groupIntoMeasures(allVexNotes.filter(n => n.getClef() === 'treble'));
        const bassMeasures = groupIntoMeasures(allVexNotes.filter(n => n.getClef() === 'bass'));
        
        const numMeasures = Math.max(trebleMeasures.length, bassMeasures.length, 1);
        const measureWidth = 250;
        const totalWidth = numMeasures * measureWidth + 60;
        
        renderer.resize(totalWidth, 300);

        let x = 10;
        for (let i = 0; i < numMeasures; i++) {
            const isFirstMeasure = i === 0;
            const currentMeasureWidth = isFirstMeasure ? measureWidth + 40 : measureWidth;
            
            const trebleStave = new Stave(x, 40, currentMeasureWidth);
            const bassStave = new Stave(x, 150, currentMeasureWidth);
            
            if (isFirstMeasure) {
                const vexflowKey = KEY_SIGNATURES[keySignature].vexKey;
                trebleStave.addClef('treble').addTimeSignature(timeSignature).addKeySignature(vexflowKey);
                bassStave.addClef('bass').addTimeSignature(timeSignature).addKeySignature(vexflowKey);
                new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(context).draw();
                new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
            }

            trebleStave.setContext(context).draw();
            bassStave.setContext(context).draw();

            // FIX: Use correct type 'StaveNote' and 'Stave' instead of namespace.
            const formatAndDraw = (notes: StaveNote[], stave: Stave) => {
                if (notes.length > 0) {
                    try {
                        const voice = new Voice({ numBeats: parseInt(timeSignature[0]), beatValue: parseInt(timeSignature[2]) }).setStrict(false).addTickables(notes);
                        new Formatter().joinVoices([voice]).format([voice], measureWidth - 20);
                        voice.draw(context, stave);
                        const notesToBeam = notes.filter(n => !n.isRest() && !(n as any).isLive);
                        const autoBeamed = Beam.generateBeams(notesToBeam);
                        autoBeamed.forEach(beam => beam.setContext(context).draw());
                    } catch (e) {
                        console.error("VexFlow rendering error:", e);
                    }
                }
            };
            
            formatAndDraw(trebleMeasures[i] || [], trebleStave);
            formatAndDraw(bassMeasures[i] || [], bassStave);

            x += currentMeasureWidth;
        }

    }, [mode, timeSignature, keySignature]);

    useEffect(() => {
        if (containerRef.current && !rendererRef.current) {
            rendererRef.current = new Renderer(containerRef.current, Renderer.Backends.SVG);
            needsRedrawRef.current = true;
        }
    }, []);
    
    useEffect(() => {
        needsRedrawRef.current = true;
    }, [mode, timeSignature, keySignature, preferSharps]);

    useEffect(() => {
        let animationFrameId: number;
        const renderLoop = () => {
            if (needsRedrawRef.current) {
                drawScore();
                needsRedrawRef.current = false;
            }
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [drawScore]);

    const handleClear = () => {
        recordedNotesRef.current = [];
        activeNotesRef.current.clear();
        needsRedrawRef.current = true;
    };
    
    return (
        <Card title="Kottaíró" icon="fa-solid fa-file-pen">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
                <div>
                    <label className="text-sm font-medium text-gray-400">Mód</label>
                    <select value={mode} onChange={e => setMode(e.target.value as Mode)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option value="record">Kottaírás</option>
                        <option value="live">Élő Nézet</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-400">Ütemmutató</label>
                    <select value={timeSignature} onChange={e => setTimeSignature(e.target.value as TimeSignature)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-400">Kvantálás</label>
                    <select value={quantizeValue} onChange={e => setQuantizeValue(e.target.value as QuantizeValue)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        <option value="16">Tizenhatod</option>
                        <option value="8">Nyolcad</option>
                        <option value="4">Negyed</option>
                    </select>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                    <label className="text-sm font-medium text-gray-400">Előjegyzés</label>
                     <select value={keySignature} onChange={e => setKeySignature(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        {Object.keys(KEY_SIGNATURES).map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-400">Módosítás</label>
                     <button
                        onClick={() => setPreferSharps(prev => !prev)}
                        className="mt-1 w-full h-10 bg-gray-700 border border-gray-600 rounded-lg font-mono text-xl text-white hover:bg-gray-600 transition"
                    >
                        {preferSharps ? '♯' : '♭'}
                    </button>
                </div>
            </div>

            <div ref={containerRef} className="w-full h-[300px] bg-white/95 rounded-lg p-2 overflow-x-auto shadow-inner"></div>

            <div className="flex justify-between items-center mt-4">
                 <div className="text-sm text-gray-400">
                    {midiAccessError ? <span className="text-yellow-400">{midiAccessError}</span> : midiInputs.length > 0 ? <span className="text-green-400">MIDI Csatlakoztatva: {midiInputs.map(i => i.name).join(', ')}</span> : <span>Nincs MIDI eszköz...</span>}
                </div>
                <button onClick={handleClear} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">
                    <i className="fa-solid fa-trash mr-2"></i>Törlés
                </button>
            </div>
        </Card>
    );
};

export default MidiToSheet;