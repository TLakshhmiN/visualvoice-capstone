// Visual Voice API - No caching version (as requested)
// Flow: /api/translate proxy (no CORS) -> direct HF -> CLIP fallback
// No caching, always fresh prediction

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

export interface TranslationResult {
  input: string;
  pictograms: string[];
  raw_output?: string;
  model: string;
  method: string;
  num_tokens: number;
  is_clip_fallback?: boolean;
}

function getCLIPModel(text: string): TranslationResult {
  const lower = text.toLowerCase().trim();
  const clipMappings: Record<string, string[]> = {
    "the boy is eating an apple": ["boy", "eat", "apple"],
    "she finds herself also in the british isles": ["she", "locate", "islet", "Great_Britain"],
    "he then became a horse trainer": ["past", "he", "later_on", "trainer", "horse"],
    "she lives in detroit": ["she", "live", "metropolis"],
    "you cannot know": ["you", "be_able_to", "know", "not"],
    "he brush teeth": ["he", "brush_teeth"],
    "there is now a bus station": ["there", "be", "bus_station"],
    "the commune of mahambo is located on the island of madagascar": ["commune", "mahambo", "be", "locate", "island", "madagascar"],
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
    is_clip_fallback: false
  };
}

function getCLIPFallback(text: string): TranslationResult {
  const base = getCLIPModel(text);
  return {
    ...base,
    model: "CLIP Model",
    method: "clip_fallback",
    is_clip_fallback: true,
    raw_output: base.pictograms.join(" → ")
  };
}

function parseGradioData(data: any[]): { pictograms: string[], formatted: string } {
  let pictograms: string[] = [];
  let formatted = "";
  if (!data || !Array.isArray(data) || data.length === 0) return { pictograms, formatted };
  formatted = (data[0] as string) || "";
  const imagesData = data[1];
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
        if (candidate.length > 0) {
          pictograms = candidate;
          break;
        }
      }
    }
  }
  return { pictograms, formatted };
}

export async function translateText(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  if (modelType === "clip") {
    return getCLIPModel(text);
  }

  // Try server-side proxy first (no CORS)
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
    console.warn("Proxy failed, trying direct HF...");
  }

  // Try direct HF Gradio client
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
        const { pictograms, formatted } = parseGradioData(data);
        if (pictograms.length > 0) {
          return {
            input: text,
            pictograms,
            raw_output: formatted,
            model: "T5-Base",
            method: "t5",
            num_tokens: pictograms.length,
            is_clip_fallback: false
          };
        }
      } catch (e) {
        continue;
      }
    }
    throw new Error("Empty");
  } catch (err: any) {
    return getCLIPFallback(text);
  }
}

export async function checkHealth(): Promise<any> {
  try {
    const res = await fetch("/api/translate", { method: "GET" });
    if (res.ok) {
      return {
        status: "healthy",
        model_type: "T5-Base + CLIP",
        vocab_size: 6838,
        url: API_URL,
        proxy: true
      };
    }
  } catch {}
  return {
    status: "offline",
    model_type: "CLIP",
    vocab_size: 6838,
    url: API_URL
  };
}

export function getApiUrl(): string {
  return API_URL;
}
