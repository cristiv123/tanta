
import { GoogleGenAI } from "@google/genai";

const MEMORY_KEY = 'prietenul_bun_history_v2';
const PROFILE_KEY = 'prietenul_bun_profile_v2';

export interface MemoryEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

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
      `${entry.role === 'user' ? 'Utilizatorul' : 'Tu'} a spus: "${entry.text}"`
    ).join('\n');
  },

  getHistory(): MemoryEntry[] {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : [];
  },

  getUserProfile(): string {
    return localStorage.getItem(PROFILE_KEY) || "Încă nu ne cunoaștem foarte bine. Știu doar că ești o persoană dragă mie.";
  },

  // Funcție nouă pentru a actualiza profilul permanent
  async updatePermanentProfile(fullConversation: string) {
    if (!fullConversation.trim()) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const currentProfile = this.getUserProfile();
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analizează această conversație și actualizează profilul utilizatorului. 
        Păstrează informațiile vechi importante și adaugă fapte noi (nume, preferințe, familie, stare de spirit).
        
        PROFIL VECHI: ${currentProfile}
        CONVERSAȚIE NOUĂ: ${fullConversation}
        
        Returnează doar noul profil, scurt și la persoana a III-a (ex: "Se numește Ion. Îi place ceaiul de tei. Are un nepot Matei.").`,
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
