

import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import Chord type to be used in generateChordProgression
import type { QuizQuestion, Chord } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const quizQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: {
            type: Type.STRING,
            description: "The music theory question."
        },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers."
        },
        correctAnswer: {
            type: Type.STRING,
            description: "The correct answer, which must be one of the strings in the options array."
        }
    },
    required: ["question", "options", "correctAnswer"]
};

export const generateQuizQuestion = async (): Promise<QuizQuestion> => {
    try {
        const prompt = `
        You are a music theory teacher. Create a multiple-choice quiz question about music theory for an intermediate student. The question must be in Hungarian. Ensure the options and the correct answer are also in Hungarian.

        Base your questions on the following music theory database:
        - Basic Concepts: Musical sound (regular vibration) vs. noise. Properties of sound: pitch (frequency), volume (amplitude), timbre (overtones), duration. Octave divisions (Subkontra, Kontra, etc.). Tempered system and enharmony (e.g., F# is the same as Gb).
        - Clefs: Violin (G), Bass (F), Alto (C), Tenor (C) clefs and their reference notes.
        - Alterations: Sharp (kereszt, ♯), Double Sharp (𝄪), Flat (bé, ♭), Double Flat (𝄫), Natural (feloldójel, ♮).
        - Intervals: The distance between two notes (e.g., Major Third, Perfect Fifth).
        - Rhythm & Meter: Time signature (e.g., 4/4), note values (whole, half, quarter), rests, dotted rhythms, syncopation, triplets, duplets, polymeter, polyrhythm.
        - Dynamics & Tempo: pianissimo (pp) to fortissimo (ff), crescendo, diminuendo. Largo, Adagio, Andante, Moderato, Allegro, Presto, ritardando, accelerando.
        - Chords: Triads (Major, Minor, Diminished, Augmented). Seventh chords (Dominant 7, Major 7, Minor 7, Half-diminished, Diminished). Diatonic chords in a major scale (I-ii-iii-IV-V-vi-vii°).
        - Key Signatures & Circle of Fifths: Relationship between keys. Sharp keys (G, D, A...) and flat keys (F, Bb, Eb...).
        - Scales: Major and Minor (Natural, Harmonic, Melodic). Modal scales (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian).
        - Musical Functions & Forms: Tonic (T), Subdominant (S), Dominant (D). Motive, Sequence, Canon. Performance markings (Rubato, Da Capo, Dal Segno).

        Important Hungarian terminology clarifications:
        1. 'párhuzamos moll' refers to the relative minor (e.g., C major's relative is A minor), NOT the parallel minor.
        2. The name for an augmented triad is 'bővített hármas'. Avoid 'növelt hármas'.
        3. The Hungarian note 'H' is the international 'B'. The Hungarian 'B' is the international 'B♭'.

        Please provide the question, four possible answers (one correct), and indicate the correct answer, ensuring they reflect these concepts and correct Hungarian terminology.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizQuestionSchema,
            },
        });

        const jsonText = response.text.trim();
        const questionData: QuizQuestion = JSON.parse(jsonText);
        
        if (questionData.options.length !== 4) {
            throw new Error("AI did not generate 4 options for the quiz question.");
        }

        return questionData;
    } catch (error) {
        console.error("Error generating quiz question:", error);
        throw new Error("Failed to generate a quiz question from AI.");
    }
};

// FIX: Add schema for chord progression generation
const chordProgressionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "The name of the chord, e.g., 'Cmaj7', 'G7'."
            },
            voicing: {
                type: Type.STRING,
                description: "A simple description of the chord's role or feel, e.g., 'Tonic', 'Dominant', in Hungarian."
            }
        },
        required: ["name", "voicing"]
    }
};

// FIX: Add generateChordProgression function to be used by ChordGenerator component
export const generateChordProgression = async (key: string, scale: string, mood: string): Promise<Chord[]> => {
    try {
        const prompt = `You are a music theory expert. Generate a 4-chord progression in the key of ${key} ${scale} with a ${mood} mood. Provide the chord names and a simple voicing description for each. Both name and description must be in Hungarian.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: chordProgressionSchema,
            },
        });

        const jsonText = response.text.trim();
        const progressionData: Chord[] = JSON.parse(jsonText);

        if (progressionData.length === 0) {
            throw new Error("AI did not generate any chords.");
        }
        
        return progressionData;
    } catch (error) {
        console.error("Error generating chord progression:", error);
        throw new Error("Failed to generate a chord progression from AI.");
    }
};

// FIX: Add generateMusicalIdea function to be used by IdeaGenerator component
export const generateMusicalIdea = async (): Promise<string> => {
    try {
        const prompt = "You are a creative muse for songwriters. Generate a short, inspiring musical or lyrical idea to kickstart a new song. The idea must be in Hungarian. Keep it to a single sentence.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating musical idea:", error);
        throw new Error("Failed to generate a musical idea from AI.");
    }
};