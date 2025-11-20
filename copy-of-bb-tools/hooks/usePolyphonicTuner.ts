import { useState, useRef, useCallback, useEffect } from 'react';
import { getNoteNames } from '../services/notationService';

export interface DetectedNote {
    noteName: string;
    octave: number;
    detune: number; // In cents
    frequency: number;
    magnitude: number; // dB
}

// FFT size. Must be a power of 2. Larger values give better frequency resolution.
const FFT_SIZE = 8192;

/**
 * A custom hook for polyphonic pitch detection using the Web Audio API.
 * @param a4 The reference frequency for A4 (e.g., 440Hz).
 * @param useSharpNotation If true, returns notes with sharps. If false, uses flats.
 * @param useHungarianNotation If true, uses Hungarian note names (H/B).
 * @returns An object containing the detected notes, listening state, and controls.
 */
const usePolyphonicTuner = (a4: number = 440, useSharpNotation: boolean, useHungarianNotation: boolean) => {
    const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const frequencyDataRef = useRef<Float32Array | null>(null);

    const frequencyToNote = useCallback((frequency: number) => {
        const noteNum = 12 * (Math.log(frequency / a4) / Math.log(2));
        return Math.round(noteNum) + 69;
    }, [a4]);

    const noteToFrequency = useCallback((note: number) => {
        return a4 * Math.pow(2, (note - 69) / 12);
    }, [a4]);

    const getDetune = useCallback((frequency: number, note: number) => {
        return 1200 * Math.log2(frequency / noteToFrequency(note));
    }, [noteToFrequency]);
    
    // Finds peaks in the frequency spectrum.
    const findPeaks = useCallback((data: Float32Array, sampleRate: number): { frequency: number; magnitude: number }[] => {
        const peaks: { frequency: number; magnitude: number }[] = [];
        const minMagnitude = -70; // dB threshold for noise.
        const binWidth = sampleRate / FFT_SIZE;

        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > minMagnitude) {
                // Parabolic interpolation for better frequency accuracy
                const y1 = data[i-1], y2 = data[i], y3 = data[i+1];
                const x = i + (y3 - y1) / (2 * (2 * y2 - y1 - y3));
                const frequency = x * binWidth;
                
                // Only add if it's far enough from the last peak to be a different note
                if (!peaks.length || (frequency / peaks[peaks.length-1].frequency) > 1.03) { // ~half a semitone
                    peaks.push({ frequency, magnitude: data[i] });
                }
            }
        }
        return peaks;
    }, []);

    // Filters out harmonics to identify fundamental frequencies.
    const filterHarmonics = useCallback((peaks: { frequency: number; magnitude: number }[]): { frequency: number; magnitude: number }[] => {
        const fundamentals: { frequency: number; magnitude: number }[] = [];
        const sortedPeaks = [...peaks].sort((a, b) => b.magnitude - a.magnitude);
        
        const harmonicTolerance = 0.03; // 3% tolerance

        const isHarmonic = (freq: number, fundFreq: number) => {
            if (freq < fundFreq) return false;
            const ratio = freq / fundFreq;
            const harmonic = Math.round(ratio);
            if (harmonic < 2) return false;
            return Math.abs(ratio - harmonic) < harmonicTolerance * harmonic;
        };
        
        const processedPitches = new Set<number>();

        for (const peak of sortedPeaks) {
            if (processedPitches.has(peak.frequency)) continue;

            let isFund = true;
            for (const fundamental of fundamentals) {
                if (isHarmonic(peak.frequency, fundamental.frequency)) {
                    isFund = false;
                    break;
                }
            }
            
            if (isFund) {
                fundamentals.push(peak);
                processedPitches.add(peak.frequency);
                 // Mark its own harmonics as processed to avoid them becoming fundamentals
                for (const otherPeak of sortedPeaks) {
                     if (isHarmonic(otherPeak.frequency, peak.frequency)) {
                        processedPitches.add(otherPeak.frequency);
                     }
                }
            }
        }
        return fundamentals;
    }, []);


    const updatePitch = useCallback(() => {
        if (!analyserRef.current || !frequencyDataRef.current || !audioContextRef.current) {
            animationFrameRef.current = requestAnimationFrame(updatePitch);
            return;
        }
        
        analyserRef.current.getFloatFrequencyData(frequencyDataRef.current);
        const allPeaks = findPeaks(frequencyDataRef.current, audioContextRef.current.sampleRate);
        const fundamentalPeaks = filterHarmonics(allPeaks);

        if (fundamentalPeaks.length > 0) {
            const noteNames = getNoteNames(useSharpNotation, useHungarianNotation);
            const notes = fundamentalPeaks.map(peak => {
                const note = frequencyToNote(peak.frequency);
                const detune = getDetune(peak.frequency, note);
                return {
                    noteName: noteNames[note % 12],
                    octave: Math.floor(note / 12) - 1,
                    detune: detune,
                    frequency: peak.frequency,
                    magnitude: peak.magnitude
                };
            }).filter(note => Math.abs(note.detune) <= 50); // Only include notes that are "in tune"
            
            setDetectedNotes(notes.slice(0, 4)); // Limit to max 4 notes

        } else {
            setDetectedNotes([]);
        }
        
        animationFrameRef.current = requestAnimationFrame(updatePitch);
    }, [frequencyToNote, getDetune, useSharpNotation, useHungarianNotation, findPeaks, filterHarmonics]);

    const start = useCallback(async () => {
        if (isListening) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
            streamRef.current = stream;
            
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (ac.state === 'suspended') {
                await ac.resume();
            }
            audioContextRef.current = ac;
            
            analyserRef.current = ac.createAnalyser();
            analyserRef.current.fftSize = FFT_SIZE;
            analyserRef.current.smoothingTimeConstant = 0.6; // some smoothing
            frequencyDataRef.current = new Float32Array(analyserRef.current.frequencyBinCount);

            sourceNodeRef.current = ac.createMediaStreamSource(stream);
            sourceNodeRef.current.connect(analyserRef.current);
            
            setIsListening(true);
            setError(null);
            updatePitch();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Nem sikerült hozzáférni a mikrofonhoz. Engedélyezd a hozzáférést a böngésződben.");
            setIsListening(false);
        }
    }, [isListening, updatePitch]);
    
    const stop = useCallback(() => {
        if (!isListening) return;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        sourceNodeRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close().catch(console.error);

        audioContextRef.current = null;
        sourceNodeRef.current = null;
        streamRef.current = null;
        analyserRef.current = null;
        
        setIsListening(false);
        setDetectedNotes([]);
    }, [isListening]);

    return { detectedNotes, isListening, error, start, stop };
};

export default usePolyphonicTuner;
