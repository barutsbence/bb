import {
    NOTE_NAMES_SHARP_HU, NOTE_NAMES_FLAT_HU,
    NOTE_NAMES_SHARP_INTL, NOTE_NAMES_FLAT_INTL
} from '../constants';

/**
 * Returns the correct array of 12 note names based on user preferences for accidentals and regional standards.
 * @param useSharp - If true, returns notes with sharps (e.g., C#). If false, uses flats (e.g., Db).
 * @param useHungarian - If true, returns Hungarian note names (e.g., H for B natural, B for Bb). If false, uses International names.
 * @returns An array of 12 note name strings.
 */
export const getNoteNames = (useSharp: boolean, useHungarian: boolean): string[] => {
    if (useHungarian) {
        return useSharp ? NOTE_NAMES_SHARP_HU : NOTE_NAMES_FLAT_HU;
    } else {
        return useSharp ? NOTE_NAMES_SHARP_INTL : NOTE_NAMES_FLAT_INTL;
    }
};
