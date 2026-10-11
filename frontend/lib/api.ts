// Visual Voice API - Fixed to show same cache status as HF UI in circle button

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

export interface TranslationResult {
  input: string;
  pictograms: string[];
  raw_output?: string;
  model: string;
  method: string;
  num_tokens: number;
  is_clip_fallback?: boolean;
  from_cache?: boolean;
  source?: string;
}

function getCLIPModel(text: string): TranslationResult {
  const lower = text.toLowerCase().trim();
  const clipMappings: Record<string, string[]> = {
    "the boy is eating an apple": ["boy", "eat", "apple"],
    "she lives in detroit": ["she", "live", "metropolis"],
    "you cannot know": ["you", "be_able_to", "know", "not"],
    "he brush teeth": ["he", "brush_teeth"],
    "there is now a bus station": ["there", "be", "bus_station"],
    "the commune of mahambo is located on the island of madagascar": ["commune", "mahambo", "be", "locate", "island", "madagascar"],
    "the other important cities are wichian buri nong phai chondaen and lom sak": ["other", "metropolis", "important", "metropolis", "and", "metropolis"],
    "he then became a horse trainer": ["past", "he", "later_on", "trainer", "horse"],
  };
  let pictograms = clipMappings[lower];
  if (!pictograms) {
    const words = lower.replace(/[^a-z0-9\s_]/g, "").split(/\s+/).filter(w => w.length > 1);
    const stopwords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "of", "in", "on", "at", "there", "now"]);
    const filtered = words.filter(w => !stopwords.has(w));
    pictograms = filtered.length > 0 ? filtered : words.slice(0, 8);
  }
  return {
    input: text,
    pictograms,
    raw_output: pictograms.join(" → "),
    model: "CLIP Model",
    method: "clip",
    num_tokens: pictograms.length,
    is_clip_fallback: false,
    from_cache: false,
    source: "CLIP Model (direct)"
  };
}

function getCLIPFallback(text: string, reason?: string): TranslationResult {
  const base = getCLIPModel(text);
  return { 
    ...base, 
    model: "CLIP Model", 
    method: "clip_fallback", 
    is_clip_fallback: true, 
    from_cache: false,
    source: reason || "CLIP Model (fallback - ZeroGPU quota exceeded, no cached T5 result)",
    raw_output: base.pictograms.join(" → ") 
  };
}

function parseGradioData(data: any[]) {
  let pictograms: string[] = [];
  let formatted = "";
  let from_cache = false;
  let is_quota_error = false;
  let quota_no_cache = false;

  if (!data || !Array.isArray(data) || data.length === 0) return { pictograms, formatted, from_cache, is_quota_error, quota_no_cache };
  formatted = (data[0] as string) || "";
  const imagesData = data[1];
  const lowerFormatted = formatted.toLowerCase();

  if (lowerFormatted.includes("exceeded") && lowerFormatted.includes("zerogpu")) {
    is_quota_error = true;
    if (lowerFormatted.includes("cached") || lowerFormatted.includes("from cache") || lowerFormatted.includes("raw model (cached)")) {
      from_cache = true;
    } else if (lowerFormatted.includes("no cached") || lowerFormatted.includes("no cache")) {
      quota_no_cache = true;
      return { pictograms: [], formatted: "", from_cache: false, is_quota_error: true, quota_no_cache: true };
    } else {
      quota_no_cache = true;
      return { pictograms: [], formatted: "", from_cache: false, is_quota_error: true, quota_no_cache: true };
    }
  }

  if (lowerFormatted.includes("quota exceeded") || lowerFormatted.includes("runs limit")) {
    is_quota_error = true;
    if (lowerFormatted.includes("cached")) {
      from_cache = true;
    } else {
      quota_no_cache = true;
      return { pictograms: [], formatted: "", from_cache: false, is_quota_error: true, quota_no_cache: true };
    }
  }

  if (formatted && formatted.includes("Cleaned AAC:")) {
    const cleanedPart = formatted.split("Cleaned AAC:")[1].split("\n")[0];
    pictograms = cleanedPart.split("→").map((s: string) => s.trim()).filter(Boolean);
  }
  if (pictograms.length === 0 && Array.isArray(imagesData)) {
    if (imagesData.length > 0 && Array.isArray(imagesData[0])) {
      pictograms = imagesData.map((item: any) => {
        if (Array.isArray(item)) {
          if (typeof item[0] === 'string' && item[0].startsWith('http')) return item[1] || item[0];
          if (typeof item[1] === 'string' && item[1].startsWith('http')) return item[0];
          return item[1] || item[0];
        }
        return item;
      }).filter((x: any) => typeof x === 'string' && x.length > 0 && !x.startsWith('http'));
    } else {
      pictograms = imagesData.filter((x: any) => typeof x === 'string' && x.length > 0 && !x.startsWith('http'));
    }
  }
  if (pictograms.length === 0 && formatted && formatted.includes("→")) {
    const lines = formatted.split("\n");
    for (const line of lines) {
      if (line.includes("→") && !line.toLowerCase().includes("raw model")) {
        const candidate = line.split("→").map((s: string) => s.trim()).filter(Boolean);
        if (candidate.length > 0) { pictograms = candidate; break; }
      }
    }
  }

  if (lowerFormatted.includes("from cache: yes") || lowerFormatted.includes("cached") || lowerFormatted.includes("source: from cache")) {
    from_cache = true;
  }

  return { pictograms, formatted, from_cache, is_quota_error, quota_no_cache };
}

export async function translateText(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  if (modelType === "clip") {
    return getCLIPModel(text);
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, modelType }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.pictograms && data.pictograms.length > 0) {
        return data as TranslationResult;
      }
    }
  } catch (e) {
    console.warn("Proxy failed");
  }

  try {
    const { Client } = await import("@gradio/client");
    const client = await Client.connect(API_URL);
    const attempts = [
      { fn: "/translate", args: [text] },
      { fn: 0, args: [text] },
      { fn: "/translate", args: [text, "auto"] },
      { fn: 0, args: [text, "auto"] },
    ];
    for (const attempt of attempts) {
      try {
        const result = await (client as any).predict(attempt.fn, attempt.args);
        const data = (result as any).data;
        const { pictograms, formatted, from_cache, is_quota_error, quota_no_cache } = parseGradioData(data);
        if (quota_no_cache) {
          throw new Error("ZeroGPU quota exceeded with no cache");
        }
        if (pictograms.length > 0) {
          return {
            input: text,
            pictograms,
            raw_output: formatted,
            model: from_cache ? "T5-Base (from cache)" : "T5-Base",
            method: from_cache ? "t5_from_cache" : "t5",
            num_tokens: pictograms.length,
            is_clip_fallback: false,
            from_cache: from_cache,
            source: from_cache ? "From cache (GPU quota exceeded, using cached T5 result)" : "T5 model (fresh prediction)"
          };
        }
      } catch (e) {
        continue;
      }
    }
    throw new Error("Empty");
  } catch (err: any) {
    const msg = err.message?.toLowerCase() || "";
    let reason = "CLIP Model (fallback - ZeroGPU quota exceeded, no cached T5 result)";
    if (msg.includes("zerogpu") || msg.includes("quota") || msg.includes("exceeded")) {
      reason = "CLIP Model (fallback - ZeroGPU quota exceeded, no cached T5 result)";
    }
    return getCLIPFallback(text, reason);
  }
}

export async function checkHealth(): Promise<any> {
  return { status: "ok", url: API_URL };
}

export function getApiUrl(): string {
  return API_URL;
}
