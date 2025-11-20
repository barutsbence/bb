import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from './Card';

type Tab = 'calculator' | 'tapper' | 'analyzer';
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

// --- Beat Detector Helper Class ---
class BeatDetector {
    private sensitivity: number;
    private threshold: number;
    private energyHistory: number[];
    private beatHistory: number[];
    private lastBeatTime: number;

    constructor(sensitivity = 5) {
        this.sensitivity = sensitivity;
        this.threshold = 0.15;
        this.energyHistory = new Array(30).fill(0);
        this.beatHistory = [];
        this.lastBeatTime = 0;
        this.setSensitivity(sensitivity);
    }

    setSensitivity(value: number) {
        this.sensitivity = value;
        this.threshold = 0.2 - (value * 0.01);
    }

    detectBeat(audioData: Uint8Array): boolean {
        let energy = 0;
        const bassRange = Math.min(100, audioData.length / 4);
        for (let i = 0; i < bassRange; i++) {
            energy += audioData[i] / 255;
        }
        energy /= bassRange;

        const avgEnergy = this.energyHistory.reduce((sum, val) => sum + val, 0) / this.energyHistory.length;
        this.energyHistory.push(energy);
        this.energyHistory.shift();

        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeatTime;

        if (energy > avgEnergy + this.threshold && timeSinceLastBeat > 250) {
            this.lastBeatTime = now;
            if (this.beatHistory.length > 0) {
                this.beatHistory.push(timeSinceLastBeat);
                if (this.beatHistory.length > 8) this.beatHistory.shift();
            } else {
                this.beatHistory.push(0);
            }
            return true;
        }
        return false;
    }

    calculateBPM(): { bpm: number; confidence: number } {
        if (this.beatHistory.length < 4) return { bpm: 0, confidence: 0 };

        const validIntervals = this.beatHistory.filter(interval => interval > 0);
        if (validIntervals.length < 3) return { bpm: 0, confidence: 0 };

        const avgInterval = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
        let bpm = 60000 / avgInterval;

        if (bpm < 40) bpm *= 2;
        if (bpm > 240) bpm /= 2;
        
        const variance = validIntervals.reduce((sum, val) => sum + Math.abs(val - avgInterval), 0) / validIntervals.length;
        const normalizedVariance = variance / avgInterval;
        const confidence = Math.max(0, Math.min(100, 100 * (1 - normalizedVariance)));
        
        return {
            bpm: (bpm >= 40 && bpm <= 240) ? Math.round(bpm) : 0,
            confidence: confidence
        };
    }
    
    reset() {
      this.energyHistory = new Array(30).fill(0);
      this.beatHistory = [];
      this.lastBeatTime = 0;
    }
}


const DelayCalculator: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('calculator');
    const [bpm, setBpm] = useState(120);
    const [delayMs, setDelayMs] = useState(500);
    const [feedback, setFeedback] = useState(50);
    const [noteDivision, setNoteDivision] = useState<NoteDivision>('quarter');

    // Tapper state
    const [taps, setTaps] = useState<number[]>([]);
    const [tappedBpm, setTappedBpm] = useState<number | null>(null);

    // Analyzer state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzerBpm, setAnalyzerBpm] = useState<number | null>(null);
    const [confidence, setConfidence] = useState(0);
    const [micError, setMicError] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const beatDetectorRef = useRef<BeatDetector | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const calculateDelay = useCallback((currentBpm: number, division: NoteDivision): number => {
        if (currentBpm < 40 || currentBpm > 240) return 500;
        const quarterNoteTime = 60000 / currentBpm;
        const delay = Math.round(quarterNoteTime * noteDivisionFactors[division]);
        return Math.min(Math.max(delay, 20), 1500);
    }, []);
    
    useEffect(() => {
        const newDelay = calculateDelay(bpm, noteDivision);
        setDelayMs(newDelay);
    }, [bpm, noteDivision, calculateDelay]);

    const handleBpmChange = (newBpm: number) => {
        const clampedBpm = Math.max(40, Math.min(240, newBpm));
        setBpm(clampedBpm);
    };

    const handleTap = () => {
        const now = Date.now();
        const newTaps = [...taps, now].slice(-8); // Keep last 8 taps

        if (newTaps.length > 1 && (now - newTaps[newTaps.length - 2] > 2000)) {
            setTaps([now]); // Reset if pause is too long
            setTappedBpm(null);
            return;
        }
        setTaps(newTaps);

        if (newTaps.length >= 4) {
            const intervals = [];
            for (let i = 1; i < newTaps.length; i++) {
                intervals.push(newTaps[i] - newTaps[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            if (avgInterval > 0) {
                const newBpm = Math.round(60000 / avgInterval);
                if (newBpm >= 40 && newBpm <= 240) {
                    setTappedBpm(newBpm);
                }
            }
        }
    };
    
    const applyTappedBpm = () => {
        if (tappedBpm) {
            handleBpmChange(tappedBpm);
            setActiveTab('calculator');
        }
    };

    const startAnalyzer = useCallback(async () => {
        if (isAnalyzing) return;
        setMicError(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
            streamRef.current = stream;
            
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ac;
            
            analyserRef.current = ac.createAnalyser();
            analyserRef.current.fftSize = 2048;
            
            sourceNodeRef.current = ac.createMediaStreamSource(stream);
            sourceNodeRef.current.connect(analyserRef.current);
            
            beatDetectorRef.current = new BeatDetector();
            setIsAnalyzing(true);
        } catch (err) {
            console.error("Mic error:", err);
            setMicError(true);
        }
    }, [isAnalyzing]);
    
    const stopAnalyzer = useCallback(() => {
        if (!isAnalyzing) return;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        
        sourceNodeRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();

        setIsAnalyzing(false);
        setAnalyzerBpm(null);
        setConfidence(0);
    }, [isAnalyzing]);
    
    const drawSpectrogram = useCallback(() => {
        if (!isAnalyzing || !analyserRef.current || !canvasRef.current) return;
        
        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        if (beatDetectorRef.current?.detectBeat(dataArray)) {
           const result = beatDetectorRef.current.calculateBPM();
           if (result.bpm > 0) {
               setAnalyzerBpm(result.bpm);
               setConfidence(result.confidence);
           }
        }
        
        // --- Drawing logic ---
        const { width, height } = canvas;
        const imageData = ctx.getImageData(1, 0, width - 1, height);
        ctx.putImageData(imageData, 0, 0);
        ctx.clearRect(width - 1, 0, 1, height);
        
        for (let i = 0; i < bufferLength; i++) {
            const y = height - Math.floor((i / bufferLength) * height);
            const value = dataArray[i];
            if (value < 5) continue;
            let r=0,g=0,b=0;
            if (value < 85) { g = Math.floor((value / 85) * 255); b = 255; }
            else if (value < 170) { r = Math.floor(((value - 85) / 85) * 255); g = 255; b = Math.floor(255 - r); }
            else { r = 255; g = Math.floor(255 - ((value - 170) / 85) * 255); }
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(width - 1, y, 1, 1);
        }
        
        animationFrameRef.current = requestAnimationFrame(drawSpectrogram);

    }, [isAnalyzing]);
    
    useEffect(() => {
        if (isAnalyzing) {
            drawSpectrogram();
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isAnalyzing, drawSpectrogram]);

    useEffect(() => stopAnalyzer, [stopAnalyzer]); // Cleanup on unmount

    const applyAnalyzedBpm = () => {
        if (analyzerBpm) {
            handleBpmChange(analyzerBpm);
            setActiveTab('calculator');
        }
    }
    
    const PingPongVisualizer = ({ delay, fb }: { delay: number; fb: number }) => {
        const [position, setPosition] = useState('10%');
        
        useEffect(() => {
            const interval = setInterval(() => {
                setPosition(prev => prev === '10%' ? '90%' : '10%');
            }, delay);
            return () => clearInterval(interval);
        }, [delay]);
        
        const echoCount = Math.min(3, Math.floor(fb / 25));

        return (
            <div className="relative h-12 bg-gray-900/50 rounded-lg overflow-hidden my-2">
                <div 
                    className="absolute w-3 h-3 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-lg"
                    style={{ left: position, transition: `left ${delay / 1000}s ease-in-out` }}
                />
                {[...Array(echoCount)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-3 h-3 bg-white/70 rounded-full top-1/2 -translate-y-1/2"
                        style={{ 
                            left: position, 
                            opacity: Math.pow(fb / 100, i + 1),
                            transition: `left ${delay / 1000}s ease-in-out ${ (delay / 2000) * (i + 1)}s`
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <Card title="Delay Kalkulátor" icon="fa-solid fa-clock-rotate-left">
            <div className="flex border-b border-gray-700 mb-6">
                {(['calculator', 'tapper', 'analyzer'] as Tab[]).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 px-4 text-center font-semibold capitalize transition-colors ${activeTab === tab ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* --- CALCULATOR TAB --- */}
            <div className={`${activeTab !== 'calculator' && 'hidden'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="bpm" className="block text-sm font-medium text-gray-400 mb-1">BPM (40-240)</label>
                        <input type="number" id="bpm" value={bpm} onChange={e => handleBpmChange(parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Hangjegy</label>
                         <select value={noteDivision} onChange={e => setNoteDivision(e.target.value as NoteDivision)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                             <option value="whole">Egész</option>
                             <option value="half">Fél</option>
                             <option value="quarter">Negyed</option>
                             <option value="eighth">Nyolcad</option>
                             <option value="sixteenth">Tizenhatod</option>
                             <option value="triplet">Triola</option>
                             <option value="dotted-quarter">Pontozott Negyed</option>
                             <option value="dotted-eighth">Pontozott Nyolcad</option>
                         </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-400">Delay Idő:</span>
                        <span className="text-xl font-bold text-teal-300">{delayMs} ms</span>
                    </div>
                    <PingPongVisualizer delay={delayMs} fb={feedback} />
                    <input type="range" min="20" max="1500" value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            {/* --- TAPPER TAB --- */}
            <div className={`${activeTab !== 'tapper' && 'hidden'}`}>
                <div className="flex flex-col items-center gap-4">
                    <button onClick={handleTap} className="w-32 h-32 rounded-full bg-teal-600 text-white font-bold text-xl flex items-center justify-center shadow-lg hover:bg-teal-700 active:scale-95 transition-transform">TAP</button>
                    <div className="text-center">
                        <p className="text-gray-400">Taps: {taps.length}</p>
                        <p className="text-2xl font-bold text-white">{tappedBpm ?? '--'} BPM</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setTaps([]); setTappedBpm(null); }} className="px-4 py-2 bg-gray-600 text-white rounded-md">Reset</button>
                        <button onClick={applyTappedBpm} disabled={!tappedBpm} className="px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-gray-500">Alkalmaz</button>
                    </div>
                </div>
            </div>

            {/* --- ANALYZER TAB --- */}
            <div className={`${activeTab !== 'analyzer' && 'hidden'}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                        <button onClick={startAnalyzer} disabled={isAnalyzing} className="px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-gray-500">Start</button>
                        <button onClick={stopAnalyzer} disabled={!isAnalyzing} className="px-4 py-2 bg-red-600 text-white rounded-md disabled:bg-gray-500">Stop</button>
                    </div>
                    {micError && <p className="text-red-400">Mikrofon hozzáférés szükséges.</p>}
                    <div className="w-full p-2 bg-gray-900/50 rounded-lg">
                        <canvas ref={canvasRef} className="w-full h-40 rounded"></canvas>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white">{analyzerBpm ?? '--'} BPM</p>
                        <p className="text-gray-400">Magabiztosság: {confidence.toFixed(0)}%</p>
                    </div>
                     <button onClick={applyAnalyzedBpm} disabled={!analyzerBpm || confidence < 50} className="w-full px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-gray-500">Alkalmaz</button>
                </div>
            </div>
        </Card>
    );
};

export default DelayCalculator;
