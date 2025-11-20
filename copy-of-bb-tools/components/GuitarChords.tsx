import React, { useState, useEffect, useMemo } from 'react';
import Card from './Card';
// FIX: Local chord library and types moved to constants.ts to be shared.
import { CHORD_LIBRARY, chordTypes, ChordShape } from '../constants';
import { parseChord } from '../services/chordParser';

const ChordDiagram: React.FC<{ shape: ChordShape | null }> = ({ shape }) => {
    if (!shape) {
        return <p className="text-gray-500">Nincs találat. Próbálj másik akkordot.</p>;
    }

    const { frets, fingers, baseFret = 1 } = shape;
    const numFretsToShow = 5;
    const stringCount = 6;
    
    const fretsInView = frets.map(fret => {
        if (typeof fret !== 'number' || fret === 0) return fret;
        if (baseFret > 1) {
            return fret - baseFret + 1;
        }
        return fret;
    });
    
    const barreFingers = new Map<number, { first: number, last: number }>();
    {[...new Set(fingers.filter(f => typeof f === 'number' && f > 0) as number[])].forEach(finger => {
        const indices = fingers.flatMap((f, i) => f === finger ? [i] : []);
        if (indices.length < 2) return;
        
        const fretForBarre = frets[indices[0]];
        if (typeof fretForBarre !== 'number' || fretForBarre === 0) return;

        const isStraightBarre = indices.every(i => frets[i] === fretForBarre);
        if (isStraightBarre) {
            barreFingers.set(finger, { first: Math.min(...indices), last: Math.max(...indices) });
        }
    })};

    return (
        <div>
            <h3 className="text-xl font-semibold text-center mb-4 text-teal-300">{shape.name}</h3>
            <div className="font-mono text-sm text-gray-300 flex justify-center items-start">
                {baseFret > 1 && <div className="pr-2 pt-5 text-lg font-bold">{baseFret}fr</div>}
                <div className="relative">
                    <div className="flex justify-around mb-1">
                        {frets.map((fret, i) => (
                            <div key={`top-${i}`} className="w-6 text-center text-xs">{fret === 'x' ? 'x' : fret === 0 ? 'o' : ' '}</div>
                        ))}
                    </div>
                    <div className="relative w-[150px]">
                        {baseFret === 1 && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-400 rounded-t-sm"></div>}
                        {[...Array(stringCount)].map((_, i) => (
                            <div key={`str-${i}`} className="absolute top-0 bottom-0 bg-gray-500" style={{ left: `${(i / (stringCount - 1)) * 100}%`, width: '1px' }}></div>
                        ))}
                        {[...Array(numFretsToShow + 1)].map((_, i) => (
                            <div key={`frt-${i}`} className="absolute left-0 right-0 bg-gray-600" style={{ top: `${(i / numFretsToShow) * 100}%`, height: '1px' }}></div>
                        ))}
                        
                        <div className="relative h-40">
                             {Array.from(barreFingers.entries()).map(([finger, { first, last }]) => {
                                const displayFret = fretsInView[first] as number;
                                if (displayFret < 1 || displayFret > numFretsToShow) return null;
                                return (
                                    <div key={`barre-${finger}`} className="absolute h-5 bg-teal-400 rounded-full transform -translate-y-1/2 z-10"
                                        style={{ top: `${((displayFret - 0.5) / numFretsToShow) * 100}%`, left: `${(first / (stringCount - 1)) * 100}%`, width: `${((last - first) / (stringCount - 1)) * 100}%` }}
                                    ></div>
                                );
                            })}
                            {fretsInView.map((displayFret, stringIndex) => {
                                if (typeof displayFret !== 'number' || displayFret <= 0 || displayFret > numFretsToShow) return null;
                                const finger = fingers[stringIndex];
                                if (typeof finger !== 'number' || finger === 0) return null;
                                const isBarred = barreFingers.has(finger);

                                return (
                                    <div key={`dot-${stringIndex}`} className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 ${isBarred ? '' : 'bg-teal-400 text-gray-900 z-20'}`}
                                        style={{ top: `${((displayFret - 0.5) / numFretsToShow) * 100}%`, left: `${(stringIndex / (stringCount - 1)) * 100}%` }}
                                    >
                                        {!isBarred && finger}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GuitarChords: React.FC = () => {
    const [rootNote, setRootNote] = useState('C');
    const [qualityKey, setQualityKey] = useState('Major');
    const [voicingIndex, setVoicingIndex] = useState(0);

    useEffect(() => {
        setVoicingIndex(0);
    }, [rootNote, qualityKey]);
    
    const availableQualities = useMemo(() => {
        return CHORD_LIBRARY[rootNote] ? Object.keys(CHORD_LIBRARY[rootNote]) : [];
    }, [rootNote]);

    useEffect(() => {
        if (!availableQualities.includes(qualityKey)) {
            setQualityKey(availableQualities[0] || 'Major');
        }
    }, [rootNote, qualityKey, availableQualities]);

    const availableVoicings = CHORD_LIBRARY[rootNote]?.[qualityKey] || [];
    const selectedChordShape = availableVoicings[voicingIndex] || null;

    const chordNotes = useMemo(() => {
        if (!selectedChordShape) return null;
        const result = parseChord(selectedChordShape.name);
        return result ? result.notes : null;
    }, [selectedChordShape]);

    const handleNextVoicing = () => {
        if (availableVoicings.length > 0) {
            setVoicingIndex((prev) => (prev + 1) % availableVoicings.length);
        }
    };

    const handlePrevVoicing = () => {
        if (availableVoicings.length > 0) {
            setVoicingIndex((prev) => (prev - 1 + availableVoicings.length) % availableVoicings.length);
        }
    };
    
    return (
        <Card title="Gitár Akkordok" icon="fa-solid fa-diagram-project">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-sm font-medium text-gray-400">Alaphang</label>
                    <select value={rootNote} onChange={e => setRootNote(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                        {Object.keys(CHORD_LIBRARY).map(note => <option key={note} value={note}>{note}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-400">Akkord Típus</label>
                    <select value={qualityKey} onChange={e => setQualityKey(e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                         {availableQualities.map(key => <option key={key} value={key}>{chordTypes[key] || key}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={handlePrevVoicing} disabled={availableVoicings.length <= 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Előző</button>
                <span className="font-mono text-gray-400">{availableVoicings.length > 0 ? `${voicingIndex + 1} / ${availableVoicings.length}` : '0 / 0'}</span>
                <button onClick={handleNextVoicing} disabled={availableVoicings.length <= 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Következő</button>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-900/40 p-4 rounded-lg">
                <ChordDiagram shape={selectedChordShape} />
                 {chordNotes && (
                    <div className="mt-4 text-center border-t border-gray-700 pt-3 w-full max-w-xs">
                        <p className="text-gray-400 text-sm">Akkord hangjai:</p>
                        <p className="text-lg font-semibold text-teal-300 font-mono">
                            {chordNotes.join(' - ')}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default GuitarChords;