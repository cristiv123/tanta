
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
  const [profile, setProfile] = useState('');
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const fullConversationRef = useRef<string>('');
  const currentTurnUserText = useRef('');
  const currentTurnAiText = useRef('');

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const currentProfile = memoryService.getUserProfile();
    setProfile(currentProfile);

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
              Ești 'Prietenul Bun', un companion cald pentru bătrâni. 
              CONVERSAȚIA TREBUIE SĂ FIE ÎN LIMBA ROMÂNĂ.
              
              CONTEXT UTILIZATOR: ${currentProfile}
              ISTORIC: ${memoryService.getFormattedMemory()}

              REGULI:
              1. Imediat ce începe sesiunea, salută utilizatorul cald (ex: "Bună ziua! Mă bucur să ne auzim. Ce mai faceți astăzi?")
              2. Fii empatic, folosește propoziții scurte și clare.
              3. Ascultă cu răbdare.
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
                sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                setTranscription(prev => prev + text);
                currentTurnUserText.current += text;
                fullConversationRef.current += " Utilizator: " + text;
              }
              if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                setAiResponse(prev => prev + text);
                currentTurnAiText.current += text;
                fullConversationRef.current += " AI: " + text;
              }
              if (message.serverContent?.turnComplete) {
                if (currentTurnUserText.current.trim()) memoryService.saveTurn('user', currentTurnUserText.current);
                if (currentTurnAiText.current.trim()) memoryService.saveTurn('model', currentTurnAiText.current);
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
            }
          }
        });
        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error('Setup failed:', err);
        onStop();
      }
    };

    setupLive();

    return () => {
      if (fullConversationRef.current) memoryService.updatePermanentProfile(fullConversationRef.current);
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextInRef.current) audioContextInRef.current.close();
      if (audioContextOutRef.current) audioContextOutRef.current.close();
    };
  }, [onStop]);

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  return (
    <div className="flex flex-col items-center justify-between w-full h-screen max-w-4xl mx-auto p-8 relative">
      <div className="w-full space-y-4">
        <h1 className="text-3xl font-bold text-indigo-900 text-center">Prietenul Bun</h1>
        <div className="bg-white/50 border border-white p-4 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 text-center">Ce am reținut:</p>
          <p className="text-gray-600 italic text-center text-sm leading-tight">"{profile}"</p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          <div className={`absolute inset-0 rounded-full bg-indigo-400 blur-3xl opacity-20 transition-all duration-1000 ${status === 'listening' ? 'scale-150' : 'scale-100'}`}></div>
          <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${status === 'speaking' ? 'bg-indigo-600 scale-105' : 'bg-indigo-500'}`}>
            {status === 'connecting' ? (
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
            ) : status === 'speaking' ? (
              <div className="flex items-center gap-2">
                {[0.1, 0.2, 0.3, 0.4, 0.5].map((delay, i) => (
                  <div key={i} className="w-3 bg-white rounded-full animate-bounce h-12" style={{ animationDelay: `${delay}s` }}></div>
                ))}
              </div>
            ) : (
              <div className="animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            )}
          </div>
        </div>
        <p className="text-2xl font-semibold text-indigo-900">
          {status === 'connecting' ? 'Se conectează...' : status === 'speaking' ? 'Vă vorbesc...' : 'Vă ascult cu drag...'}
        </p>
      </div>

      <div className="w-full bg-white/80 backdrop-blur-md p-10 rounded-[50px] shadow-2xl min-h-[180px] flex flex-col justify-center border-2 border-indigo-100 mb-8">
        <p className="text-3xl text-gray-800 font-medium text-center italic leading-relaxed">
          {transcription || aiResponse || "Sunt aici lângă dumneavoastră..."}
        </p>
      </div>

      <button 
        onClick={onStop}
        className="px-10 py-4 bg-white text-gray-500 hover:text-red-600 border-2 border-gray-100 hover:border-red-100 rounded-full font-bold transition-all shadow-md active:scale-95 mb-4"
      >
        Închideți discuția
      </button>
    </div>
  );
};

export default CompanionInterface;
