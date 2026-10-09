"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { translateText, checkHealth, getApiUrl } from "../lib/api";
import { batch_search_pictograms, cleanPictogramsForAAC, PictogramDetail } from "../lib/arasaac";

const API_URL = getApiUrl();

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pictogramDetails, setPictogramDetails] = useState<PictogramDetail[]>([]);
  const [cleanedInfo, setCleanedInfo] = useState<{raw: string[], cleaned: string[]} | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("translator");
  const [selectedModel, setSelectedModel] = useState<"t5" | "clip">("t5");
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [3, -3]);
  const rotateY = useTransform(mouseX, [-300, 300], [-3, 3]);

  useEffect(() => {
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ status: "offline" }));
    
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const examples = [
    { text: "The boy is eating an apple", note: "Simple sentence" },
    { text: "She lives in Detroit", note: "OOV handling - Detroit to metropolis" },
    { text: "you cannot know", note: "Negation handling" },
    { text: "he brush teeth", note: "Compound token - brush_teeth" },
    { text: "there is now a bus station", note: "Test set example" },
    { text: "the commune of mahambo is located on the island of madagascar", note: "Long sentence - full translation test" },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setPictogramDetails([]);
    
    try {
      const translation = await translateText(inputText, selectedModel);
      setResult(translation);
      
      const cleaned = cleanPictogramsForAAC(translation.pictograms);
      setCleanedInfo(cleaned);
      
      const details = await batch_search_pictograms(cleaned.cleaned);
      setPictogramDetails(details);
      
    } catch (err: any) {
      // Should never happen now - api.ts always returns CLIP fallback
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] relative">
      {/* Dot grid background - VISIBLE */}
      <div className="fixed inset-0 dot-grid opacity-60 pointer-events-none" />
      
      {/* 3D floating blocks - VISIBLE eye-catching creative not AI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Large paper stack top-left - VISIBLE */}
        <motion.div 
          style={{ x: useTransform(mouseX, [-300, 300], [-20, 20]), y: useTransform(mouseY, [-300, 300], [-15, 15]), rotateX, rotateY }}
          className="absolute top-[10%] left-[3%] perspective hidden md:block"
        >
          <div className="float-block w-[220px] h-[140px] rounded-[14px] p-4" style={{ transform: "rotateX(18deg) rotateY(-18deg)", animation: "floatY 8s ease-in-out infinite" }}>
            <div className="w-full h-2.5 bg-slate-900 rounded-full mb-3" />
            <div className="w-4/5 h-2 bg-slate-300 rounded-full mb-2.5" />
            <div className="w-3/5 h-2 bg-slate-200 rounded-full mb-2.5" />
            <div className="w-2/3 h-2 bg-slate-200 rounded-full" />
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-[#e7e5e4] rounded-[14px] -z-10 border-[1.5px] border-slate-900" />
          </div>
        </motion.div>
        
        {/* Circle with border - VISIBLE */}
        <motion.div 
          style={{ x: useTransform(mouseX, [-300, 300], [25, -25]), y: useTransform(mouseY, [-300, 300], [15, -15]) }}
          className="absolute top-[50%] right-[4%] perspective hidden lg:block"
        >
          <div className="float-3d w-[160px] h-[160px] rounded-full p-0 overflow-hidden flex items-center justify-center" style={{ transform: "rotateX(-12deg) rotateY(22deg)", animation: "floatY2 6s ease-in-out infinite" }}>
            <div className="w-20 h-20 border-[3px] border-slate-900 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-slate-900 rounded-full" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-[#e7e5e4] rounded-full -z-10 border-[1.5px] border-slate-900" />
          </div>
        </motion.div>

        {/* Yellow square - VISIBLE */}
        <motion.div 
          style={{ x: useTransform(mouseX, [-300, 300], [-12, 12]), y: useTransform(mouseY, [-300, 300], [20, -20]) }}
          className="absolute bottom-[22%] left-[10%] perspective hidden lg:block"
        >
          <div className="float-3d-yellow w-[120px] h-[120px] rounded-[18px] flex items-center justify-center" style={{ transform: "rotateX(22deg) rotateY(12deg)", animation: "floatRotate 7s ease-in-out infinite" }}>
            <div className="w-10 h-10 bg-slate-900 rounded-[8px] rotate-3" />
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-[#e7e5e4] rounded-[18px] -z-10 border-[1.5px] border-slate-900" />
          </div>
        </motion.div>

        {/* Green small block - VISIBLE */}
        <motion.div 
          style={{ x: useTransform(mouseX, [-300, 300], [15, -15]), y: useTransform(mouseY, [-300, 300], [-10, 10]) }}
          className="absolute bottom-[35%] right-[15%] perspective hidden md:block"
        >
          <div className="float-3d-green w-[80px] h-[80px] rounded-[12px] flex items-center justify-center" style={{ transform: "rotateX(10deg) rotateY(-10deg)" }}>
            <div className="w-6 h-6 border-[2px] border-slate-900 rounded-full" />
          </div>
        </motion.div>

        {/* Extra small dots pattern - VISIBLE */}
        <div className="absolute top-[20%] right-[25%] w-24 h-24 opacity-20 hidden xl:block">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-slate-900 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-[1.5px] border-slate-900 bg-white/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-[14px] rounded-[6px]">V</div>
            <div>
              <h1 className="text-[18px] font-semibold tracking-tight">Visual Voice</h1>
              <p className="text-[11px] text-slate-500 tracking-wide uppercase">T5-Base 51.41 BLEU • VIT Chennai</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border-[1.5px] border-slate-900 bg-white">
              <div className={`w-1.5 h-1.5 rounded-full ${apiStatus?.status?.includes('healthy') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-medium">{apiStatus?.model_type?.split('(')[0].trim() || 'T5-Base'}</span>
            </div>
            <a href={`${API_URL}/`} target="_blank" className="text-[11px] px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-black transition">HF Space</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-12 perspective">
        <motion.div 
          style={{ rotateX, rotateY }}
          className="max-w-3xl"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="text-[34px] md:text-[44px] font-semibold leading-[1.05] tracking-tight"
          >
            <span className="hand-underline">Visual Voice</span> converts text into pictograms for assistive communication.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-6 text-[15px] leading-[1.7] text-slate-600 max-w-2xl"
          >
            Visual Voice is a text-to-pictogram translation system built for Augmentative and Alternative Communication. It uses a fine-tuned T5-Base transformer trained on ImageCLEF 2026 toPicto data to convert English sentences into ARASAAC pictogram identifiers. The system is designed to support individuals with autism, cerebral palsy and aphasia by transforming free-form text into ordered visual symbol sequences, handling out-of-vocabulary locations, negation and compound concepts through vocabulary-constrained decoding.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <div className="card-3d rounded-[10px] bg-white px-4 py-3 min-w-[120px]">
              <div className="text-[20px] font-semibold leading-none">59,278</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Training samples</div>
            </div>
            <div className="card-3d rounded-[10px] bg-slate-900 text-white px-4 py-3 min-w-[120px]">
              <div className="text-[20px] font-semibold leading-none">51.41</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1.5">BLEU score</div>
            </div>
            <div className="card-3d rounded-[10px] bg-white px-4 py-3 min-w-[120px]">
              <div className="text-[20px] font-semibold leading-none">6,838</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Pictogram terms</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Tabs */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="inline-flex p-1 rounded-full bg-white border-[1.5px] border-slate-900">
          {[
            { id: 'translator', label: 'Translator' },
            { id: 'results', label: 'Results' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-full text-[13px] font-medium transition ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'translator' && (
            <motion.div key="translator" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} className="grid lg:grid-cols-[380px_1fr] gap-6">
              
              {/* Left */}
              <div className="space-y-4">
                <div className="card-3d rounded-[14px] bg-white p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">How to use</div>
                    <div className="text-[10px] px-2 py-1 rounded-full bg-[#f5f5f4] border border-slate-900">T5 + CLIP</div>
                  </div>
                  <ol className="space-y-3">
                    {[
                      "Select model: T5 (51.41 BLEU) or CLIP (fallback)",
                      "Type an English sentence in the input box",
                      "Click Translate - if T5 fails, auto switches to CLIP",
                      "View cleaned AAC version removing articles like the/an for clearer visual communication"
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3 text-[13px] leading-[1.5]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-medium">{i+1}</span>
                        <span className="text-slate-700">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-6 space-y-3">
                    {/* MODEL SELECTOR - NEW */}
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Select Model</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedModel("t5")}
                          className={`p-3 rounded-[10px] border-[1.5px] text-left transition ${selectedModel === "t5" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:border-slate-900"}`}
                        >
                          <div className="text-[13px] font-semibold">T5-Base</div>
                          <div className={`text-[10px] mt-1 ${selectedModel === "t5" ? "text-slate-300" : "text-slate-500"}`}>51.41 BLEU • ZeroGPU</div>
                        </button>
                        <button
                          onClick={() => setSelectedModel("clip")}
                          className={`p-3 rounded-[10px] border-[1.5px] text-left transition ${selectedModel === "clip" ? "bg-[#fef3c7] border-slate-900 text-slate-900" : "bg-white border-slate-200 hover:border-slate-900"}`}
                        >
                          <div className="text-[13px] font-semibold">CLIP Model</div>
                          <div className={`text-[10px] mt-1 ${selectedModel === "clip" ? "text-slate-600" : "text-slate-500"}`}>Fallback • Always works</div>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 leading-[1.4]">
                        {selectedModel === "t5" ? "T5 tries HF Space first, auto-fallback to CLIP if unreachable (ZeroGPU sleeps after 48h)" : "CLIP directly uses rule-based retrieval, no HF fetch needed"}
                      </div>
                    </div>

                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a sentence..."
                      className="w-full h-[100px] rounded-[10px] border-[1.5px] border-slate-900 bg-white p-3.5 text-[14px] leading-[1.5] placeholder:text-slate-400 focus:outline-none focus:shadow-[3px_3px_0px_#1a1a1a] transition-shadow resize-none"
                    />
                    <button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating}
                      className="w-full h-[44px] rounded-full bg-slate-900 text-white text-[14px] font-medium hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {isTranslating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Translating via {selectedModel.toUpperCase()}...</> : `Translate with ${selectedModel.toUpperCase()}`}
                    </button>
                  </div>
                </div>

                <div className="card-3d rounded-[14px] bg-white p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Try examples</div>
                  <div className="space-y-2">
                    {examples.map((ex, i) => (
                      <button key={i} onClick={() => setInputText(ex.text)} className="w-full text-left rounded-[10px] border border-slate-200 p-3 hover:border-slate-900 hover:shadow-[2px_2px_0px_#1a1a1a] transition group">
                        <div className="text-[13px] leading-[1.4] group-hover:font-medium">"{ex.text}"</div>
                        <div className="text-[11px] text-slate-500 mt-1">{ex.note}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[14px] bg-slate-900 p-5 text-white border-[1.5px] border-slate-900 shadow-[4px_4px_0px_#1a1a1a]">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Backend Status</div>
                  <div className="text-[13px] leading-[1.5] space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">T5 Model</span><span>51.41 BLEU</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">CLIP Fallback</span><span>Always works</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Hardware</span><span>ZeroGPU 16GB</span></div>
                    <div className="text-[11px] text-slate-400 mt-3">If T5 unreachable, UI auto switches to CLIP - no error shown. Open HF Space to wake T5.</div>
                  </div>
                </div>
              </div>

              {/* Right - Output */}
              <div className="card-3d rounded-[14px] bg-white p-6 min-h-[680px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Output</div>
                  {result && (
                    <div className="flex items-center gap-2">
                      <div className={`text-[10px] px-2.5 py-1 rounded-full border-[1.5px] font-medium ${result.is_clip_fallback ? 'bg-[#fef3c7] border-slate-900 text-slate-900' : result.model.includes('CLIP') && !result.is_clip_fallback ? 'bg-[#fef3c7] border-slate-900' : 'bg-slate-900 text-white border-slate-900'}`}>
                        {result.is_clip_fallback ? 'CLIP Fallback (T5 failed)' : result.model.includes('CLIP') ? 'CLIP Model' : 'T5 Model'}
                      </div>
                      <div className="text-[11px] text-slate-500">{cleanedInfo?.cleaned.length || result.num_tokens} pictograms</div>
                    </div>
                  )}
                </div>

                {!result && !isTranslating && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 rounded-[12px] border-[1.5px] border-dashed border-slate-300 flex items-center justify-center mb-4 bg-[#f8f7f4]">
                      <div className="w-10 h-10 rounded-[8px] bg-white border-[1.5px] border-slate-900 shadow-[2px_2px_0px_#1a1a1a]" />
                    </div>
                    <div className="text-[14px] font-medium">No translation yet</div>
                    <div className="text-[13px] text-slate-500 mt-1 max-w-sm">Select T5 or CLIP model, type text, click Translate. T5 uses HF ZeroGPU, CLIP always works. Images via batch_search_pictograms from ARASAAC.</div>
                    <div className="mt-6 grid grid-cols-3 gap-2 max-w-sm w-full">
                      <div className="h-2 bg-slate-900 rounded-full" />
                      <div className="h-2 bg-slate-300 rounded-full" />
                      <div className="h-2 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                )}

                {isTranslating && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-6 h-6 border-[2px] border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                    <div className="text-[14px] font-medium">Translating via {selectedModel.toUpperCase()} model</div>
                    <div className="text-[12px] text-slate-500 mt-1">{selectedModel === "t5" ? "Trying HF Space T5, will auto-fallback to CLIP if needed" : "Using CLIP retrieval"}</div>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {result.is_clip_fallback && (
                      <div className="rounded-[10px] bg-[#fef3c7] border-[1.5px] border-slate-900 p-3 text-[12px]">
                        <span className="font-semibold">Auto-switched to CLIP:</span> T5 was unreachable (ZeroGPU sleeps after 48h). Open <a href={API_URL} target="_blank" className="underline font-medium">HF Space</a> in new tab to wake T5 for next time. CLIP result shown below.
                      </div>
                    )}

                    {cleanedInfo && (
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="rounded-[10px] bg-[#f5f5f4] border-[1.5px] border-slate-900 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider">Raw model output</div>
                          <div className="text-[13px] font-mono mt-2 leading-[1.5] break-words">{cleanedInfo.raw.join(' → ')}</div>
                        </div>
                        <div className="rounded-[10px] bg-slate-900 text-white p-4 border-[1.5px] border-slate-900">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cleaned for AAC</div>
                          <div className="text-[13px] font-mono mt-2 leading-[1.5] break-words">{cleanedInfo.cleaned.join(' → ')}</div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Pictograms - ARASAAC images</div>
                      <div className="perspective">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {pictogramDetails.length > 0 ? pictogramDetails.map((picto, idx) => (
                            <motion.div
                              key={`${picto.word}-${idx}`}
                              initial={{ opacity: 0, y: 16, rotateX: -10 }}
                              animate={{ opacity: 1, y: 0, rotateX: 0 }}
                              transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                              className="pictogram-paper group relative rounded-[12px] p-3"
                            >
                              <div className="aspect-square rounded-[8px] bg-[#f8fafc] mb-3 overflow-hidden flex items-center justify-center">
                                {picto.image_url ? (
                                  <img src={picto.image_url} alt={picto.word} className="w-full h-full object-contain p-3 group-hover:scale-[1.05] transition-transform duration-300" />
                                ) : (
                                  <div className="text-[11px] text-slate-500">{picto.word}</div>
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-[13px] font-medium tracking-tight truncate">{picto.word}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1">ID {picto.id || '—'}</div>
                              </div>
                              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-medium border-2 border-white">
                                {idx + 1}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="col-span-full text-[13px] text-slate-500">No images for filtered terms. Raw: {result.pictograms.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[10px] border-[1.5px] border-slate-900 p-4 bg-[#f5f5f4]">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Model</div>
                      <div className="text-[12px] font-mono mt-1">{result.model} • {result.method} • {result.num_tokens} tokens {result.is_clip_fallback ? '• Auto fallback active' : ''}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
              <div className="card-3d rounded-[14px] bg-white p-6">
                <h3 className="text-[14px] font-semibold uppercase tracking-wider mb-5">Evaluation Results - Review 3</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { label: "sacreBLEU", value: "51.41", base: "29.24", desc: "N-gram overlap, higher better" },
                    { label: "METEOR", value: "70.50", base: "60.30", desc: "Semantic similarity" },
                    { label: "PictoER", value: "30.14", base: "41.15", desc: "Pictogram error rate, lower better" },
                  ].map(m => (
                    <div key={m.label} className="rounded-[10px] border-[1.5px] border-slate-900 p-4 bg-[#f8f7f4]">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">{m.label}</div>
                      <div className="text-[28px] font-semibold leading-none mt-2">{m.value}</div>
                      <div className="text-[12px] text-slate-600 mt-2">{m.desc}</div>
                      <div className="text-[11px] text-slate-500 mt-3 border-t border-slate-200 pt-2">Baseline: {m.base}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[10px] bg-slate-900 text-white p-4 text-[13px] leading-[1.6]">
                  <strong>T5-Base + Greedy</strong> is best (51.41 BLEU) vs T5-Large + Beam 27.58 BLEU. Smaller model generalizes better for open-domain English 2026 task. 2024/2025 French medical tasks had 74-76 BLEU because medical domain repeats vocabulary. Open-domain English has many OOV names with no ARASAAC pictogram yet - where CLIP fallback helps.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t-[1.5px] border-slate-900 mt-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="text-[15px] font-semibold">Visual Voice</div>
              <div className="text-[13px] text-slate-600 mt-2 max-w-sm leading-[1.6]">An intelligent text-to-pictogram system for AAC, built as capstone project at VIT Chennai. Converts free-form text to ARASAAC pictogram sequences.</div>
            </div>
            <div className="text-[13px] leading-[1.7]">
              <div className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 mb-2">Made by</div>
              <div>Lakshhmi Narayanan T - 23BAI1048</div>
              <div>Adithiyaa D - 23BAI1038</div>
              <div className="mt-3 font-semibold">VIT Chennai</div>
              <div className="text-[11px] text-slate-500 mt-1">Guide: Dr. Lekshmi K • BCSE497J • ImageCLEF 2026 toPicto</div>
              <div className="text-[11px] text-slate-500 mt-2">Backend: HF Space ZeroGPU 16GB RAM • Frontend: Vercel • Model: T5-Base + CLIP Fallback</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
