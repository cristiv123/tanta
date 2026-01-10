
const MEMORY_KEY = 'prietenul_bun_history_v2';
const PROFILE_KEY = 'prietenul_bun_profile_v2';

export interface MemoryEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const memoryService = {
  // Salvează o nouă replică în istoric
  saveTurn(role: 'user' | 'model', text: string) {
    if (!text.trim()) return;
    const history = this.getHistory();
    const newEntry: MemoryEntry = { role, text, timestamp: Date.now() };
    
    // Păstrăm ultimele 15 replici pentru context imediat
    const updatedHistory = [...history, newEntry].slice(-15);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedHistory));
  },

  // Recuperează istoricul formatat
  getFormattedMemory(): string {
    const history = this.getHistory();
    if (history.length === 0) return "Nu există conversații anterioare.";
    
    return history.map(entry => 
      `${entry.role === 'user' ? 'Utilizatorul' : 'Tu'} a spus: "${entry.text}"`
    ).join('\n');
  },

  getHistory(): MemoryEntry[] {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Gestionare Profil (Fapte esențiale)
  getUserProfile(): string {
    return localStorage.getItem(PROFILE_KEY) || "Nu am reținut încă detalii specifice despre persoana dumneavoastră.";
  },

  setUserProfile(summary: string) {
    localStorage.setItem(PROFILE_KEY, summary);
  },

  clearMemory() {
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }
};
