
const MEMORY_KEY = 'prietenul_bun_memory_v1';

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
    
    // Păstrăm ultimele 20 de replici pentru a nu supraîncărca contextul
    const updatedHistory = [...history, newEntry].slice(-20);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedHistory));
  },

  // Recuperează istoricul formatat pentru contextul AI
  getFormattedMemory(): string {
    const history = this.getHistory();
    if (history.length === 0) return "Nu există conversații anterioare. Este prima dată când vă întâlniți.";
    
    return history.map(entry => 
      `${entry.role === 'user' ? 'Utilizatorul' : 'Tu'} a spus: "${entry.text}"`
    ).join('\n');
  },

  getHistory(): MemoryEntry[] {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : [];
  },

  clearMemory() {
    localStorage.removeItem(MEMORY_KEY);
  }
};
