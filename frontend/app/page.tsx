"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Brain, Eye, MessageSquare, 
  Mic, Send, Zap, Shield, Cpu, 
  BarChart3, Layers, Globe, 
  Play, ExternalLink,
  CheckCircle2, AlertCircle, Loader2,
  Image as ImageIcon, Settings
} from "lucide-react";
import { translateText, checkHealth, getApiUrl } from "../lib/api";
import { batch_search_pictograms, cleanPictogramsForAAC, PictogramDetail } from "../lib/arasaac";

const API_URL = getApiUrl();

interface TranslationResult {
  input: string;
  pictograms: string[];
  raw_output?: string;
  model: string;
  method: string;
  num_tokens: number;
  is_mock?: boolean;
  is_fallback?: boolean;
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [pictogramDetails, setPictogramDetails] = useState<PictogramDetail[]>([]);
  const [cleanedInfo, setCleanedInfo] = useState<{raw: string[], cleaned: string[]} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState("translator");

  useEffect(() => {
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ status: "offline", model_type: "offline" }));
  }, []);

  const examples = [
    { text: "The boy is eating an apple", label: "Simple SVO ✓", category: "success" },
    { text: "she finds herself also in the british isles", label: "British Isles", category: "success" },
    { text: "he then became a horse trainer", label: "Horse Trainer", category: "success" },
    { text: "She lives in Detroit", label: "OOV: Detroit → metropolis", category: "oov" },
    { text: "you cannot know", label: "Negation handling", category: "complex" },
    { text: "he brush teeth", label: "Compound: brush_teeth", category: "compound" },
    { text: "there is now a bus station", label: "Test set", category: "test" },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setIsTranslating(true);
    setError(null);
    setPictogramDetails([]);
    
    try {
      // Step 1: Translate text to pictogram terms via backend (HF Gradio or Render FastAPI)
      const translation = await translateText(inputText, selectedModel);
      setResult(translation);
      
      // Step 2: Clean for AAC display (remove articles like the, an)
      const cleaned = cleanPictogramsForAAC(translation.pictograms);
      setCleanedInfo(cleaned);
      
      // Step 3: Fetch ARASAAC images directly from frontend (batch_search_pictograms function)
      // This is the function you were missing - now in lib/arasaac.ts
      const details = await batch_search_pictograms(cleaned.cleaned);
      setPictogramDetails(details);
      
    } catch (err: any) {
      setError(err.message || "Failed to translate");
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition not supported. Use Chrome.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      setError(`Voice error: ${event.error}`);
    };
    recognition.start();
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VisualVoice</h1>
              <p className="text-xs text-slate-500 -mt-1">BCSE497J • VIT Chennai • T5-Base 51.41 BLEU</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs">
              <div className={`w-2 h-2 rounded-full ${apiStatus?.status?.includes('healthy') ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-medium">{apiStatus?.model_type || 'checking...'}</span>
              <span className="text-slate-400">• {apiStatus?.vocab_size || 6838} terms</span>
            </div>
            <button onClick={() => window.open(`${API_URL}/docs`, '_blank')} className="p-2 hover:bg-slate-100 rounded-lg">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-violet-600/5 to-fuchsia-600/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" /> ImageCLEF 2026 toPicto • ZeroGPU Free 16GB RAM
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9] mb-4">
                Text to<span className="gradient-text block">Pictograms</span>
                <span className="text-2xl md:text-3xl font-bold text-slate-600 block mt-2">for AAC Communication</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Transformer-based system converting English into ordered <span className="font-semibold text-slate-900">ARASAAC pictogram sequences</span> for autism & aphasia support. 
                <span className="bg-yellow-100 px-1.5 py-0.5 rounded font-medium"> 51.41 BLEU • 70.5 METEOR • 30.14 PictoER</span>
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Training Data", value: "59,278", sub: "sentences" },
                  { label: "Vocabulary", value: "6,838", sub: "terms" },
                  { label: "Compound Tokens", value: "2,041", sub: "injected" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-white/70 border border-slate-200">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs font-medium text-slate-500">{stat.label}</div>
                    <div className="text-[10px] text-slate-400">{stat.sub}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Live Demo with Images
                </button>
                <button onClick={() => setActiveTab('architecture')} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Architecture
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
              <div className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                  <div className="text-xs font-mono text-slate-400">Vercel + HF ZeroGPU</div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border"><div className="text-xs font-medium text-slate-500 mb-1">INPUT</div><div className="font-medium">The boy is eating an apple</div></div>
                  <div className="flex justify-center"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div></div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-600 mb-3">CLEANED AAC • FILTERED ARTICLES • WITH IMAGES</div>
                    <div className="flex gap-3">
                      {[
                        { emoji: "👦", label: "boy" },
                        { emoji: "🍽️", label: "eat" },
                        { emoji: "🍎", label: "apple" },
                      ].map((p, i) => (
                        <motion.div key={p.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex-1 p-3 bg-white rounded-xl border shadow-sm text-center">
                          <div className="text-2xl mb-1">{p.emoji}</div><div className="text-xs font-medium">{p.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> T5-Base + Greedy + VCD</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> ARASAAC Images</span>
                </div>
              </div>
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -top-4 -right-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg">✓ 30.14 PictoER</motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
          {[
            { id: 'translator', label: 'Live Translator with Images', icon: MessageSquare },
            { id: 'architecture', label: 'Architecture', icon: Brain },
            { id: 'results', label: 'Results', icon: BarChart3 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'translator' && (
            <motion.div key="translator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} id="translator" className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" />Input Text</h3>
                    <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="text-xs px-2 py-1 rounded-lg border bg-slate-50">
                      <option value="auto">Auto (T5 51.41 BLEU)</option>
                      <option value="t5">T5-Base</option>
                      <option value="gemini">Gemini Flash (Fallback)</option>
                      <option value="mock">Mock Demo</option>
                    </select>
                  </div>
                  <div className="relative">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type sentence... e.g., 'The boy is eating an apple'" className="w-full h-32 p-4 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-[15px]" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTranslate(); }} />
                    <button onClick={handleVoiceInput} className={`absolute right-3 top-3 p-2 rounded-lg transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200'}`}><Mic className="w-4 h-4" /></button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleTranslate} disabled={!inputText.trim() || isTranslating} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
                      {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{isTranslating ? 'Translating & Fetching Images...' : 'Translate to Pictograms with Images'}
                    </button>
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                    <strong>How images work:</strong> Frontend calls <code className="bg-white px-1 rounded">batch_search_pictograms()</code> in <code className="bg-white px-1 rounded">lib/arasaac.ts</code> - fetches directly from ARASAAC API <code className="bg-white px-1 rounded">api.arasaac.org</code>, filters stopwords like "the", "an", fallback for compounds like eat_with_the_hand → eat
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" />Try examples</h4>
                  <div className="space-y-2">
                    {examples.map((ex, i) => (
                      <button key={i} onClick={() => setInputText(ex.text)} className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition group">
                        <div className="text-[13px] font-medium group-hover:text-blue-700">"{ex.text}"</div>
                        <div className="text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block bg-slate-100 text-slate-600">{ex.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" />Pictogram Sequence with Images {result && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{cleanedInfo?.cleaned.length || result.num_tokens} images</span>}</h3>
                    {result && <span className={`px-2 py-1 rounded-full text-xs font-medium ${result.is_mock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{result.is_mock ? 'Mock' : 'T5 Model'}</span>}
                  </div>

                  <div className="flex-1 p-6">
                    {!result && !error && !isTranslating && (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-dashed flex items-center justify-center mb-4"><Eye className="w-8 h-8 text-slate-400" /></div>
                        <h4 className="font-medium mb-1">No translation yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm">Enter text and translate. Images fetched via <code>batch_search_pictograms()</code> from ARASAAC API directly in frontend.</p>
                      </div>
                    )}

                    {isTranslating && (
                      <div className="h-full flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <div className="font-medium">Translating via {API_URL.includes('hf.space') ? 'HF ZeroGPU T5' : 'Render FastAPI'}...</div>
                        <div className="text-sm text-slate-500 mt-1">Then fetching ARASAAC images via batch_search_pictograms()</div>
                      </div>
                    )}

                    {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}

                    {result && (
                      <div className="space-y-6">
                        {cleanedInfo && (
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-slate-50 border"><div className="text-[10px] font-semibold text-slate-500 uppercase">Raw Model Output</div><div className="font-mono text-sm mt-1">{cleanedInfo.raw.join(' → ')}</div></div>
                            <div className="p-3 rounded-xl bg-green-50 border border-green-200"><div className="text-[10px] font-semibold text-green-700 uppercase">Cleaned AAC (filtered articles)</div><div className="font-mono text-sm mt-1 font-semibold">{cleanedInfo.cleaned.join(' → ')}</div></div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visual Sequence • ARASAAC Images via batch_search_pictograms()</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {pictogramDetails.length > 0 ? pictogramDetails.map((picto, idx) => (
                              <motion.div key={`${picto.word}-${idx}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="pictogram-card bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:border-blue-200">
                                <div className="aspect-square bg-slate-50 rounded-xl mb-2 overflow-hidden flex items-center justify-center">
                                  {picto.image_url ? <img src={picto.image_url} alt={picto.word} className="w-full h-full object-contain p-2" /> : <div className="text-center p-2"><div className="text-2xl">🔤</div><div className="text-[10px]">{picto.word}</div></div>}
                                </div>
                                <div className="text-center"><div className="font-semibold text-sm truncate">{picto.word}</div><div className="text-[10px] text-slate-500 font-mono">#{picto.id || 'N/A'}</div></div>
                                <div className="absolute top-2 left-2 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                              </motion.div>
                            )) : result.pictograms.map((w, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-xl text-center"><div className="font-medium text-sm">{w}</div></div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border"><div className="text-xs font-semibold text-slate-500 uppercase mb-2">Raw Sequence</div><div className="font-mono text-sm bg-white p-3 rounded-lg border">{result.pictograms.join(' → ')}</div></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'architecture' && (
            <motion.div key="architecture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border p-8">
              <h2 className="text-2xl font-bold mb-6">Architecture - T5 + ARASAAC Images</h2>
              <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border">
                <div className="text-sm font-mono">Input → T5 Tokenizer + 2041 compounds → T5-Base (ZeroGPU) → Beam Search + VCD → Pictograms → batch_search_pictograms() in lib/arasaac.ts → ARASAAC API → Images in Vercel UI</div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                <strong>batch_search_pictograms function:</strong> Now in <code>lib/arasaac.ts</code> (frontend) - directly calls <code>https://api.arasaac.org/api/pictograms/en/search/{'{word}'}</code>, filters STOPWORDS like the/an, fallback for compounds eat_with_the_hand → eat, caches results. This fixes your "the" triangle and "an" black oval issue.
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { metric: "BLEU", value: "51.41", base: "29.24" },
                  { metric: "METEOR", value: "70.50", base: "60.30" },
                  { metric: "PictoER", value: "30.14", base: "41.15" },
                ].map(m => (
                  <div key={m.metric} className="bg-white rounded-2xl border p-6"><div className="text-xs text-slate-500 uppercase">{m.metric}</div><div className="text-3xl font-black mt-2">{m.value}</div><div className="text-xs mt-2">Baseline: {m.base}</div></div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t mt-12 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="font-bold flex items-center gap-2"><Eye className="w-5 h-5" />VisualVoice</div>
          <div className="text-sm text-slate-600">BCSE497J • T5-Base 51.41 BLEU • batch_search_pictograms in lib/arasaac.ts • ARASAAC Images • Vercel + HF ZeroGPU</div>
        </div>
      </footer>
    </div>
  );
}
