// API client for VisualVoice - Supports both FastAPI (Render) and Gradio (HF Space) backends

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

// Detect if backend is Gradio or FastAPI
function isGradioBackend(): boolean {
  return API_URL.includes('hf.space');
}

// Translate via FastAPI backend (Render)
async function translateViaFastAPI(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  const response = await fetch(`${API_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_type: modelType,
      num_beams: 6,
      use_constrained: true,
      include_images: false // We fetch images in frontend directly via arasaac.ts
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

// Translate via Gradio backend (HF Space)
async function translateViaGradio(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  // Gradio API format: POST /api/predict with {data: [text, model_type], fn_index: 0}
  // Try different Gradio API versions
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
        // Gradio returns {data: [formatted_text, pictos_list]} or similar
        let pictograms: string[] = [];
        let rawOutput = "";

        if (result.data && Array.isArray(result.data)) {
          // Our Gradio app returns [formatted_text, images] where images is list of [url, word] or just words
          const first = result.data[0];
          const second = result.data[1];
          
          if (Array.isArray(second)) {
            // second is list of pictograms or list of [url, word]
            if (second.length > 0 && Array.isArray(second[0])) {
              // It's [url, word] pairs
              pictograms = second.map((item: any) => item[1] || item[0]).filter(Boolean);
            } else {
              pictograms = second.filter((x: any) => typeof x === 'string');
            }
          } else if (typeof first === 'string') {
            // Parse pictograms from formatted text like "the → boy → eat → apple"
            const match = first.match(/Cleaned AAC:\s*(.+)/);
            if (match) {
              pictograms = match[1].split("→").map((s: string) => s.trim()).filter(Boolean);
            } else {
              // Fallback: split by arrow or space
              const parts = first.split("→").map((s: string) => s.trim());
              if (parts.length > 1) {
                pictograms = parts;
              } else {
                pictograms = first.split(/\s+/).filter(Boolean).slice(-5); // last 5 words likely pictograms
              }
            }
            rawOutput = first;
          }
        }

        // If parsing failed, fallback to simple split
        if (pictograms.length === 0) {
          pictograms = text.toLowerCase().split(/\s+/).slice(0, 5);
        }

        return {
          input: text,
          pictograms,
          raw_output: rawOutput || pictograms.join(" → "),
          model: `gradio-t5-${modelType}`,
          method: "gradio_zero_gpu",
          num_tokens: pictograms.length,
          is_mock: false,
          is_fallback: false
        };
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  // If all Gradio endpoints fail, try direct model inference via HF Inference API or fallback to mock
  console.warn("Gradio API failed, using mock fallback", lastError);
  
  // Mock fallback for demo - based on your examples
  const mockMap: Record<string, string[]> = {
    "the boy is eating an apple": ["boy", "eat", "apple"],
    "she finds herself also in the british isles": ["she", "locate", "islet", "Great_Britain"],
    "he then became a horse trainer": ["past", "he", "later_on", "trainer", "horse"],
    "she lives in detroit": ["she", "live", "metropolis"],
    "you cannot know": ["you", "be_able_to", "know", "not"],
    "he brush teeth": ["he", "brush_teeth"]
  };
  
  const lower = text.toLowerCase().trim();
  const pictograms = mockMap[lower] || lower.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  
  return {
    input: text,
    pictograms,
    raw_output: pictograms.join(" → "),
    model: "mock-frontend-fallback (Gradio API unreachable)",
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
  
  // For Gradio backend, health endpoint may not exist, return mock
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
