
import React, { useState } from 'react';
import CompanionInterface from './components/CompanionInterface';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);

  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 text-center">
        <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="w-32 h-32 bg-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-indigo-900 leading-tight">Prietenul Bun</h1>
            <p className="text-xl text-indigo-700/80 leading-relaxed">
              Sunt aici să vă ascult și să stăm de vorbă oricând simțiți nevoia.
            </p>
          </div>
          <button
            onClick={() => setIsActive(true)}
            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 shadow-xl hover:scale-105 active:scale-95 text-2xl"
          >
            Să vorbim
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      <CompanionInterface onStop={() => setIsActive(false)} />
    </div>
  );
};

export default App;
