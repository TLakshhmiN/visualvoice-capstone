"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { translateText, checkHealth, getApiUrl } from "../lib/api";
import { batch_search_pictograms, cleanPictogramsForAAC, PictogramDetail } from "../lib/arasaac";

const API_URL = getApiUrl();

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pictogramDetails, setPictogramDetails] = useState<PictogramDetail[]>([]);
  const [cleanedInfo, setCleanedInfo] = useState<{raw: string[], cleaned: string[]} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("translator");

  useEffect(() => {
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ status: "offline" }));
  }, []);

  const examples = [
    { text: "The boy is eating an apple", note: "Simple sentence" },
    { text: "She lives in Detroit", note: "OOV handling" },
    { text: "you cannot know", note: "Negation handling" },
    { text: "he brush teeth", note: "Compound token" },
    { text: "there is now a bus station", note: "Test set example" },
    { text: "the commune of mahambo is located on the island of madagascar", note: "Long sentence test" },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setError(null);
    setPictogramDetails([]);
    
    try {
      const translation = await translateText(inputText, "auto");
      setResult(translation);
      
      const cleaned = cleanPictogramsForAAC(translation.pictograms);
      setCleanedInfo(cleaned);
      
      const details = await batch_search_pictograms(cleaned.cleaned);
      setPictogramDetails(details);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] selection:bg-slate-900 selection:text-white">
      {/* Subtle 3D floating shapes - background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ y: [0, -20, 0], rotateX: [0, 5, 0], rotateY: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="float-3d w-64 h-64 rounded-[2rem] top-[10%] left-[5%] opacity-40 hidden lg:block"
          style={{ transform: "rotateX(15deg) rotateY(-15deg)" }}
        />
        <motion.div 
          animate={{ y: [0, 15, 0], rotateX: [0, -3, 0], rotateY: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="float-3d w-48 h-48 rounded-full top-[60%] right-[8%] opacity-30 hidden lg:block"
          style={{ transform: "rotateX(-10deg) rotateY(20deg)" }}
        />
        <motion.div 
          animate={{ y: [0, -10, 0], rotateZ: [0, 2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="float-3d w-32 h-32 rounded-2xl bottom-[20%] left-[15%] opacity-20 hidden lg:block"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Visual Voice</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Text to Pictogram Translation for AAC</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full bg-slate-900 text-white">
              <div className={`w-1.5 h-1.5 rounded-full ${apiStatus?.status?.includes('healthy') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {apiStatus?.model_type || 'T5-Base 51.41 BLEU'}
            </div>
          </div>
        </div>
      </header>

      {/* Hero - Simple purpose para */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-[32px] md:text-[40px] font-semibold leading-[1.1] tracking-tight text-slate-900">
              Converting free-form text into ordered pictogram sequences for assistive communication.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-slate-600 max-w-2xl">
              Visual Voice is an intelligent text-to-pictogram translation system built for Augmentative and Alternative Communication. It uses a fine-tuned T5-Base transformer trained on ImageCLEF 2026 toPicto data to convert English sentences into ARASAAC pictogram identifiers, helping individuals with autism, cerebral palsy and aphasia communicate through visual symbols. The system handles out-of-vocabulary locations, negation and compound concepts through vocabulary-constrained decoding.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            <div className="card-3d rounded-xl bg-white p-4">
              <div className="text-[22px] font-semibold">59,278</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1">Training samples</div>
            </div>
            <div className="card-3d rounded-xl bg-white p-4">
              <div className="text-[22px] font-semibold">51.41</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1">BLEU score</div>
            </div>
            <div className="card-3d rounded-xl bg-white p-4">
              <div className="text-[22px] font-semibold">6,838</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-1">Pictogram terms</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="inline-flex p-1 rounded-full bg-slate-100">
          {[
            { id: 'translator', label: 'Translator' },
            { id: 'results', label: 'Results' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-full text-[13px] font-medium transition ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'translator' && (
            <motion.div key="translator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid lg:grid-cols-[380px_1fr] gap-6">
              
              {/* Left - Input */}
              <div className="space-y-4">
                <div className="card-3d rounded-[16px] bg-white p-5">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4">Input</h3>
                  
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">How to use</div>
                      <ol className="text-[13px] leading-[1.5] text-slate-700 space-y-1.5 list-decimal list-inside">
                        <li>Type an English sentence</li>
                        <li>Click Translate</li>
                        <li>View pictogram sequence with ARASAAC images</li>
                        <li>Cleaned version removes articles for AAC</li>
                      </ol>
                    </div>

                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a sentence to translate to pictograms..."
                      className="w-full h-[110px] rounded-xl border border-slate-200 bg-white p-4 text-[14px] leading-[1.5] placeholder:text-slate-400 focus:border-slate-900 focus:outline-none resize-none"
                    />

                    <button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating}
                      className="w-full h-[44px] rounded-full bg-slate-900 text-white text-[14px] font-medium hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {isTranslating ? "Translating..." : "Translate to pictograms"}
                    </button>

                    {error && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-800">
                        {error}
                        <div className="mt-2 text-[11px]">Tip: Open <a href={API_URL} target="_blank" className="underline">{API_URL}</a> in new tab to wake backend (ZeroGPU sleeps after 48h), then try again.</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-3d rounded-[16px] bg-white p-5">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Try examples</h3>
                  <div className="space-y-2">
                    {examples.map((ex, i) => (
                      <button key={i} onClick={() => setInputText(ex.text)} className="w-full text-left rounded-xl border border-slate-100 p-3 hover:border-slate-200 hover:bg-slate-50 transition">
                        <div className="text-[13px] leading-[1.4] text-slate-800">"{ex.text}"</div>
                        <div className="text-[11px] text-slate-500 mt-1">{ex.note}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[16px] bg-slate-900 p-5 text-white">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Backend</div>
                  <div className="text-[13px] leading-[1.5]">
                    <div className="flex justify-between"><span className="text-slate-400">Model</span><span>T5-Base 51.41 BLEU</span></div>
                    <div className="flex justify-between mt-1"><span className="text-slate-400">Hardware</span><span>ZeroGPU 16GB RAM</span></div>
                    <div className="flex justify-between mt-1"><span className="text-slate-400">API</span><span className="truncate ml-2 text-[11px]">{API_URL.replace('https://','')}</span></div>
                  </div>
                </div>
              </div>

              {/* Right - Output with images */}
              <div className="card-3d rounded-[16px] bg-white p-6 min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">Output</h3>
                  {result && <div className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 text-white">{cleanedInfo?.cleaned.length || result.num_tokens} pictograms</div>}
                </div>

                {!result && !isTranslating && !error && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-dashed flex items-center justify-center mb-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-200" />
                    </div>
                    <div className="text-[14px] font-medium text-slate-900">No translation yet</div>
                    <div className="text-[13px] text-slate-500 mt-1 max-w-sm">Enter text on the left and translate. Images are fetched directly from ARASAAC via batch_search_pictograms function.</div>
                  </div>
                )}

                {isTranslating && (
                  <div className="flex-1 flex flex-col items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
                    <div className="text-[14px]">Translating via T5 model...</div>
                    <div className="text-[12px] text-slate-500 mt-1">Fetching ARASAAC images</div>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {cleanedInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Raw model output</div>
                          <div className="text-[13px] font-mono mt-2 leading-[1.5]">{cleanedInfo.raw.join(' → ')}</div>
                        </div>
                        <div className="rounded-xl bg-slate-900 text-white p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cleaned for AAC</div>
                          <div className="text-[13px] font-mono mt-2 leading-[1.5]">{cleanedInfo.cleaned.join(' → ')}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Pictograms with ARASAAC images</div>
                      <div className="perspective-container">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {pictogramDetails.length > 0 ? pictogramDetails.map((picto, idx) => (
                            <motion.div
                              key={`${picto.word}-${idx}`}
                              initial={{ opacity: 0, y: 12, rotateX: -5 }}
                              animate={{ opacity: 1, y: 0, rotateX: 0 }}
                              transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                              className="pictogram-3d group relative rounded-[12px] p-3"
                            >
                              <div className="aspect-square rounded-lg bg-[#f8fafc] mb-2.5 overflow-hidden flex items-center justify-center">
                                {picto.image_url ? (
                                  <img src={picto.image_url} alt={picto.word} className="w-full h-full object-contain p-2.5 group-hover:scale-[1.03] transition-transform duration-300" />
                                ) : (
                                  <div className="text-[11px] text-slate-500">{picto.word}</div>
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-[13px] font-medium tracking-tight truncate">{picto.word}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">#{picto.id || '—'}</div>
                              </div>
                              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-medium">
                                {idx + 1}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="col-span-full text-[13px] text-slate-500">No images found for filtered terms. Raw terms: {result.pictograms.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 border p-4">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Model info</div>
                      <div className="text-[12px] font-mono mt-1.5 flex gap-4">
                        <span>{result.model}</span>
                        <span className="text-slate-400">{result.method}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="card-3d rounded-[16px] bg-white p-6">
                <h3 className="text-[15px] font-semibold mb-5">Evaluation Results</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { label: "sacreBLEU", value: "51.41", baseline: "29.24", desc: "N-gram overlap" },
                    { label: "METEOR", value: "70.50", baseline: "60.30", desc: "Semantic similarity" },
                    { label: "PictoER", value: "30.14", baseline: "41.15", desc: "Pictogram error rate, lower better" },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-slate-50 border p-4">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">{m.label}</div>
                      <div className="text-[24px] font-semibold mt-1">{m.value}</div>
                      <div className="text-[12px] text-slate-600 mt-1">{m.desc}</div>
                      <div className="text-[11px] text-slate-500 mt-2">Baseline: {m.baseline}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-3d rounded-[16px] bg-white p-6">
                <h3 className="text-[15px] font-semibold mb-4">Qualitative Examples from Review 3</h3>
                <div className="space-y-3">
                  {[
                    { input: "she finds herself also in the british isles", output: "she locate in the islet Great_Britain", status: "Success" },
                    { input: "he then became a horse trainer", output: "past he later_on trainer by horse", status: "Success" },
                    { input: "the other important cities are wichian buri...", output: "the other metropolis important be metropolis and metropolis", status: "Partial - OOV cities" },
                  ].map((ex, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 border p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border font-medium">{ex.status}</span>
                      </div>
                      <div className="text-[13px]">Input: "{ex.input}"</div>
                      <div className="text-[13px] font-mono text-slate-600 mt-1">→ {ex.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer - Made by */}
      <footer className="relative z-10 border-t border-slate-200/60 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="text-[14px] font-semibold">Visual Voice</div>
              <div className="text-[13px] text-slate-600 mt-2 leading-[1.5] max-w-md">
                Built as capstone project to support AAC communication through pictogram translation.
              </div>
            </div>
            <div className="text-[13px] leading-[1.6] text-slate-600">
              <div className="font-medium text-slate-900">Made by</div>
              <div className="mt-1">Lakshhmi Narayanan T - 23BAI1048</div>
              <div>Adithiyaa D - 23BAI1038</div>
              <div className="mt-2 font-medium text-slate-900">VIT Chennai</div>
              <div className="text-[11px] text-slate-500 mt-1">Guide: Dr. Lekshmi K • BCSE497J Project I Review 3</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
