import { useState, useEffect, useCallback, useRef } from 'react';

// The browser provides this type globally when Web MIDI is supported.
type MidiMessageCallback = (event: MIDIMessageEvent) => void;

/**
 * A custom hook for handling Web MIDI API access and listening to MIDI input devices.
 * @param onMidiMessage A callback function to be executed when a MIDI message is received. Pass null to disable listening.
 */
export const useMidiInput = (onMidiMessage: MidiMessageCallback | null) => {
    const [midiAccessError, setMidiAccessError] = useState<string | null>(null);
    const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([]);
    const midiAccessRef = useRef<MIDIAccess | null>(null);

    const setupMidi = useCallback(async () => {
        if (!onMidiMessage || typeof navigator.requestMIDIAccess !== 'function') {
            if (typeof navigator.requestMIDIAccess !== 'function') {
                setMidiAccessError("Ez a böngésző nem támogatja a Web MIDI API-t.");
            }
            return;
        }

        try {
            const access = await navigator.requestMIDIAccess();
            midiAccessRef.current = access;
            setMidiAccessError(null);

            const updateInputsAndListeners = () => {
                if (!midiAccessRef.current) return;
                
                // Detach listeners from all current inputs first to clean up.
                midiAccessRef.current.inputs.forEach(input => {
                    input.onmidimessage = null;
                });
                
                const allInputs = [...midiAccessRef.current.inputs.values()];

                // Filter out common virtual MIDI drivers to prioritize hardware controllers.
                const filteredInputs = allInputs.filter(input => {
                    const name = input.name?.toLowerCase() || '';
                    const blocklist = ['iac', 'busz', 'bus', 'loopmidi', 'virtual', 'microsoft gs wavetable synth'];
                    return !blocklist.some(keyword => name.includes(keyword));
                });
                
                setMidiInputs(filteredInputs);

                // Attach listener only to the filtered inputs.
                filteredInputs.forEach(input => {
                    input.onmidimessage = onMidiMessage;
                });
            };

            updateInputsAndListeners();
            midiAccessRef.current.onstatechange = updateInputsAndListeners;

        } catch (err) {
            setMidiAccessError("MIDI eszköz nem található, vagy a hozzáférés le van tiltva.");
            console.error("Could not access MIDI devices.", err);
        }
    }, [onMidiMessage]);
    
    // Effect to setup and cleanup MIDI access
    useEffect(() => {
        setupMidi();

        // Cleanup function
        return () => {
            if (midiAccessRef.current) {
                midiAccessRef.current.onstatechange = null;
                midiAccessRef.current.inputs.forEach(input => {
                    if (input) {
                        input.onmidimessage = null;
                    }
                });
                midiAccessRef.current = null;
                setMidiInputs([]);
            }
        };
    }, [setupMidi]);

    return { midiInputs, midiAccessError };
};