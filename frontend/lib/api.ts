// API - Direct HF Gradio T5 via @gradio/client - No mock 5-limit, no Render

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

export interface TranslationResult {
  input: string;
  pictograms: string[];
  raw_output?: string;
  model: string;
  method: string;
  num_tokens: number;
  is_mock?: boolean;
}

export async function translateText(text: string, modelType: string = "auto"): Promise<TranslationResult> {
  // Use @gradio/client - correct way to call Gradio Space from browser, avoids 405 CORS errors
  try {
    const { Client } = await import("@gradio/client");
    const client = await Client.connect(API_URL);
    
    // Our HF Space has translate function with 2 inputs: text and model_type
    // fn_index 0 is the translate function
    const result = await client.predict("/translate", [text, modelType]);
    
    // result.data is [formatted_text, images_array]
    // formatted_text contains "Raw model: ... Cleaned AAC: ..." 
    // images_array is array of [url, word] or array of words
    let pictograms: string[] = [];
    let rawOutput = "";
    
    if (result && (result as any).data) {
      const data = (result as any).data;
      const formatted = data[0] as string;
      const imagesData = data[1];
      
      rawOutput = formatted || "";
      
      // Try to extract cleaned pictograms from formatted text
      if (formatted && formatted.includes("Cleaned AAC:")) {
        const cleanedPart = formatted.split("Cleaned AAC:")[1].split("\n")[0];
        pictograms = cleanedPart.split("→").map((s: string) => s.trim()).filter(Boolean);
      } else if (Array.isArray(imagesData)) {
        if (imagesData.length > 0 && Array.isArray(imagesData[0])) {
          pictograms = imagesData.map((item: any) => item[1] || item[0]).filter(Boolean);
        } else {
          pictograms = imagesData.filter((x: any) => typeof x === 'string');
        }
      }
      
      // If still empty, parse from formatted text arrows
      if (pictograms.length === 0 && formatted && formatted.includes("→")) {
        const lines = formatted.split("\n");
        for (const line of lines) {
          if (line.includes("→") && !line.toLowerCase().includes("raw") && !line.toLowerCase().includes("cleaned") && !line.toLowerCase().includes("model")) {
            pictograms = line.split("→").map((s: string) => s.trim()).filter(Boolean);
            if (pictograms.length > 0) break;
          }
        }
      }
    }
    
    if (pictograms.length > 0) {
      return {
        input: text,
        pictograms, // Full length, no 5 limit
        raw_output: rawOutput,
        model: "t5-base-picto (HF ZeroGPU 16GB RAM)",
        method: "t5_51.41_bleu",
        num_tokens: pictograms.length,
        is_mock: false
      };
    }
    
    throw new Error("Empty result from Gradio");
    
  } catch (err: any) {
    console.error("Gradio client failed:", err);
    
    // Fallback: Try direct fetch to /run/predict with queue handling (Gradio 4+)
    try {
      // Step 1: POST to /call/predict to get event_id
      const callRes = await fetch(`${API_URL}/call/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [text, modelType], fn_index: 0 })
      });
      
      if (callRes.ok) {
        const callData = await callRes.json();
        const eventId = callData.event_id;
        
        if (eventId) {
          // Step 2: GET result via SSE or fetch
          // Try fetching result
          const resultRes = await fetch(`${API_URL}/call/predict/${eventId}`);
          if (resultRes.ok) {
            const textData = await resultRes.text();
            // Parse SSE format: data: [...]
            const lines = textData.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                try {
                  const data = JSON.parse(jsonStr);
                  if (Array.isArray(data) && data.length > 0) {
                    const first = data[0];
                    if (typeof first === 'string' && first.includes("→")) {
                      const pictograms = first.split("Cleaned AAC:")[1]?.split("→").map((s: string) => s.trim()).filter(Boolean) || 
                                         first.split("→").map((s: string) => s.trim()).filter(Boolean);
                      if (pictograms.length > 0) {
                        return {
                          input: text,
                          pictograms,
                          raw_output: first,
                          model: "t5-base-picto (HF ZeroGPU via call API)",
                          method: "t5_51.41_bleu",
                          num_tokens: pictograms.length,
                          is_mock: false
                        };
                      }
                    }
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch (err2) {
      console.error("Gradio call API also failed:", err2);
    }
    
    // Final fallback - should rarely happen if HF Space is awake
    // No 5 limit - return full split
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1);
    throw new Error(`HF Space unreachable. Tried Gradio client and call API. Last error: ${err.message}. Please open ${API_URL} in new tab to wake it (ZeroGPU sleeps after 48h), then try again.`);
  }
}

export async function checkHealth(): Promise<any> {
  try {
    const res = await fetch(`${API_URL}/`, { method: 'GET' });
    if (res.ok) {
      return {
        status: "healthy",
        model_type: "T5-Base 51.41 BLEU (ZeroGPU 16GB RAM)",
        vocab_size: 6838,
        device: "cuda",
        url: API_URL
      };
    }
  } catch {}
  
  return {
    status: "waking (open HF Space to wake)",
    model_type: "T5-Base (ZeroGPU)",
    vocab_size: 6838,
    url: API_URL
  };
}

export function getApiUrl(): string {
  return API_URL;
}
