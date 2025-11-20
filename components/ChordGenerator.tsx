import React, { useState } from 'react';
import { MUSIC_SCALES, MUSIC_MOODS } from '../constants';
import { generateChordProgression } from '../services/geminiService';
import { getNoteNames } from '../services/notationService';
import type { Chord } from '../types';
import Spinner from './Spinner';
import Card from './Card';

const ChordGenerator: React.FC = () => {
  const [selectedMidi, setSelectedMidi] = useState(0); // Store root note as MIDI value (0 for C)
  const [useSharpNotation, setUseSharpNotation] = useState(true);
  const [useHungarianNotation, setUseHungarianNotation] = useState(true);
  const [scale, setScale] = useState(MUSIC_SCALES[0]);
  const [mood, setMood] = useState(MUSIC_MOODS[0]);
  const [progression, setProgression] = useState<Chord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const musicKeys = getNoteNames(useSharpNotation, useHungarianNotation);
  const key = musicKeys[selectedMidi];

  const handleKeyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newKeyName = event.target.value;
    const newMidi = musicKeys.indexOf(newKeyName);
    if (newMidi !== -1) {
      setSelectedMidi(newMidi);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setProgression([]);
    try {
      const result = await generateChordProgression(key, scale, mood);
      setProgression(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const SelectInput = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[] }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500 transition"
        key={options.join('-')}
      >
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );


  return (
    <Card title="Akkordmenet Generátor" icon="fa-solid fa-guitar">
      <div className="flex justify-end items-center gap-2 mb-4">
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
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 border-t border-slate-700/50 pt-6">
        <SelectInput label="Hangnem" value={key} onChange={handleKeyChange} options={musicKeys} />
        <SelectInput label="Skála" value={scale} onChange={e => setScale(e.target.value)} options={MUSIC_SCALES} />
        <SelectInput label="Hangulat" value={mood} onChange={e => setMood(e.target.value)} options={MUSIC_MOODS} />
      </div>
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 duration-300"
      >
        {isLoading ? 'Generálás...' : 'Generálás'}
      </button>

      {isLoading && <div className="mt-8"><Spinner /></div>}
      
      {error && <p className="mt-6 text-center text-red-400">{error}</p>}

      {progression.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-center">Generált Akkordmenet:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {progression.map((chord, index) => (
              <div key={index} className="bg-gray-700/50 p-4 rounded-lg text-center flex flex-col justify-center items-center shadow-md border border-gray-600">
                <p className="text-3xl font-bold text-teal-300">{chord.name}</p>
                <p className="text-sm text-gray-400">{chord.voicing}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ChordGenerator;