import React, { useState, useEffect } from 'react';
import Card from './Card';
import useTuner from '../hooks/useTuner';

const GuitarTuner: React.FC = () => {
    const [useSharpNotation, setUseSharpNotation] = useState(true);
    const [useHungarianNotation, setUseHungarianNotation] = useState(true);

    // State for calibration settings
    const [a4Hertz, setA4Hertz] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedA4 = localStorage.getItem('tunerA4');
            return savedA4 ? parseFloat(savedA4) : 440;
        }
        return 440;
    });
    const [showSettings, setShowSettings] = useState(false);
    
    // Save calibration to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('tunerA4', a4Hertz.toString());
        }
    }, [a4Hertz]);
    
    // The core tuner hook
    const { tunerState, isListening, error, start, stop } = useTuner(a4Hertz, useSharpNotation, useHungarianNotation);
    
    // --- UI State Calculation ---
    const detune = tunerState?.detune ?? 0;
    const isTune = tunerState ? Math.abs(detune) < 3 : false; // Stricter threshold for "perfect"
    const rotation = tunerState ? detune * 2.5 : 0; // Controls the "strobe" animation

    const getIndicatorColor = () => {
        if (!tunerState) return 'bg-gray-600';
        if (isTune) return 'bg-teal-400 shadow-[0_0_15px_rgba(50,215,185,0.7)]';
        if (Math.abs(detune) < 15) return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]';
        return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
    };
    
    const getTextColor = () => {
        if (!tunerState) return 'text-gray-500';
        if (isTune) return 'text-teal-300';
        if (Math.abs(detune) < 15) return 'text-yellow-300';
        return 'text-red-400';
    };

    const StrobeVisualizer = () => (
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Static outer ring */}
            <div className="absolute w-full h-full border-4 border-gray-700 rounded-full"></div>
            {/* Rotating strobe pattern */}
            <div 
                className="absolute w-full h-full transition-transform duration-200 ease-linear"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                {[...Array(36)].map((_, i) => (
                    <div 
                        key={i}
                        className={`absolute top-0 left-1/2 w-1 h-4 -ml-0.5`}
                        style={{ transform: `rotate(${i * 10}deg)`, transformOrigin: '0.5px 144px' /* center of 288px (72rem) */ }}
                    >
                         <div className={`w-full h-full rounded-full ${isTune ? 'bg-teal-300' : 'bg-gray-500'}`}></div>
                    </div>
                ))}
            </div>
             {/* Center display for note info */}
            <div className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 bg-gray-800 rounded-full flex flex-col items-center justify-center text-center shadow-2xl border-2 border-gray-700">
                <p className={`text-7xl sm:text-8xl font-bold transition-colors ${getTextColor()}`}>
                    {tunerState?.noteName ?? '-'}
                    <span className={`text-3xl sm:text-4xl align-text-top font-light ${tunerState ? 'text-gray-500' : 'text-gray-700'}`}>{tunerState?.octave}</span>
                </p>
                <p className={`text-lg h-6 font-semibold transition-colors ${getTextColor()}`}>
                    {tunerState ? `${detune > 0 ? '+' : ''}${detune.toFixed(1)} cents` : '...'}
                </p>
                 <p className="text-sm text-gray-500 h-5 font-mono">
                    {tunerState ? `${tunerState.frequency.toFixed(2)} Hz` : '--'}
                </p>
            </div>
        </div>
    );
    
    const SettingsPanel = () => (
        <div className="w-full max-w-xs p-4 bg-gray-900/50 rounded-lg border border-slate-700/50">
            <h4 className="text-lg font-semibold text-center mb-3 text-teal-300">Kalibráció</h4>
            <div className="text-center mb-3">
                <span className="font-mono text-xl">A4 = {a4Hertz.toFixed(1)} Hz</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">430</span>
                <input
                    type="range"
                    min="430"
                    max="450"
                    step="0.1"
                    value={a4Hertz}
                    onChange={(e) => setA4Hertz(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-400">450</span>
            </div>
            <div className="flex justify-center mt-4">
                <button
                    onClick={() => setA4Hertz(440)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm"
                >
                    Alaphelyzet (440 Hz)
                </button>
            </div>
        </div>
    );

    return (
        <Card title="Hangoló" icon="fa-solid fa-sliders">
            <div className="flex justify-between items-center mb-4 px-1">
                <div /> 
                <div className="flex items-center gap-2">
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
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-gray-400 hover:text-white transition-colors z-10 w-12 h-10"
                        aria-label="Kalibrációs beállítások"
                    >
                        <i className={`fa-solid fa-cog text-xl transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`}></i>
                    </button>
                </div>
            </div>
            <div className="flex flex-col items-center gap-6 sm:gap-8">
                {/* Indicator bar */}
                <div className="relative w-full max-w-xs h-2 rounded-full bg-gray-700 overflow-hidden">
                    <div 
                        className={`absolute top-0 bottom-0 h-full w-2 transition-all duration-200 ease-linear ${getIndicatorColor()}`}
                        style={{ left: `calc(50% + ${Math.max(-50, Math.min(50, detune))}%)`, transform: 'translateX(-50%)' }}
                    ></div>
                </div>

                <StrobeVisualizer />

                {/* Main control button */}
                <button
                    onClick={isListening ? stop : start}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full text-white font-bold text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                        isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                    aria-label={isListening ? 'Stop Tuner' : 'Start Tuner'}
                >
                    {isListening ? <i className="fa-solid fa-microphone-slash"></i> : <i className="fa-solid fa-microphone"></i>}
                </button>
                
                {showSettings && <SettingsPanel />}

                {error && <p className="text-center text-red-400 mt-2">{error}</p>}
            </div>
        </Card>
    );
};

export default GuitarTuner;