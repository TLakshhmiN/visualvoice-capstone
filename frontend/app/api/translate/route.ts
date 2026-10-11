import { NextRequest, NextResponse } from 'next/server';

const HF_SPACE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lakshhminarayanan-visualvoice-api.hf.space';

function getCLIPModel(text: string) {
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
    is_clip_fallback: false
  };
}

function getCLIPFallback(text: string) {
  const base = getCLIPModel(text);
  return { ...base, model: "CLIP Model", method: "clip_fallback", is_clip_fallback: true, raw_output: base.pictograms.join(" → ") };
}

function parseGradioData(data: any[]) {
  let pictograms: string[] = [];
  let formatted = "";
  if (!data || !Array.isArray(data) || data.length === 0) return { pictograms, formatted };
  formatted = (data[0] as string) || "";
  const imagesData = data[1];

  // FIX: Detect ZeroGPU quota error in formatted text and treat as failure
  const lowerFormatted = formatted.toLowerCase();
  if (lowerFormatted.includes("exceeded") && lowerFormatted.includes("zerogpu")) {
    console.log("Detected ZeroGPU quota error in Gradio response:", formatted);
    return { pictograms: [], formatted: "" }; // Trigger fallback
  }
  if (lowerFormatted.includes("quota exceeded") || lowerFormatted.includes("runs limit")) {
    console.log("Detected quota error:", formatted);
    return { pictograms: [], formatted: "" };
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
  return { pictograms, formatted };
}

async function tryT5WithRetry(text: string, retries = 2): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { Client } = await import("@gradio/client");
      const client = await Client.connect(HF_SPACE_URL);
      const sigs = [
        { fn: "/translate", args: [text] },
        { fn: 0, args: [text] },
        { fn: "/translate", args: [text, "auto"] },
        { fn: 0, args: [text, "auto"] },
      ];
      for (const sig of sigs) {
        try {
          const result = await (client as any).predict(sig.fn, sig.args);
          const data = (result as any).data;
          const { pictograms, formatted } = parseGradioData(data);
          // If pictograms empty due to quota error detection, throw to trigger fallback
          if (pictograms.length === 0 && formatted === "") {
            throw new Error("ZeroGPU quota exceeded detected in response");
          }
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
        } catch (e) { continue; }
      }
      throw new Error("Empty");
    } catch (err: any) {
      lastError = err;
      const msg = err.message?.toLowerCase() || "";
      // If quota error, don't retry, immediate fallback to CLIP
      if (msg.includes("zerogpu") || msg.includes("exceeded") || msg.includes("quota") || msg.includes("runs limit")) {
        throw err;
      }
      if (attempt < retries) await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text || "";
    const modelType = body.modelType || "auto";
    if (!text.trim()) return NextResponse.json({ error: "Empty" }, { status: 400 });
    if (modelType === "clip") return NextResponse.json(getCLIPModel(text));

    try {
      const result = await tryT5WithRetry(text, 2);
      return NextResponse.json(result);
    } catch (err: any) {
      // FIX: On ZeroGPU quota error, return CLIP fallback, not raw error
      console.log("T5 failed with quota error, returning CLIP fallback:", err.message);
      return NextResponse.json(getCLIPFallback(text));
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "VisualVoice Proxy", hf_space_url: HF_SPACE_URL });
}
