import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <i className="fa-solid fa-music text-3xl text-teal-400"></i>
          <h1 className="text-2xl font-bold tracking-wider text-white">
            BB <span className="text-teal-400">Tools</span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;