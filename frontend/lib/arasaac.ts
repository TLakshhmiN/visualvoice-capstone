// ARASAAC Pictogram Fetcher - Frontend version (no backend needed)
// This is the batch_search_pictograms function you were missing
// Works directly from Vercel frontend -> ARASAAC API

export interface PictogramDetail {
  word: string;
  id?: number;
  image_url?: string;
  image_url_300?: string;
  fallback?: boolean;
  keywords?: string[];
}

// Stopwords to filter for clean AAC display - articles have no meaningful pictograms
export const STOPWORDS = new Set([
  "the", "a", "an", "of", "be", "is", "are", "was", "were", 
  "at", "in", "on", "at_the", "of_the", "to", "for", "by", "with", "from"
]);

const ARASAAC_API_BASE = "https://api.arasaac.org/api";
const ARASAAC_STATIC_BASE = "https://static.arasaac.org/pictograms";

// Cache to avoid repeated API calls
const cache = new Map<string, PictogramDetail>();

export async function searchPictogram(word: string): Promise<PictogramDetail | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;
  
  // Skip stopwords - no pictogram for articles
  if (STOPWORDS.has(cleanWord)) {
    return {
      word: cleanWord,
      id: undefined,
      image_url: undefined,
      fallback: true,
      keywords: []
    };
  }

  // Check cache
  if (cache.has(cleanWord)) {
    return cache.get(cleanWord)!;
  }

  // Try multiple variations for compound tokens like eat_with_the_hand
  const tries = [
    cleanWord,
    cleanWord.replace(/_/g, " "),           // eat_with_the_hand -> eat with the hand
    cleanWord.split("_")[0],                // eat_with_the_hand -> eat
    cleanWord.replace(/_/g, ""),            // fallback
  ];

  for (const tryWord of tries) {
    if (!tryWord || STOPWORDS.has(tryWord)) continue;
    
    try {
      const response = await fetch(`${ARASAAC_API_BASE}/pictograms/en/search/${encodeURIComponent(tryWord)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const best = data[0];
          const pictoId = best._id;
          const result: PictogramDetail = {
            word: cleanWord,
            id: pictoId,
            image_url: `${ARASAAC_STATIC_BASE}/${pictoId}/${pictoId}_500.png`,
            image_url_300: `${ARASAAC_STATIC_BASE}/${pictoId}/${pictoId}_300.png`,
            fallback: false,
            keywords: best.keywords?.slice(0, 3).map((k: any) => k.keyword) || []
          };
          cache.set(cleanWord, result);
          return result;
        }
      }
    } catch (err) {
      console.warn(`ARASAAC search failed for ${tryWord}:`, err);
      continue;
    }
  }

  // Fallback - no image found
  const fallback: PictogramDetail = {
    word: cleanWord,
    id: undefined,
    image_url: undefined,
    fallback: true,
    keywords: []
  };
  cache.set(cleanWord, fallback);
  return fallback;
}

export async function batch_search_pictograms(words: string[]): Promise<PictogramDetail[]> {
  // Filter stopwords for display, but keep them in sequence for raw view
  // For image display, we filter stopwords
  const meaningfulWords = words.filter(w => !STOPWORDS.has(w.toLowerCase()));
  const wordsToSearch = meaningfulWords.length > 0 ? meaningfulWords : words;
  
  const results = await Promise.all(
    wordsToSearch.map(word => searchPictogram(word))
  );
  
  return results.filter(r => r !== null) as PictogramDetail[];
}

// Clean pictograms for AAC display - remove articles
export function cleanPictogramsForAAC(pictograms: string[]): { raw: string[], cleaned: string[] } {
  const raw = pictograms;
  const cleaned = pictograms.filter(p => !STOPWORDS.has(p.toLowerCase()));
  return {
    raw,
    cleaned: cleaned.length > 0 ? cleaned : raw
  };
}
