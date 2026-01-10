
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

  // Buffer pentru acumularea textului înainte de salvare în memorie
  const currentTurnUserText = useRef('');
  const currentTurnAiText = useRef('');

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const pastMemory = memoryService.getFormattedMemory();
    
    const setupLive = async () => {
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
              
              CONTEXT IMPORTANT (Amintirile tale despre acest utilizator):
              ${pastMemory}
              
              INSTRUCȚIUNI:
              1. Vorbește EXCLUSIV în limba română.
              2. Folosește un ton calm, respectos și cald. Folosește 'dumneavoastră'.
              3. Răspunde scurt și clar.
              4. Folosește amintirile de mai sus pentru a personaliza discuția (ex: întreabă despre lucruri menționate anterior).
              5. Ești un ascultător activ.
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
                // Salvăm în memorie la finalul fiecărui tur de conversație
                if (currentTurnUserText.current) memoryService.saveTurn('user', currentTurnUserText.current);
                if (currentTurnAiText.current) memoryService.saveTurn('model', currentTurnAiText.current);
                
                // Resetăm bufferele locale
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
                // Chiar dacă e întrerupt, ce s-a zis până acum rămâne în bufferele de transcriere
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold uppercase tracking-wider">Memorie Activă</span>
        </div>
      </div>

      <div className="w-full bg-white/50 backdrop-blur-md p-6 rounded-3xl shadow-inner min-h-[120px] flex flex-col justify-center border border-indigo-100">
        <p className="text-lg text-gray-700 italic">
          {transcription || aiResponse || "Spuneți ceva..."}
        </p>
      </div>

      <button
        onClick={onStop}
        className="px-10 py-4 bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-600 rounded-full font-semibold transition-all"
      >
        Închide discuția
      </button>
    </div>
  );
};

export default CompanionInterface;
