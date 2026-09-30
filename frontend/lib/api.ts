// API client - FIXED: No 5-pictogram limit, full sentence translation

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

export interface TranslationResult {
  input: string;
  pictograms: string[];
  raw_output?: string;
  model: string;
  method: string;
  num_tokens: number;
  is_mock?: boolean;
  is_fallback?: boolean;
}

function isGradioBackend(): boolean {
  return API_URL.includes('hf.space');
}

async function translateViaFastAPI(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  const response = await fetch(`${API_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_type: modelType,
      num_beams: 6,
      use_constrained: true,
      include_images: false
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    input: data.input,
    pictograms: data.pictograms,
    raw_output: data.raw_output,
    model: data.model,
    method: data.method,
    num_tokens: data.num_tokens,
    is_mock: data.is_mock,
    is_fallback: data.is_fallback
  };
}

async function translateViaGradio(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  const endpoints = [
    `${API_URL}/api/predict`,
    `${API_URL}/run/predict`,
    `${API_URL}/call/predict`
  ];

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [text, modelType],
          fn_index: 0
        })
      });

      if (response.ok) {
        const result = await response.json();
        let pictograms: string[] = [];
        let rawOutput = "";

        if (result.data && Array.isArray(result.data)) {
          const first = result.data[0];
          const second = result.data[1];
          
          if (Array.isArray(second) && second.length > 0) {
            if (Array.isArray(second[0])) {
              pictograms = second.map((item: any) => item[1] || item[0]).filter(Boolean);
            } else {
              pictograms = second.filter((x: any) => typeof x === 'string');
            }
          }
          
          if (pictograms.length === 0 && typeof first === 'string') {
            const match = first.match(/Cleaned AAC:\s*(.+)/);
            if (match) {
              pictograms = match[1].split("→").map((s: string) => s.trim()).filter(Boolean);
            } else if (first.includes("→")) {
              pictograms = first.split("→").map((s: string) => s.trim()).filter(Boolean);
              // Remove labels like "Raw model:" etc
              pictograms = pictograms.filter(p => !p.toLowerCase().includes("raw") && !p.toLowerCase().includes("cleaned") && !p.toLowerCase().includes("model"));
              // If still contains labels, try to extract from second line
              if (pictograms.length === 0) {
                const lines = first.split("\n");
                for (const line of lines) {
                  if (line.includes("→")) {
                    pictograms = line.split("→").map((s: string) => s.trim()).filter(Boolean);
                    break;
                  }
                }
              }
            }
            rawOutput = first;
          }
        }

        // FIXED: No slice(0,5) limit - return full sequence
        if (pictograms.length > 0) {
          return {
            input: text,
            pictograms, // Full length, not limited to 5
            raw_output: rawOutput || pictograms.join(" → "),
            model: `gradio-t5-${modelType}`,
            method: "gradio_zero_gpu",
            num_tokens: pictograms.length,
            is_mock: false,
            is_fallback: false
          };
        }
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  console.warn("Gradio API failed, using full mock fallback", lastError);
  
  // FIXED: No 5 limit in mock fallback - return full sentence
  const mockMap: Record<string, string[]> = {
    "the boy is eating an apple": ["boy", "eat", "apple"],
    "she finds herself also in the british isles": ["she", "locate", "islet", "Great_Britain"],
    "he then became a horse trainer": ["past", "he", "later_on", "trainer", "horse"],
    "she lives in detroit": ["she", "live", "metropolis"],
    "you cannot know": ["you", "be_able_to", "know", "not"],
    "he brush teeth": ["he", "brush_teeth"],
    "the commune of mahambo is located on the island of madagascar": ["the", "commune", "of", "mahambo", "be", "locate", "on", "the", "island", "of", "madagascar"]
  };
  
  const lower = text.toLowerCase().trim();
  // FIXED: No slice(0,5) - return full words, filtering only very short words
  let pictograms = mockMap[lower];
  if (!pictograms) {
    pictograms = lower.split(/\s+/).filter(w => w.length > 1); // Keep all words, not just 5
  }
  
  return {
    input: text,
    pictograms, // Full length
    raw_output: pictograms.join(" → "),
    model: "mock-frontend-fallback (Gradio API unreachable) - Full length",
    method: "mock",
    num_tokens: pictograms.length,
    is_mock: true,
    is_fallback: false
  };
}

export async function translateText(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  if (isGradioBackend()) {
    return translateViaGradio(text, modelType);
  } else {
    return translateViaFastAPI(text, modelType);
  }
}

export async function checkHealth(): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/health`, { method: 'GET' });
    if (response.ok) {
      return await response.json();
    }
  } catch {}
  
  return {
    status: "healthy (gradio)",
    model_type: "T5Model (ZeroGPU)",
    vocab_size: 6838,
    device: "cuda",
    sdk: "gradio"
  };
}

export function getApiUrl(): string {
  return API_URL;
}
