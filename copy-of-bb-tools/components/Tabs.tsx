import React, { useState } from 'react';
import { Tab } from '../types';

interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabIcons: Record<Tab, string> = {
    [Tab.Chords]: 'fa-solid fa-guitar',
    [Tab.Ideas]: 'fa-solid fa-lightbulb',
    [Tab.Quiz]: 'fa-solid fa-question-circle',
    [Tab.Metronome]: 'fa-solid fa-stopwatch',
    [Tab.Tuner]: 'fa-solid fa-sliders',
    [Tab.Theory]: 'fa-solid fa-book-open',
    [Tab.Fretboard]: 'fa-solid fa-table-cells',
    [Tab.Handpan]: 'fa-solid fa-compact-disc',
    [Tab.BackingTracks]: 'fa-brands fa-youtube',
    [Tab.MidiToSheet]: 'fa-solid fa-file-pen',
}

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const [extraTabsVisible, setExtraTabsVisible] = useState(false);

  const mainTabs = [Tab.Metronome, Tab.Tuner, Tab.Quiz, Tab.Theory, Tab.Fretboard, Tab.Handpan, Tab.BackingTracks, Tab.MidiToSheet];
  const extraTabs = [Tab.Chords, Tab.Ideas];

  const renderTabButton = (tab: Tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-semibold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-400
        ${
          activeTab === tab
            ? 'bg-teal-500 text-white shadow-lg'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
      <i className={tabIcons[tab]}></i>
      <span>{tab}</span>
    </button>
  );

  const toggleExtraTabs = () => {
    const isHiding = extraTabsVisible;
    if (isHiding && extraTabs.includes(activeTab)) {
      setActiveTab(mainTabs[0]);
    }
    setExtraTabsVisible(!extraTabsVisible);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 bg-gray-800/60 p-2 rounded-lg overflow-x-auto">
      {mainTabs.map(renderTabButton)}
      
      {extraTabsVisible && extraTabs.map(renderTabButton)}

      <button
        onClick={toggleExtraTabs}
        className={`flex-shrink-0 flex items-center justify-center w-12 h-auto text-xl font-semibold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-400 bg-gray-700 text-gray-300 hover:bg-gray-600`}
        aria-label={extraTabsVisible ? "További eszközök elrejtése" : "További eszközök megjelenítése"}
      >
        <i className={`fa-solid ${extraTabsVisible ? 'fa-minus' : 'fa-plus'}`}></i>
      </button>
    </div>
  );
};

export default Tabs;
