
import { GoogleGenAI } from "@google/genai";

const MEMORY_KEY = 'prietenul_bun_history_v2';
const PROFILE_KEY = 'prietenul_bun_profile_v2';

export interface MemoryEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const INITIAL_PROFILE = "Utilizatorul este tanti Marioara, are 90 de ani. Fiul ei se numește Cristi. Nepoata ei se numește Ada și este medic stomatolog. Îi place să povestească despre trecut, despre familie, sănătate și rețete de mâncare tradițională.";

export const memoryService = {
  saveTurn(role: 'user' | 'model', text: string) {
    if (!text.trim()) return;
    const history = this.getHistory();
    const newEntry: MemoryEntry = { role, text, timestamp: Date.now() };
    const updatedHistory = [...history, newEntry].slice(-20);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedHistory));
  },

  getFormattedMemory(): string {
    const history = this.getHistory();
    if (history.length === 0) return "Nu există conversații recente.";
    return history.map(entry => 
      `${entry.role === 'user' ? 'Tanti Marioara' : 'Tu'} a spus: "${entry.text}"`
    ).join('\n');
  },

  getHistory(): MemoryEntry[] {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : [];
  },

  getUserProfile(): string {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) {
      localStorage.setItem(PROFILE_KEY, INITIAL_PROFILE);
      return INITIAL_PROFILE;
    }
    return stored;
  },

  async updatePermanentProfile(fullConversation: string) {
    if (!fullConversation.trim()) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const currentProfile = this.getUserProfile();
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analizează această conversație și actualizează profilul lui tanti Marioara (90 ani). 
        Păstrează detaliile despre Cristi și Ada (nepoata stomatolog).
        
        PROFIL VECHI: ${currentProfile}
        CONVERSAȚIE NOUĂ: ${fullConversation}
        
        Returnează doar noul profil, scurt, la persoana a III-a, păstrând tonul cald.`,
      });

      const newProfile = response.text?.trim();
      if (newProfile) {
        localStorage.setItem(PROFILE_KEY, newProfile);
      }
    } catch (e) {
      console.error("Nu am putut actualiza profilul:", e);
    }
  },

  clearMemory() {
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }
};
