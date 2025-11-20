import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SYLLABLE_DATA, SyllableLanguage, SyllablePattern } from '../constants';

export type AccentLevel = 'None' | 'Medium' | 'Loud';

const useMetronome = (initialBpm = 120, initialTimeSignature = 4) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [timeSignature, setTimeSignature] = useState(initialTimeSignature);
  const [subdivision, setSubdivision] = useState(1); // 1: quarter, 2: eighth, etc.
  const [currentBeat, setCurrentBeat] = useState(0); // 0 when stopped, 1-N when playing
  const [currentSubBeat, setCurrentSubBeat] = useState(0); // 0 when stopped, 1-N when playing
  const [accentLevel, setAccentLevel] = useState<AccentLevel>('Medium');
  const [volume, setVolume] = useState(0.8); // Volume from 0.0 to 1.0
  const [accentedBeats, setAccentedBeats] = useState<Set<number>>(new Set([1]));

  // --- New state for Syllable feature ---
  const [showSyllables, setShowSyllables] = useState(false);
  const [syllableLanguage, setSyllableLanguage] = useState<SyllableLanguage>('tala');
  const [syllablePattern, setSyllablePattern] = useState('');


  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0.0);
  const beatNumberRef = useRef(1);
  const subdivisionNumberRef = useRef(1);
  const schedulerTimerRef = useRef<number | null>(null);
  const noteTimeoutRefs = useRef<number[]>([]);

  const previousBpmRef = useRef(bpm);
  const previousTimeSignatureRef = useRef(timeSignature);
  const previousSubdivisionRef = useRef(subdivision);

  // Refs for state values that need to be accessed inside the audio scheduler callback
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const accentLevelRef = useRef(accentLevel);
  useEffect(() => {
    accentLevelRef.current = accentLevel;
  }, [accentLevel]);

  const accentedBeatsRef = useRef(accentedBeats);
  useEffect(() => {
    accentedBeatsRef.current = accentedBeats;
  }, [accentedBeats]);

  const subdivisionRef = useRef(subdivision);
  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  useEffect(() => {
    // When time signature changes, remove any accented beats that are no longer valid.
    setAccentedBeats(prevBeats => {
        const newBeats = new Set(Array.from(prevBeats).filter(beat => beat <= timeSignature));
        // If all previous accents were removed by the change, default to accenting the first beat.
        if (newBeats.size === 0 && prevBeats.size > 0) {
            newBeats.add(1);
        }
        return newBeats;
    });
  }, [timeSignature]);

  const toggleAccentBeat = useCallback((beat: number) => {
    setAccentedBeats(prevBeats => {
        const newBeats = new Set(prevBeats);
        if (newBeats.has(beat)) {
            newBeats.delete(beat);
        } else {
            newBeats.add(beat);
        }
        return newBeats;
    });
  }, []);

  // --- Syllable logic ---
  const availableSyllablePatterns = useMemo(() => {
    return SYLLABLE_DATA[timeSignature]?.[syllableLanguage]?.[subdivision] || [];
  }, [timeSignature, syllableLanguage, subdivision]);
  
  const syllablesAvailableForCurrentTS = useMemo(() => {
    const timeSignatureData = SYLLABLE_DATA[timeSignature];
    if (!timeSignatureData) return false;
    // Check if at least one language has at least one subdivision pattern for this time signature
    return Object.values(timeSignatureData).some(langData => 
        langData && Object.values(langData).some(subData => subData && subData.length > 0)
    );
  }, [timeSignature]);

  useEffect(() => {
    setSyllablePattern(availableSyllablePatterns[0]?.name || '');
  }, [availableSyllablePatterns]);

  const syllablesToDisplay = useMemo(() => {
    if (!showSyllables || !syllablePattern || availableSyllablePatterns.length === 0) return [];
    const pattern = availableSyllablePatterns.find(p => p.name === syllablePattern);
    return pattern ? pattern.syllables : [];
  }, [showSyllables, syllablePattern, availableSyllablePatterns]);


  const scheduleNote = useCallback((beat: number, subBeat: number, time: number) => {
    if (!audioContextRef.current) return;
    
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    
    const isAccentedBeat = accentedBeatsRef.current.has(beat);
    let freq = 2000; // Normal click
    let volMultiplier = 0.8;

    if (subBeat === 1) { // Main beat
        if (isAccentedBeat) {
            switch (accentLevelRef.current) {
                case 'Medium':
                    freq = 3000; // Higher pitch for medium accent
                    volMultiplier = 1.0;
                    break;
                case 'Loud':
                    freq = 4000; // Highest pitch for loud accent
                    volMultiplier = 1.2; // A bit louder
                    break;
                case 'None':
                default:
                    // No change for no accent
                    break;
            }
        }
    } else { // Subdivision click
        freq = 1500;
        volMultiplier = 0.6;
    }
    
    const finalVolume = volMultiplier * volumeRef.current;

    // A sine wave is a clean basis for a click
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    // Very fast attack and decay to create the "click"
    gain.gain.setValueAtTime(finalVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02); // 20ms decay, very sharp

    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.02);
  }, []); // Empty dependency array because we use refs for dynamic values

  const stop = useCallback(() => {
    if (!isPlaying) return;
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentSubBeat(0);
    beatNumberRef.current = 1;
    subdivisionNumberRef.current = 1;

    if (schedulerTimerRef.current) {
      window.clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
     noteTimeoutRefs.current.forEach(clearTimeout);
     noteTimeoutRefs.current = [];
  }, [isPlaying]);

  useEffect(() => {
      const hasChanged = previousBpmRef.current !== bpm || previousTimeSignatureRef.current !== timeSignature || previousSubdivisionRef.current !== subdivision;
      if (hasChanged && isPlaying) {
          stop();
      }
      previousBpmRef.current = bpm;
      previousTimeSignatureRef.current = timeSignature;
      previousSubdivisionRef.current = subdivision;
  }, [bpm, timeSignature, subdivision, isPlaying, stop]);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      const beat = beatNumberRef.current;
      const subBeat = subdivisionNumberRef.current;
      const time = nextNoteTimeRef.current;
      
      scheduleNote(beat, subBeat, time);
      
      // Update visual counters in time with the audio
      const timeUntilNote = (time - audioContextRef.current.currentTime) * 1000;
      const timeoutId = window.setTimeout(() => {
        if (subBeat === 1) {
            setCurrentBeat(beat);
        }
        setCurrentSubBeat(subBeat);
        noteTimeoutRefs.current = noteTimeoutRefs.current.filter(id => id !== timeoutId);
      }, timeUntilNote);
      noteTimeoutRefs.current.push(timeoutId);

      const secondsPerBeat = 60.0 / bpm;
      const secondsPerSubdivision = secondsPerBeat / subdivisionRef.current;
      nextNoteTimeRef.current += secondsPerSubdivision;
      
      // Update beat and sub-beat counters
      if (subdivisionNumberRef.current >= subdivisionRef.current) {
          subdivisionNumberRef.current = 1;
          beatNumberRef.current = (beat % timeSignature) + 1;
      } else {
          subdivisionNumberRef.current++;
      }
    }
    schedulerTimerRef.current = window.setTimeout(scheduler, 25.0);
  }, [bpm, timeSignature, scheduleNote]);

  const start = useCallback(() => {
    if (isPlaying) return;

    const runScheduler = () => {
        if (!audioContextRef.current) return;
        setIsPlaying(true);
        beatNumberRef.current = 1;
        subdivisionNumberRef.current = 1;
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.1;
        scheduler();
    };

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ac = audioContextRef.current;

    if (ac.state === 'suspended') {
      ac.resume().then(runScheduler);
    } else {
      runScheduler();
    }
  }, [isPlaying, scheduler]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { 
    isPlaying, bpm, setBpm, timeSignature, setTimeSignature, subdivision, setSubdivision, currentBeat, currentSubBeat, togglePlay, accentLevel, setAccentLevel, volume, setVolume, accentedBeats, toggleAccentBeat,
    showSyllables, setShowSyllables, syllableLanguage, setSyllableLanguage, syllablePattern, setSyllablePattern, availableSyllablePatterns, syllablesToDisplay, syllablesAvailableForCurrentTS
  };
};

export default useMetronome;