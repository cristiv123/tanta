
import React from 'react';
import CompanionInterface from './components/CompanionInterface';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      <CompanionInterface onStop={() => window.location.reload()} />
    </div>
  );
};

export default App;
