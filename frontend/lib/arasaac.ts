// ARASAAC fetcher - Fixed: keeps duplicates and order, shows fallback text when no image

export interface PictogramDetail {
  word: string;
  id?: number;
  image_url?: string;
  fallback?: boolean;
}

export const STOPWORDS = new Set([
  "the", "a", "an", "of", "be", "is", "are", "was", "were", 
  "at", "in", "on", "at_the", "of_the", "to", "for", "by", "with", "from"
]);

const API_BASE = "https://api.arasaac.org/api";
const STATIC_BASE = "https://static.arasaac.org/pictograms";
const cache = new Map<string, PictogramDetail>();

function cleanWord(word: string): string {
  return word.toLowerCase().trim().replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_");
}

export async function searchPictogram(word: string): Promise<PictogramDetail> {
  const original = word.trim();
  const cleaned = cleanWord(word);
  
  if (!cleaned || cleaned.length < 2) {
    return { word: original, fallback: true };
  }
  if (STOPWORDS.has(cleaned)) {
    return { word: original, fallback: true };
  }
  if (cache.has(cleaned)) {
    const cached = cache.get(cleaned)!;
    return { ...cached, word: original }; // Keep original casing for display
  }

  const tries = [
    cleaned,
    cleaned.replace(/_/g, " "),
    cleaned.split("_")[0],
    cleaned.split("_").find(w => !STOPWORDS.has(w) && w.length > 2) || cleaned
  ];

  for (const t of tries) {
    const ct = cleanWord(t);
    if (!ct || STOPWORDS.has(ct) || ct.length < 2) continue;
    
    try {
      const res = await fetch(`${API_BASE}/pictograms/en/search/${encodeURIComponent(ct)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const id = data[0]._id;
          const result: PictogramDetail = {
            word: original,
            id,
            image_url: `${STATIC_BASE}/${id}/${id}_500.png`,
            fallback: false
          };
          cache.set(cleaned, result);
          return result;
        }
      }
    } catch { continue; }
  }

  const fallback: PictogramDetail = { word: original, fallback: true, image_url: undefined };
  cache.set(cleaned, fallback);
  return fallback;
}

export async function batch_search_pictograms(words: string[]): Promise<PictogramDetail[]> {
  // Keep original order and duplicates - FIX for raw 6 tokens but 4 images issue
  const cleaned = words.map(w => cleanWord(w)).filter(w => w.length > 1);
  const meaningful = cleaned.filter(w => !STOPWORDS.has(w));
  const toSearch = meaningful.length > 0 ? meaningful : cleaned;
  
  // Don't deduplicate - keep order and duplicates for AAC sequence
  // Previously: const unique = Array.from(new Set(toSearch)) caused 6 tokens -> 4 images
  const results: PictogramDetail[] = [];
  for (const w of toSearch) {
    const detail = await searchPictogram(w);
    results.push(detail);
  }
  
  // Return all, including fallback (with no image) so UI shows word even if no ARASAAC image
  // Previously filtered fallback, causing mismatch between raw output and images
  return results;
}

export function cleanPictogramsForAAC(pictograms: string[]): { raw: string[], cleaned: string[] } {
  const raw = pictograms.map(p => cleanWord(p)).filter(p => p.length > 0);
  const cleaned = raw.filter(p => !STOPWORDS.has(p));
  return { raw, cleaned: cleaned.length > 0 ? cleaned : raw };
}
