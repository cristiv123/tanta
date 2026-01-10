
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../services/audioUtils';
import { memoryService } from '../services/memoryService';

interface CompanionInterfaceProps {
  onStop: () => void;
}

const CompanionInterface: React.FC<CompanionInterfaceProps> = ({ onStop }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking'>('connecting');
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const currentTurnUserText = useRef('');
  const currentTurnAiText = useRef('');

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const setupLive = async () => {
      // CITIREA MEMORIEI CHIAR ÎNAINTE DE CONECTARE
      const pastHistory = memoryService.getFormattedMemory();
      const currentProfile = memoryService.getUserProfile();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: `
              Ești un companion digital cald, răbdător și empatic numit 'Prietenul Bun'.
              
              CONTEXTUL TĂU (Ceea ce știi despre utilizator):
              ${currentProfile}
              
              ISTORICUL RECENT:
              ${pastHistory}
              
              INSTRUCȚIUNI CRITICE:
              1. Vorbește EXCLUSIV în limba română, calm și cald (folosește 'dumneavoastră').
              2. Dacă utilizatorul îți spune detalii despre viața lui (nume, copii, pasiuni, ce a mâncat, cum se simte), REȚINE-LE.
              3. Folosește informațiile din "CONTEXTUL TĂU" pentru a personaliza discuția. Dacă știi cum îl cheamă, spune-i pe nume.
              4. Fii concis. Nu ține prelegeri lungi.
              5. Ești un prieten vechi care a trecut pe la el la o cafea.
            `,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              setStatus('listening');
              const source = audioContextInRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                setTranscription(prev => prev + text);
                currentTurnUserText.current += text;
              }
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setAiResponse(prev => prev + text);
                currentTurnAiText.current += text;
              }
              
              if (message.serverContent?.turnComplete) {
                // SALVARE IMEDIATĂ LA FINALUL TURULUI
                if (currentTurnUserText.current.trim()) {
                  memoryService.saveTurn('user', currentTurnUserText.current);
                }
                if (currentTurnAiText.current.trim()) {
                  memoryService.saveTurn('model', currentTurnAiText.current);
                  // Opțional: Aici s-ar putea adăuga o logică de actualizare a profilului
                  // Pentru simplitate, bazăm memoria pe istoricul recent care este injectat la start
                }
                
                // Actualizăm profilul automat bazat pe tot ce am vorbit până acum (cea mai simplă formă de sumarizare este să cerem AI-ului să facă asta, dar aici ne bazăm pe istoric)
                // Într-o versiune viitoare, am putea folosi un model separat de text pentru a actualiza Profilul.
                
                currentTurnUserText.current = '';
                currentTurnAiText.current = '';
                setTranscription('');
                setAiResponse('');
              }

              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && audioContextOutRef.current) {
                setStatus('speaking');
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextOutRef.current, 24000, 1);
                const source = audioContextOutRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextOutRef.current.destination);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setStatus('listening');
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setStatus('listening');
              }
            },
            onerror: (e) => console.error('Gemini Live Error:', e),
            onclose: () => console.log('Session Closed'),
          }
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error('Initializarea a esuat:', err);
        onStop();
      }
    };

    setupLive();

    return () => {
      // Încercăm o ultimă salvare a textului acumulat înainte de unmount
      if (currentTurnUserText.current.trim()) memoryService.saveTurn('user', currentTurnUserText.current);
      if (currentTurnAiText.current.trim()) memoryService.saveTurn('model', currentTurnAiText.current);

      if (sessionRef.current) sessionRef.current.close();
      if (audioContextInRef.current) audioContextInRef.current.close();
      if (audioContextOutRef.current) audioContextOutRef.current.close();
    };
  }, [onStop]);

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 text-center w-full max-w-2xl px-6">
      <div className="relative">
        <div className={`absolute inset-0 rounded-full bg-indigo-200 blur-xl opacity-50 ${status === 'listening' ? 'pulse-ring' : ''}`}></div>
        <div className={`absolute inset-0 rounded-full bg-indigo-400 blur-2xl opacity-30 ${status === 'speaking' ? 'animate-pulse' : ''}`}></div>
        
        <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${status === 'speaking' ? 'bg-indigo-600 scale-110' : 'bg-indigo-500'}`}>
          <div className="flex flex-col items-center">
            {status === 'connecting' ? (
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            ) : status === 'speaking' ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-8 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-12 bg-white rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-2 h-16 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-12 bg-white rounded-full animate-bounce [animation-delay:0.3s]"></div>
                <div className="w-2 h-8 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8a8 8 0 11-8 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-800">
          {status === 'connecting' ? 'Mă pregătesc...' : status === 'speaking' ? 'Prietenul Bun vorbește' : 'Vă ascult cu drag'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-indigo-500">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider">Memorie Activă</span>
        </div>
      </div>

      <div className="w-full bg-white/50 backdrop-blur-md p-6 rounded-3xl shadow-inner min-h-[120px] flex flex-col justify-center border border-indigo-100">
        <p className="text-lg text-gray-700 italic">
          {transcription || aiResponse || "Spuneți ceva, sunt aici..."}
        </p>
      </div>

      <button
        onClick={onStop}
        className="px-10 py-4 bg-white border-2 border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-600 rounded-full font-semibold transition-all shadow-sm"
      >
        Închide discuția
      </button>
    </div>
  );
};

export default CompanionInterface;
