import React, { useState, useCallback, useEffect, useRef } from 'react';
import useMetronome, { AccentLevel } from '../hooks/useMetronome';
import { useStopwatch } from '../hooks/useStopwatch';
import Card from './Card';
import { SyllableLanguage } from '../constants';

const getTempoMarking = (bpm: number): string => {
    if (bpm < 40) return 'Grave';
    if (bpm <= 60) return 'Largo';
    if (bpm <= 66) return 'Larghetto';
    if (bpm <= 76) return 'Adagio';
    if (bpm <= 108) return 'Andante';
    if (bpm <= 120) return 'Moderato';
    if (bpm <= 168) return 'Allegro';
    if (bpm <= 200) return 'Presto';
    return 'Prestissimo';
}

type NoteDivision = 'whole' | 'half' | 'dotted-half' | 'quarter' | 'dotted-quarter' | 'eighth' | 'dotted-eighth' | 'triplet' | 'sixteenth' | 'thirtysecond';

const noteDivisionFactors: Record<NoteDivision, number> = {
    'whole': 4,
    'dotted-half': 3,
    'half': 2,
    'dotted-quarter': 1.5,
    'quarter': 1,
    'dotted-eighth': 0.75,
    'eighth': 0.5,
    'triplet': 2 / 3,
    'sixteenth': 0.25,
    'thirtysecond': 0.125,
};

const NoteIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
    const commonSVGProps = {
        viewBox: "0 0 28 32",
        className: `fill-current ${className}`
    };
    const commonStem = <line x1="15" y1="27" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" />;
    const quarterNoteHead = <ellipse cx="10" cy="27" rx="5" ry="3.5" />;

    switch (type) {
        case 'quarter':
            return <svg {...commonSVGProps}>{quarterNoteHead}{commonStem}</svg>;
        case 'eighth':
            return (
                <svg {...commonSVGProps}>
                    {quarterNoteHead}{commonStem}
                    <path d="M15 5 C 19 6, 21 9, 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
            );
        case 'triplet':
            return (
                 <svg {...commonSVGProps} viewBox="0 0 28 35" className={`fill-current overflow-visible ${className}`}>
                    <text x="14" y="3" fontSize="10" textAnchor="middle" fontWeight="bold">3</text>
                    <g transform="translate(0, 3)">
                        {quarterNoteHead}{commonStem}
                        <path d="M15 5 C 19 6, 21 9, 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </g>
                </svg>
            );
        case 'sixteenth':
            return (
                <svg {...commonSVGProps}>
                    {quarterNoteHead}{commonStem}
                    <path d="M15 5 C 19 6, 21 9, 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M15 9 C 19 10, 21 13, 20 16" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
            );
        default:
            return null;
    }
};

const PingPongVisualizer = ({ position, fb, delayMs }: { position: string; fb: number; delayMs: number }) => {
    const echoCount = Math.min(5, Math.floor(fb / 18));

    return (
        <div className="relative h-8 bg-gray-900/50 rounded-lg overflow-hidden my-2 border border-slate-700/50">
            <div 
                className="absolute w-2.5 h-2.5 bg-teal-300 rounded-full top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(50,215,185,0.7)]"
                style={{ left: position, transition: `left ${delayMs / 1000}s ease-in-out` }}
            />
            {[...Array(echoCount)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute w-2.5 h-2.5 bg-teal-300/70 rounded-full top-1/2 -translate-y-1/2"
                    style={{ 
                        left: position, 
                        opacity: Math.pow(fb / 100, i + 1) * 0.8,
                        transition: `left ${delayMs / 1000}s ease-in-out ${ (delayMs / 2000) * (i + 1)}s`
                    }}
                />
            ))}
        </div>
    );
};

const Metronome: React.FC = () => {
  const { 
    isPlaying, bpm, setBpm, timeSignature, setTimeSignature, subdivision, setSubdivision, 
    currentBeat, currentSubBeat, togglePlay, accentLevel, setAccentLevel, volume, setVolume, accentedBeats, 
    toggleAccentBeat, showSyllables, setShowSyllables, syllableLanguage, setSyllableLanguage, 
    syllablePattern, setSyllablePattern, availableSyllablePatterns, syllablesToDisplay, syllablesAvailableForCurrentTS
  } = useMetronome(120, 4);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const { formattedTime, start: startStopwatch, pause: pauseStopwatch, reset: resetStopwatch } = useStopwatch();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDelayCalculator, setShowDelayCalculator] = useState(true);

  // --- Delay Calculator State ---
  const [noteDivision, setNoteDivision] = useState<NoteDivision>('quarter');
  const [delayMs, setDelayMs] = useState(500);
  const [feedback, setFeedback] = useState(50);
  const [isManualDelayRunning, setIsManualDelayRunning] = useState(false);
  const [visualizerPosition, setVisualizerPosition] = useState('50%');
  const visualizerIntervalRef = useRef<number | null>(null);
  const visualizerTimeoutRef = useRef<number | null>(null);
  const nextVisualizerPositionRef = useRef<'10%' | '90%'>('90%');

  const calculateDelay = useCallback((currentBpm: number, division: NoteDivision): number => {
      if (currentBpm < 20 || currentBpm > 280) return 500;
      const quarterNoteTime = 60000 / currentBpm;
      return Math.round(quarterNoteTime * noteDivisionFactors[division]);
  }, []);
  
  useEffect(() => {
      setDelayMs(calculateDelay(bpm, noteDivision));
  }, [bpm, noteDivision, calculateDelay]);

  const stopVisualizerAnimation = useCallback(() => {
    if (visualizerIntervalRef.current) {
        clearInterval(visualizerIntervalRef.current);
        visualizerIntervalRef.current = null;
    }
    if (visualizerTimeoutRef.current) {
        clearTimeout(visualizerTimeoutRef.current);
        visualizerTimeoutRef.current = null;
    }
    setVisualizerPosition('50%');
    nextVisualizerPositionRef.current = '90%';
  }, []);

  const startManualVisualizerAnimation = useCallback(() => {
      stopVisualizerAnimation();
      visualizerTimeoutRef.current = window.setTimeout(() => {
          setVisualizerPosition(nextVisualizerPositionRef.current);
          nextVisualizerPositionRef.current = nextVisualizerPositionRef.current === '90%' ? '10%' : '90%';
          visualizerIntervalRef.current = window.setInterval(() => {
              setVisualizerPosition(nextVisualizerPositionRef.current);
              nextVisualizerPositionRef.current = nextVisualizerPositionRef.current === '90%' ? '10%' : '90%';
          }, delayMs);
      }, 10);
  }, [delayMs, stopVisualizerAnimation]);

  const handleManualDelayToggle = () => {
    if (isManualDelayRunning) {
        stopVisualizerAnimation();
    } else {
        startManualVisualizerAnimation();
    }
    setIsManualDelayRunning(p => !p);
  };
  
  useEffect(() => {
    if (!isPlaying) {
        if (!isManualDelayRunning) {
            stopVisualizerAnimation();
        }
        return;
    }

    if (isManualDelayRunning) {
        setIsManualDelayRunning(false);
    }
    stopVisualizerAnimation();

    let animationFrameId: number;
    const startTime = performance.now();
    let nextTickTime = startTime + 10;
    let tickCount = 0;

    const animationLoop = (currentTime: number) => {
        if (!isPlaying) return;

        if (currentTime >= nextTickTime) {
            const newPosition = (tickCount % 2 === 0) ? '90%' : '10%';
            setVisualizerPosition(newPosition);
            nextTickTime += delayMs;
            tickCount++;
        }
        animationFrameId = requestAnimationFrame(animationLoop);
    };

    animationFrameId = requestAnimationFrame(animationLoop);

    return () => {
        cancelAnimationFrame(animationFrameId);
        stopVisualizerAnimation();
    };
  }, [isPlaying, delayMs, isManualDelayRunning, stopVisualizerAnimation]);

  useEffect(() => {
    if (isPlaying) {
      startStopwatch();
    } else {
      pauseStopwatch();
    }
  }, [isPlaying, startStopwatch, pauseStopwatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const handleBpmChange = (newBpm: number) => {
    if (newBpm >= 20 && newBpm <= 280) {
      setBpm(newBpm);
    }
  };

  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTimestamps = [...tapTimestamps, now].slice(-4);
    if (newTimestamps.length > 1) {
      const intervals = newTimestamps.slice(1).map((ts, i) => ts - newTimestamps[i]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) handleBpmChange(Math.round(60000 / avgInterval));
    }
    setTapTimestamps(newTimestamps);
  }, [tapTimestamps]);
  
  const pendulumAnimationDuration = isPlaying ? (60 / bpm) * 2 : 0;
  // For upright pendulum, high weight = slow tempo. Low weight = fast tempo.
  // We want a percentage for the `bottom` property.
  // Low BPM (40) -> High position (e.g., 80%). High BPM (240) -> Low position (e.g., 10%).
  const invertedWeightPosition = 10 + ((240 - bpm) / (240 - 40)) * 70;

  const subdivisionOptions: { value: number; icon: string; label: string; }[] = [
    { value: 1, icon: 'quarter', label: 'Negyed' },
    { value: 2, icon: 'eighth', label: 'Nyolcad' },
    { value: 3, icon: 'triplet', label: 'Triola' },
    { value: 4, icon: 'sixteenth', label: 'Tizenhatod' },
  ];

  return (
    <Card title="Metronóm" icon="fa-solid fa-stopwatch">
        <style>
        {`
            @keyframes swing { 0% { transform: rotate(-35deg); } 50% { transform: rotate(35deg); } 100% { transform: rotate(-35deg); } }
            .pendulum-animate { animation: swing ${pendulumAnimationDuration}s ease-in-out infinite; }
        `}
        </style>

        {/* --- Delay Calculator Section --- */}
        <div className="mb-8">
            <div className="w-full bg-gray-900/50 rounded-lg border border-slate-700/50">
                <button onClick={() => setShowDelayCalculator(!showDelayCalculator)} className="w-full p-3 flex justify-between items-center font-semibold text-teal-300">
                    <span><i className="fa-solid fa-calculator mr-2"></i>Delay Kalkulátor</span>
                    <i className={`fa-solid fa-chevron-down transform transition-transform duration-300 ${showDelayCalculator ? 'rotate-180' : ''}`}></i>
                </button>
                {showDelayCalculator && (
                    <div className="p-4 border-t border-slate-700/50">
                         <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Hangjegy</label>
                                 <select value={noteDivision} onChange={e => setNoteDivision(e.target.value as NoteDivision)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                                     <option value="whole">Egész</option> <option value="dotted-half">Pontozott Fél</option> <option value="half">Fél</option> <option value="dotted-quarter">Pontozott Negyed</option> <option value="quarter">Negyed</option> <option value="triplet">Triola (negyed)</option> <option value="dotted-eighth">Pontozott Nyolcad</option> <option value="eighth">Nyolcad</option> <option value="sixteenth">Tizenhatod</option>
                                 </select>
                            </div>
                            <div className="p-2 bg-gray-900 rounded-lg text-center flex flex-col justify-center">
                                <p className="text-xs text-gray-400">Delay Idő</p>
                                <p className="text-2xl font-bold font-mono text-teal-300">{delayMs} ms</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-grow">
                                <PingPongVisualizer position={visualizerPosition} fb={feedback} delayMs={delayMs} />
                            </div>
                            {!isPlaying && (
                                <button onClick={handleManualDelayToggle} className={`w-10 h-10 flex-shrink-0 rounded-full text-white text-lg flex items-center justify-center transition-colors shadow-md ${isManualDelayRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`} aria-label={isManualDelayRunning ? "Delay vizualizáció leállítása" : "Delay vizualizáció indítása"}>
                                    <i className={`fa-solid ${isManualDelayRunning ? 'fa-stop' : 'fa-play'}`}></i>
                                </button>
                            )}
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Visszacsatolás (Vizuális)</label>
                            <input type="range" min="0" max="100" value={feedback} onChange={(e) => setFeedback(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-8">
            
            {/* --- LEFT COLUMN: Main Controls & Visualizer --- */}
            <div className="flex flex-col items-center justify-center gap-6">
                 <div className="relative w-full max-w-xs h-60 sm:h-72 flex flex-col justify-end items-center">
                    <div className="absolute top-0 text-center z-10">
                        <p className="text-6xl sm:text-7xl font-bold font-mono text-white tracking-tighter">{bpm}</p>
                        <p className="text-base sm:text-lg text-teal-300 -mt-2">{getTempoMarking(bpm)}</p>
                    </div>
                    
                    <div className="relative w-full h-full flex justify-center items-end">
                        <div className={`relative w-2 h-5/6 bg-gray-600 rounded-full origin-bottom ${isPlaying ? 'pendulum-animate' : ''}`} style={{ transform: 'rotate(0deg)' }}>
                            {/* Fixed marker at the top */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 -mt-2 border-2 border-gray-500 rounded-full" style={{ transform: 'rotate(0)' }}>
                                <div className="w-full h-full bg-gray-600 rounded-full"></div>
                            </div>
                            {/* Sliding Weight */}
                            <div className="absolute left-1/2 -translate-x-1/2 w-10 h-6 bg-teal-400 rounded-md shadow-lg transition-all duration-200" style={{ bottom: `${invertedWeightPosition}%` }}></div>
                        </div>
                    </div>

                    {/* Base of the metronome */}
                    <div className="w-24 h-4 bg-gray-700 rounded-t-md border-b-4 border-gray-900 shadow-inner"></div>
                </div>

                <div className="w-full max-w-sm flex items-center gap-4">
                    <button onClick={togglePlay} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white font-bold text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 shadow-lg flex-shrink-0 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`} aria-label={isPlaying ? 'Pause Metronome' : 'Start Metronome'}>
                        {isPlaying ? <i className="fa-solid fa-pause"></i> : <i className="fa-solid fa-play"></i>}
                    </button>
                    <div className="flex-grow">
                        <input type="range" min="40" max="240" value={bpm} onChange={(e) => handleBpmChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                         <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>40</span>
                            <span>240</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: Settings & Beat Display --- */}
            <div className="flex flex-col gap-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-800 rounded-lg">
                        <p className="font-semibold text-gray-400">Tap Tempo</p>
                        <button onClick={handleTap} className="w-20 h-20 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg uppercase tracking-wider rounded-full flex items-center justify-center shadow-md transition-transform transform active:scale-95 duration-200 border-2 border-indigo-500/50" aria-label="Tap Tempo">
                            Tap
                        </button>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-800 rounded-lg">
                        <p className="font-semibold text-gray-400">Stopper</p>
                        <span className="text-3xl font-mono text-gray-300">{formattedTime}</span>
                        <button onClick={() => { resetStopwatch(); if (isPlaying) startStopwatch(); }} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-4 rounded-lg text-sm">Reset</button>
                    </div>
                </div>

                <div className="p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
                    <div className="min-h-[60px] max-w-lg mx-auto">
                        {(() => {
                            const getBeatGroups = (ts: number): number[] => {
                                switch (ts) {
                                    case 6: return [3, 3];
                                    case 8: return [4, 4];
                                    case 9: return [3, 3, 3];
                                    case 10: return [5, 5];
                                    default: return [ts];
                                }
                            };
                            const shouldApplyGrouping = subdivision > 1;
                            const beatGroups = shouldApplyGrouping ? getBeatGroups(timeSignature) : [timeSignature];
                            let dotIndex = 0;

                            return (
                                <div className="flex flex-col items-center">
                                    {beatGroups.map((beatsInRow, rowIndex) => (
                                        <div key={rowIndex} className={`flex justify-center items-start gap-2 flex-wrap ${beatGroups.length > 1 && rowIndex < beatGroups.length - 1 ? 'mb-4' : ''}`}>
                                            {Array.from({ length: beatsInRow * subdivision }).map((_, i) => {
                                                const currentGlobalIndex = dotIndex++;
                                                const mainBeat = Math.floor(currentGlobalIndex / subdivision) + 1;
                                                const subBeat = (currentGlobalIndex % subdivision) + 1;

                                                const isLastDotOfSubGroup = (currentGlobalIndex + 1) % subdivision === 0;
                                                const isNotLastDotOfRow = i < (beatsInRow * subdivision) - 1;
                                                const marginClass = shouldApplyGrouping && isLastDotOfSubGroup && isNotLastDotOfRow ? 'mr-3' : '';

                                                const isActive = isPlaying && currentBeat === mainBeat && currentSubBeat === subBeat;
                                                const isAccented = accentedBeats.has(mainBeat);
                                                const syllableText = (showSyllables && syllablesToDisplay.length > currentGlobalIndex) ? syllablesToDisplay[currentGlobalIndex] : null;
                                                const isMainSubBeat = subBeat === 1;

                                                return (
                                                    <div key={currentGlobalIndex} className={`flex flex-col items-center gap-1 flex-grow ${marginClass}`} style={{ minWidth: '35px' }}>
                                                        <button
                                                            onClick={() => toggleAccentBeat(mainBeat)}
                                                            aria-label={`Hangsúly váltása a(z) ${mainBeat}. ütésen`}
                                                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700/50 transition-colors"
                                                        >
                                                            {isMainSubBeat && isAccented ? (
                                                                <i className={`fa-solid fa-check text-xl transition-colors duration-100 ${isActive ? 'text-teal-400' : 'text-gray-600'}`}></i>
                                                            ) : (
                                                                <div className={`rounded-full transition-colors duration-100 ${isActive ? 'bg-teal-400' : 'bg-gray-600'} ${isMainSubBeat ? 'w-3 h-3' : 'w-2 h-2'}`}></div>
                                                            )}
                                                        </button>
                                                        <div className="h-8 flex items-center">
                                                            {syllableText && (
                                                                <span className={`px-2 py-0.5 rounded text-xs transition-all duration-100 transform whitespace-nowrap ${isActive ? 'bg-teal-400 text-gray-900 scale-110 font-bold' : 'bg-transparent text-gray-300 font-medium'}`}>
                                                                    {syllableText}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
                        <p className="font-semibold text-gray-400 mb-2">Ütemmutató</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(ts => ( <button key={ts} onClick={() => setTimeSignature(ts)} className={`w-9 h-9 sm:w-10 sm:h-10 font-bold rounded ${timeSignature === ts ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{ts}</button>))}
                        </div>
                    </div>
                    <div className="text-center p-4 bg-gray-900/40 rounded-lg border border-slate-700/50">
                        <p className="font-semibold text-gray-400 mb-2">Felosztás</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {subdivisionOptions.map(opt => (
                                <button 
                                    key={opt.value} 
                                    onClick={() => setSubdivision(opt.value)} 
                                    className={`w-10 h-10 font-bold rounded flex items-center justify-center p-1 transition-colors ${subdivision === opt.value ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                    title={opt.label}
                                    aria-label={opt.label}
                                >
                                    <NoteIcon type={opt.icon} className="w-auto h-8 text-current" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* --- Advanced Settings Section --- */}
        <div className="mt-8">
            <div className="w-full bg-gray-900/50 rounded-lg border border-slate-700/50">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-3 flex justify-between items-center font-semibold text-teal-300">
                    <span><i className="fa-solid fa-wrench mr-2"></i>További Beállítások</span>
                    <i className={`fa-solid fa-chevron-down transform transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}></i>
                </button>
                {showAdvanced && (
                    <div className="p-4 border-t border-slate-700/50 space-y-6">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <p className="font-semibold text-gray-400 mb-2 text-center">Hangerő</p>
                                <div className="w-full flex items-center gap-3">
                                    <i className="fa-solid fa-volume-off text-gray-400"></i>
                                    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                    <i className="fa-solid fa-volume-high text-gray-400"></i>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-800 rounded-lg flex flex-col justify-center items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-400">Hangsúly</span>
                                    <button onClick={() => setAccentLevel(accentLevel === 'Medium' ? 'None' : 'Medium')} role="switch" aria-checked={accentLevel === 'Medium'} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 ${accentLevel === 'Medium' ? 'bg-teal-600' : 'bg-gray-700'}`}>
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${accentLevel === 'Medium' ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-400">Szótagok</span>
                                    <button onClick={() => setShowSyllables(prev => !prev)} role="switch" aria-checked={showSyllables} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500 ${showSyllables ? 'bg-teal-600' : 'bg-gray-700'}`}>
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${showSyllables ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Syllable Settings */}
                        {showSyllables && (
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <h3 className="text-center font-semibold text-gray-300 mb-2">Szótag Beállítások</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Nyelv</label>
                                        <select value={syllableLanguage} onChange={e => setSyllableLanguage(e.target.value as SyllableLanguage)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white capitalize" disabled={!syllablesAvailableForCurrentTS}>
                                            <option value="tala">Tala</option>
                                            <option value="magyar">Magyar</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Felosztás</label>
                                        <select value={syllablePattern} onChange={e => setSyllablePattern(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" disabled={availableSyllablePatterns.length <= 1}>
                                            {availableSyllablePatterns.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                            {availableSyllablePatterns.length === 0 && <option>N/A</option>}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </Card>
  );
};

export default Metronome;