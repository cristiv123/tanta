
import React, { useState, useEffect, useCallback, useRef } from 'react';
import CompanionInterface from './components/CompanionInterface';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCompanion = () => {
    setIsActive(true);
  };

  const stopCompanion = () => {
    setIsActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {!isActive ? (
        <div className="text-center max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8">
          <div className="w-24 h-24 bg-indigo-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-800">Prietenul Bun</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Bună ziua! Sunt aici să vă ascult și să vorbim. Apăsați butonul de mai jos pentru a începe conversația noastră.
            </p>
          </div>
          <button
            onClick={startCompanion}
            className="w-full py-6 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-semibold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span>Începe discuția</span>
          </button>
          <p className="text-sm text-gray-400">
            Nu este nevoie să apăsați alte butoane după pornire. Pur și simplu vorbiți.
          </p>
        </div>
      ) : (
        <CompanionInterface onStop={stopCompanion} />
      )}
      
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default App;
