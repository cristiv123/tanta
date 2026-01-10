
import React, { useState, useEffect } from 'react';
import CompanionInterface from './components/CompanionInterface';
import { memoryService } from './services/memoryService';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentProfile, setCurrentProfile] = useState('');

  // Reîmprospătăm profilul afișat ori de câte ori revenim la ecranul de start
  useEffect(() => {
    if (!isActive) {
      setCurrentProfile(memoryService.getUserProfile());
    }
  }, [isActive]);

  const startCompanion = () => {
    setIsActive(true);
  };

  const stopCompanion = () => {
    setIsActive(false);
  };

  const resetMemory = () => {
    if (window.confirm("Sigur doriți să ștergeți toate amintirile? Vom începe ca și cum ne-am vedea pentru prima dată.")) {
      memoryService.clearMemory();
      setCurrentProfile(memoryService.getUserProfile());
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {!isActive ? (
        <div className="text-center max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8">
          <div className="w-24 h-24 bg-indigo-500 rounded-full mx-auto flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">Prietenul Bun</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Bună ziua! Sunt gata să stăm de vorbă.
            </p>
          </div>

          {/* Secțiunea de memorie vizuală */}
          <div className="bg-indigo-50 rounded-2xl p-6 text-left border border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-2">Ce am reținut despre dumneavoastră:</h3>
            <p className="text-gray-700 italic leading-snug">
              "{currentProfile}"
            </p>
          </div>

          <button
            onClick={startCompanion}
            className="w-full py-6 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-semibold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <span>Să vorbim</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
          
          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={resetMemory}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors underline underline-offset-4"
            >
              {showResetConfirm ? "Amintiri șterse!" : "Ștergeți tot ce am reținut"}
            </button>
          </div>
        </div>
      ) : (
        <CompanionInterface onStop={stopCompanion} />
      )}
    </div>
  );
};

export default App;
