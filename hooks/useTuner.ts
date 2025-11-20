import { useState, useRef, useCallback } from 'react';
import { getNoteNames } from '../services/notationService';

const SMOOTHING_BUFFER_SIZE = 5; // Average over the last 5 valid readings

interface TunerState {
    noteName: string;
    octave: number;
    detune: number; // In cents
    frequency: number;
}

const useTuner = (a4: number = 440, useSharpNotation: boolean, useHungarianNotation: boolean) => {
    const [tunerState, setTunerState] = useState<TunerState | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const bufferRef = useRef<Float32Array | null>(null);
    const frequencyHistoryRef = useRef<number[]>([]);

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

    /**
     * Implements a robust pitch detection algorithm using a normalized
     * square difference function (NSDF), which is more accurate than basic autocorrelation.
     * @param buf The audio buffer (time-domain data).
     * @param sampleRate The sample rate of the audio context.
     * @returns The detected frequency in Hz, or -1 if no clear pitch is detected.
     */
    const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
        const SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) {
            const val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) { // A lower threshold for better sensitivity
            return -1;
        }

        // We use a normalized square difference function (NSDF)
        // which is more robust for pitch detection.
        const nsdf = new Float32Array(SIZE);
        let acf = 0;
        let m = 0;
        for (let tau = 0; tau < SIZE; tau++) {
            acf = 0;
            m = 0;
            for (let i = 0; i < SIZE - tau; i++) {
                acf += buf[i] * buf[i + tau];
                m += buf[i] * buf[i] + buf[i + tau] * buf[i + tau];
            }
            nsdf[tau] = (m === 0) ? 1 : (2 * acf) / m;
        }

        // Find the first major peak in the NSDF
        let max_pos = 0;
        // Skip the first few samples to avoid the trivial peak at lag 0
        for (let i = 10; i < nsdf.length - 1; i++) {
            // Check if it's a peak
            if (nsdf[i] > nsdf[i - 1] && nsdf[i] > nsdf[i + 1]) {
                // If we find a strong peak, we take it and break
                if (nsdf[i] > 0.95) { // Confidence threshold
                    max_pos = i;
                    break;
                }
            }
        }

        if (max_pos === 0) return -1;

        // Parabolic interpolation for a more precise peak location.
        if (max_pos > 0 && max_pos < nsdf.length - 1) {
            const y1 = nsdf[max_pos - 1];
            const y2 = nsdf[max_pos];
            const y3 = nsdf[max_pos + 1];
            const a = (y1 + y3 - 2 * y2) / 2;
            const b = (y3 - y1) / 2;
            if (a !== 0) {
                const interpolatedPeak = max_pos - b / (2 * a);
                if (interpolatedPeak > 0) {
                    return sampleRate / interpolatedPeak;
                }
            }
        }
        
        // Fallback to the discrete peak if interpolation is not possible.
        return sampleRate / max_pos;
    };


    const updatePitch = useCallback(() => {
        if (!analyserRef.current || !bufferRef.current || !audioContextRef.current) {
            animationFrameRef.current = requestAnimationFrame(updatePitch);
            return;
        }
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);
        const frequency = autoCorrelate(bufferRef.current, audioContextRef.current.sampleRate);

        if (frequency !== -1) {
            // Add to history for smoothing
            frequencyHistoryRef.current.push(frequency);
            if (frequencyHistoryRef.current.length > SMOOTHING_BUFFER_SIZE) {
                frequencyHistoryRef.current.shift(); // Keep buffer size fixed
            }

            // Calculate smoothed frequency from the history buffer
            const smoothedFrequency = frequencyHistoryRef.current.reduce((a, b) => a + b, 0) / frequencyHistoryRef.current.length;
            
            const note = frequencyToNote(smoothedFrequency);
            const detune = getDetune(smoothedFrequency, note);
            const noteNames = getNoteNames(useSharpNotation, useHungarianNotation);
            setTunerState({
                noteName: noteNames[note % 12],
                octave: Math.floor(note / 12) - 1,
                detune: detune,
                frequency: smoothedFrequency
            });
        } else {
             // If no signal, clear history to avoid using old data
            frequencyHistoryRef.current = [];
            setTunerState(null);
        }
        animationFrameRef.current = requestAnimationFrame(updatePitch);
    }, [frequencyToNote, getDetune, autoCorrelate, useSharpNotation, useHungarianNotation]);

    const start = useCallback(async () => {
        if (isListening) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (ac.state === 'suspended') {
                await ac.resume();
            }
            audioContextRef.current = ac;
            
            analyserRef.current = ac.createAnalyser();
            analyserRef.current.fftSize = 4096; // Increased from 2048 for better frequency resolution
            bufferRef.current = new Float32Array(analyserRef.current.fftSize);

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
        
        frequencyHistoryRef.current = []; // Clear history on stop
        setIsListening(false);
        setTunerState(null);
    }, [isListening]);

    return { tunerState, isListening, error, start, stop };
};

export default useTuner;