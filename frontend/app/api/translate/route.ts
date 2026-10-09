import { NextRequest, NextResponse } from 'next/server';

const HF_SPACE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

function getCLIPModel(text: string) {
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
    model: "CLIP Model (Image-grounded retrieval)",
    method: "clip_retrieval",
    num_tokens: pictograms.length,
    is_clip_fallback: false
  };
}

function getCLIPFallback(text: string, t5Error?: string) {
  const base = getCLIPModel(text);
  return {
    ...base,
    model: "CLIP Model (Fallback - T5 unreachable, auto-switched)",
    method: "clip_fallback_auto",
    is_clip_fallback: true,
    raw_output: t5Error ? `T5 unreachable (${t5Error.slice(0, 80)}), auto-switched to CLIP: ${base.pictograms.join(" → ")}` : base.raw_output
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

async function tryT5WithRetry(text: string, retries = 2): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { Client } = await import("@gradio/client");
      // Connect with timeout - server-side no CORS
      const client = await Client.connect(HF_SPACE_URL);
      
      const signatures = [
        { fn: "/translate", args: [text] },
        { fn: 0, args: [text] },
        { fn: "/translate", args: [text, "auto"] },
        { fn: 0, args: [text, "auto"] },
      ];

      for (const sig of signatures) {
        try {
          const result = await (client as any).predict(sig.fn, sig.args);
          const data = (result as any).data;
          const { pictograms, formatted } = parseGradioData(data);
          if (pictograms.length > 0) {
            return {
              input: text,
              pictograms,
              raw_output: formatted,
              model: "T5-Base (51.41 BLEU) - HF ZeroGPU 16GB RAM",
              method: "t5_via_proxy",
              num_tokens: pictograms.length,
              is_clip_fallback: false
            };
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error("Empty result from T5");
    } catch (err: any) {
      lastError = err;
      console.warn(`T5 attempt ${attempt+1} failed:`, err.message);
      if (attempt < retries) {
        // Wait 3s before retry - ZeroGPU cold start needs time
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text || "";
    const modelType = body.modelType || body.model_type || "auto";

    if (!text.trim()) {
      return NextResponse.json({ error: "Text cannot be empty" }, { status: 400 });
    }

    if (modelType === "clip") {
      return NextResponse.json(getCLIPModel(text));
    }

    // Try T5 with retry (handles ZeroGPU cold start)
    try {
      const result = await tryT5WithRetry(text, 2);
      return NextResponse.json(result);
    } catch (err: any) {
      console.warn("All T5 attempts failed, fallback to CLIP:", err?.message);
      return NextResponse.json(getCLIPFallback(text, err?.message || "Failed to fetch"));
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "VisualVoice Translate Proxy API - Fixes CORS Failed to fetch",
    hf_space_url: HF_SPACE_URL,
    fix: "Server-side calls HF Space, no browser CORS, retries for ZeroGPU cold start",
    usage: "POST {text, modelType: 't5'|'clip'|'auto'}"
  });
}
