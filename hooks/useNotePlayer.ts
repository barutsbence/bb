import { useRef, useCallback, useState } from 'react';

/**
 * A custom hook for playing musical notes using the Web Audio API.
 * Encapsulates AudioContext creation and provides simple functions to play single notes or sequences.
 */

export interface PlayNoteOptions {
    frequency: number;
    duration?: number;
    instrument?: 'sine' | 'piano' | 'guitar' | 'handpan';
    volume?: number;
}

export const useNotePlayer = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    /**
     * Ensures the AudioContext is initialized and resumed.
     */
    const initAudioContext = useCallback(() => {
        if (typeof window === 'undefined') return null;
        if (!audioContextRef.current) {
            try {
                const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = ac;
                const masterGain = ac.createGain();
                masterGain.connect(ac.destination);
                masterGainRef.current = masterGain;

                if (isMuted) {
                    masterGainRef.current.gain.setValueAtTime(0, ac.currentTime);
                }

            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                return null;
            }
        }
        
        const ac = audioContextRef.current;
        if (ac.state === 'suspended') {
            ac.resume();
        }
        return ac;
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        const ac = initAudioContext();
        if (!ac || !masterGainRef.current) return;

        setIsMuted(prev => {
            const newMutedState = !prev;
            if (newMutedState) {
                masterGainRef.current!.gain.setValueAtTime(0, ac.currentTime);
            } else {
                masterGainRef.current!.gain.setValueAtTime(1, ac.currentTime);
            }
            return newMutedState;
        });
    }, [initAudioContext]);

    /**
     * Plays a single note with a given frequency, duration, and instrument timbre.
     */
    const playNote = useCallback((options: PlayNoteOptions) => {
        const { frequency, duration = 1.5, instrument = 'sine', volume = 0.5 } = options;
        const ac = initAudioContext();
        if (!ac || !masterGainRef.current) return;

        const now = ac.currentTime;
        const mainGain = ac.createGain();
        mainGain.connect(masterGainRef.current);
        const stopTime = now + duration + 1; // Add a tail to allow for decay
        const nyquist = ac.sampleRate / 2;

        switch (instrument) {
            case 'handpan':
                // A more realistic handpan sound with a long decay and clear overtones (octave and fifth).
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(volume * 1.5, now + 0.01); // Sharp attack
                mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 7.0); // Long decay

                // Fundamental
                const osc1 = ac.createOscillator(); 
                osc1.type = 'sine'; 
                osc1.frequency.setValueAtTime(Math.min(frequency, nyquist), now);
                
                // Octave overtone
                const osc2 = ac.createOscillator(); 
                osc2.type = 'sine'; 
                osc2.frequency.setValueAtTime(Math.min(frequency * 2, nyquist), now);

                // Octave + Fifth overtone
                const osc3 = ac.createOscillator(); 
                osc3.type = 'sine'; 
                osc3.frequency.setValueAtTime(Math.min(frequency * 3, nyquist), now);

                const gain1 = ac.createGain(); gain1.gain.setValueAtTime(0.7, now); // Fundamental is loudest
                const gain2 = ac.createGain(); gain2.gain.setValueAtTime(0.2, now); // Octave
                const gain3 = ac.createGain(); gain3.gain.setValueAtTime(0.1, now); // Fifth

                osc1.connect(gain1).connect(mainGain);
                osc2.connect(gain2).connect(mainGain);
                osc3.connect(gain3).connect(mainGain);
                
                const handpanStopTime = now + 7.5;
                osc1.start(now); osc2.start(now); osc3.start(now);
                osc1.stop(handpanStopTime); osc2.stop(handpanStopTime); osc3.stop(handpanStopTime);
                break;

            case 'piano':
                // More realistic piano sound using additive synthesis, a filter, and a detailed envelope.
                const filterNode = ac.createBiquadFilter();
                filterNode.type = 'lowpass';
                filterNode.Q.value = 1; // Gentle rolloff
                filterNode.connect(mainGain);

                // --- Filter Envelope ---
                // Start with a high cutoff to allow the bright "hammer strike", then decay.
                const initialCutoff = Math.max(1000, Math.min(20000, frequency * 6));
                filterNode.frequency.setValueAtTime(initialCutoff, now);
                filterNode.frequency.setTargetAtTime(frequency * 1.5, now + 0.01, 0.2); // Quick decay of high harmonics
                filterNode.frequency.setTargetAtTime(frequency * 0.8, now + 0.5, 1.5); // Slower mellowing

                // --- Volume Envelope ---
                // A very sharp attack, a quick initial decay, then a long sustain.
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(volume, now + 0.005); // Very fast attack
                mainGain.gain.setTargetAtTime(volume * 0.5, now + 0.01, 0.1); // Quick "hammer" decay
                mainGain.gain.setTargetAtTime(0.0001, now + 0.2, duration * 0.9); // Long sustain decay

                // --- Additive Synthesis with Harmonics & Inharmonicity ---
                // Profile of piano harmonics with slight inharmonicity for realism.
                const harmonics = [
                    { mult: 1, gain: 0.80 }, // Fundamental
                    { mult: 2, gain: 0.45 },
                    { mult: 3, gain: 0.30 },
                    { mult: 4, gain: 0.25 },
                    { mult: 5, gain: 0.12 },
                    { mult: 6, gain: 0.10 },
                    { mult: 8, gain: 0.08 },
                    { mult: 10, gain: 0.05 },
                ];
                
                // Inharmonicity makes the sound more metallic and piano-like.
                const inharmonicityFactor = 0.0004;
                
                harmonics.forEach(h => {
                    const osc = ac.createOscillator();
                    osc.type = 'sine';
                    // Apply inharmonicity: f_n = n * f * sqrt(1 + B*n^2). Simplified to: n * f * (1 + B * n)
                    const detunedFreq = frequency * h.mult * (1 + inharmonicityFactor * h.mult);
                    
                    // BUG FIX: Cap the frequency at the Nyquist frequency to prevent errors.
                    osc.frequency.setValueAtTime(Math.min(detunedFreq, nyquist), now);
                    
                    const g = ac.createGain();
                    // Each harmonic can have a slightly different decay envelope, but for simplicity, we'll use gains.
                    g.gain.setValueAtTime(h.gain, now);
                    
                    osc.connect(g).connect(filterNode); // Connect to the filter, not directly to mainGain
                    osc.start(now);
                    osc.stop(stopTime);
                });
                break;
            
            case 'guitar':
                // Plucked string sound
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(volume, now + 0.02); // Quick attack
                mainGain.gain.exponentialRampToValueAtTime(volume * 0.1, now + 0.8);
                mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                // A mix of triangle and sine for a richer tone
                const g_osc1 = ac.createOscillator(); g_osc1.type = 'triangle'; g_osc1.frequency.setValueAtTime(Math.min(frequency, nyquist), now);
                const g_osc2 = ac.createOscillator(); g_osc2.type = 'sine'; g_osc2.frequency.setValueAtTime(Math.min(frequency * 2, nyquist), now);

                const g_gain1 = ac.createGain(); g_gain1.gain.setValueAtTime(0.7, now);
                const g_gain2 = ac.createGain(); g_gain2.gain.setValueAtTime(0.3, now);

                g_osc1.connect(g_gain1).connect(mainGain);
                g_osc2.connect(g_gain2).connect(mainGain);

                g_osc1.start(now); g_osc2.start(now);
                g_osc1.stop(stopTime); g_osc2.stop(stopTime);
                break;

            case 'sine':
            default:
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(volume, now + 0.01);
                mainGain.gain.exponentialRampToValueAtTime(0.0001, now + (duration * 0.8));

                const s_osc = ac.createOscillator();
                s_osc.type = 'sine';
                s_osc.frequency.setValueAtTime(Math.min(frequency, nyquist), now);
                s_osc.connect(mainGain);
                
                s_osc.start(now);
                s_osc.stop(now + duration);
                break;
        }
    }, [initAudioContext]);
    
    /**
     * Plays a sequence of notes, either as an arpeggio or a chord.
     */
    const playNotes = useCallback((
        frequencies: number[], 
        mode: 'arpeggio' | 'chord' = 'arpeggio', 
        noteDuration: number = 300,
        instrument: PlayNoteOptions['instrument'] = 'piano'
    ): Promise<void> => {
        return new Promise(resolve => {
            const ac = initAudioContext();
            if (!ac || frequencies.length === 0) {
                resolve();
                return;
            }

            if (mode === 'chord') {
                frequencies.forEach(freq => playNote({ frequency: freq, duration: (noteDuration / 1000) * 2.5, instrument }));
                setTimeout(resolve, noteDuration * 2.5);
            } else {
                frequencies.forEach((freq, index) => {
                    setTimeout(() => {
                        playNote({ frequency: freq, duration: (noteDuration / 1000) * 1.5, instrument });
                        if (index === frequencies.length - 1) {
                            setTimeout(resolve, noteDuration);
                        }
                    }, index * noteDuration);
                });
            }
        });
    }, [initAudioContext, playNote]);

    const init = useCallback(() => {
        initAudioContext();
    }, [initAudioContext]);

    return { playNote, playNotes, init, isMuted, toggleMute };
};