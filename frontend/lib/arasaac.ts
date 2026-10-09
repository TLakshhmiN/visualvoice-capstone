// ARASAAC - Fixed: Clean punctuation, filter stopwords, fallback for compounds

export interface PictogramDetail {
  word: string;
  id?: number;
  image_url?: string;
  image_url_300?: string;
  fallback?: boolean;
}

export const STOPWORDS = new Set([
  "the", "a", "an", "of", "be", "is", "are", "was", "were", 
  "at", "in", "on", "at_the", "of_the", "to", "for", "by", "with", "from"
]);

const ARASAAC_API_BASE = "https://api.arasaac.org/api";
const ARASAAC_STATIC_BASE = "https://static.arasaac.org/pictograms";
const cache = new Map<string, PictogramDetail>();

function cleanWordForSearch(word: string): string {
  // Remove punctuation like "silent." -> "silent", "apple," -> "apple"
  return word.toLowerCase().trim().replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
}

export async function searchPictogram(word: string): Promise<PictogramDetail | null> {
  const originalWord = word.trim();
  const cleanWord = cleanWordForSearch(word);
  
  if (!cleanWord || cleanWord.length < 2) return null;
  if (STOPWORDS.has(cleanWord)) {
    return { word: originalWord, id: undefined, image_url: undefined, fallback: true };
  }
  if (cache.has(cleanWord)) return cache.get(cleanWord)!;

  // Try variations for compounds like eat_with_the_hand
  const tries = [
    cleanWord,
    cleanWord.replace(/_/g, " "),
    cleanWord.split("_")[0],
    cleanWord.split("_").filter(w => !STOPWORDS.has(w) && w.length > 2)[0] || cleanWord
  ];

  for (const tryWord of tries) {
    const cleanedTry = cleanWordForSearch(tryWord);
    if (!cleanedTry || STOPWORDS.has(cleanedTry) || cleanedTry.length < 2) continue;
    
    try {
      const response = await fetch(`${ARASAAC_API_BASE}/pictograms/en/search/${encodeURIComponent(cleanedTry)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const best = data[0];
          const pictoId = best._id;
          const result: PictogramDetail = {
            word: originalWord,
            id: pictoId,
            image_url: `${ARASAAC_STATIC_BASE}/${pictoId}/${pictoId}_500.png`,
            image_url_300: `${ARASAAC_STATIC_BASE}/${pictoId}/${pictoId}_300.png`,
            fallback: false
          };
          cache.set(cleanWord, result);
          return result;
        }
      }
    } catch (err) {
      continue;
    }
  }

  const fallback: PictogramDetail = {
    word: originalWord,
    id: undefined,
    image_url: undefined,
    fallback: true
  };
  cache.set(cleanWord, fallback);
  return fallback;
}

export async function batch_search_pictograms(words: string[]): Promise<PictogramDetail[]> {
  // Clean words first - remove punctuation like "silent." 
  const cleanedWords = words.map(w => cleanWordForSearch(w)).filter(w => w.length > 1);
  const meaningfulWords = cleanedWords.filter(w => !STOPWORDS.has(w.toLowerCase()));
  const wordsToSearch = meaningfulWords.length > 0 ? meaningfulWords : cleanedWords;
  
  // Remove duplicates
  const uniqueWords = Array.from(new Set(wordsToSearch));
  
  const results = await Promise.all(
    uniqueWords.map(word => searchPictogram(word))
  );
  
  return results.filter(r => r !== null && !r.fallback) as PictogramDetail[];
}

export function cleanPictogramsForAAC(pictograms: string[]): { raw: string[], cleaned: string[] } {
  const raw = pictograms.map(p => cleanWordForSearch(p)).filter(p => p.length > 0);
  const cleaned = raw.filter(p => !STOPWORDS.has(p.toLowerCase()));
  return {
    raw,
    cleaned: cleaned.length > 0 ? cleaned : raw
  };
}
