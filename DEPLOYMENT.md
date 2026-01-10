
# Ghid de Deployment pe Vercel

Pentru a publica această aplicație pe Vercel, urmați acești pași:

### 1. Pregătirea Proiectului
Asigurați-vă că toate fișierele sunt în rădăcina folderului (fără un subfolder `src`).
Structura trebuie să fie:
- `index.html`
- `index.tsx`
- `App.tsx`
- `metadata.json`
- `package.json` (Vercel îl va genera automat dacă folosiți un framework, sau puteți adăuga unul de bază).

### 2. Crearea unui Depozit GitHub
1. Creați un nou repository pe GitHub.
2. Încărcați toate fișierele în acest repository.

### 3. Configurarea pe Vercel
1. Mergeți pe [Vercel](https://vercel.com) și logați-vă cu GitHub.
2. Apăsați pe **"Add New"** -> **"Project"**.
3. Importați depozitul nou creat.
4. În secțiunea **Environment Variables** (Variabile de Mediu), adăugați:
   - Key: `API_KEY`
   - Value: [Cheia ta Google Gemini API]
5. Apăsați **Deploy**.

### 4. Permisiuni
Deoarece aplicația folosește microfonul, Vercel o va găzdui pe `https`, ceea ce este obligatoriu pentru accesul la `getUserMedia`.

### 5. Notă pentru Gemini Live API
Aplicația folosește modelul `gemini-2.5-flash-native-audio-preview-12-2025`. Asigurați-vă că cheia dvs. API are acces la acest model (de obicei disponibil în AI Studio).
