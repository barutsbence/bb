import { useState, useRef, useCallback } from 'react';

/**
 * A custom hook for a simple stopwatch functionality.
 */
export const useStopwatch = () => {
    const [time, setTime] = useState(0); // Time in milliseconds
    const intervalRef = useRef<number | null>(null);
    const startTimeRef = useRef(0);

    const start = useCallback(() => {
        if (intervalRef.current !== null) return; // Already running
        startTimeRef.current = Date.now() - time;
        intervalRef.current = window.setInterval(() => {
            setTime(Date.now() - startTimeRef.current);
        }, 10);
    }, [time]);

    const pause = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setTime(0);
    }, []);

    // Format time as MM:SS.cs
    const formatTime = (milliseconds: number) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        const centiseconds = Math.floor((milliseconds % 1000) / 10).toString().padStart(2, '0');
        return `${minutes}:${seconds}.${centiseconds}`;
    };

    return { time, formattedTime: formatTime(time), start, pause, reset };
};
