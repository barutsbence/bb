import React, { useState } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ChordGenerator from './components/ChordGenerator';
import IdeaGenerator from './components/IdeaGenerator';
import MusicQuiz from './components/MusicQuiz';
import Metronome from './components/Metronome';
import TheoryGuide from './components/TheoryGuide';
import FretboardVisualizer from './components/FretboardVisualizer';
import Handpan from './components/Handpan';
import BackingTracks from './components/BackingTracks';
import GuitarTuner from './components/GuitarTuner';
import MidiToSheet from './components/MidiToSheet';


import { Tab } from './types';

const getInitialTab = (): Tab => {
  // Tailwind's `md` breakpoint is 768px
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return Tab.Metronome;
  }
  // Use Tuner as a sensible default for larger screens.
  return Tab.Tuner;
}


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Chords:
        return <ChordGenerator />;
      case Tab.Ideas:
        return <IdeaGenerator />;
      case Tab.Quiz:
        return <MusicQuiz />;
      case Tab.Metronome:
        return <Metronome />;
      case Tab.Tuner:
        return <GuitarTuner />;
      case Tab.Theory:
        return <TheoryGuide />;
      case Tab.Fretboard:
        return <FretboardVisualizer />;
      case Tab.Handpan:
        return <Handpan />;
      case Tab.BackingTracks:
        return <BackingTracks />;
      case Tab.MidiToSheet:
        return <MidiToSheet />;
      
      default:
        // Default to a sensible option if the state is ever invalid
        return <Metronome />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 font-sans text-gray-200">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="mt-8">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center p-4 text-xs text-gray-500">
        <p>Baruts Bence 2025</p>
      </footer>
    </div>
  );
};

export default App;
