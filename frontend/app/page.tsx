"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { translateText, checkHealth, getApiUrl } from "../lib/api";
import { batch_search_pictograms, cleanPictogramsForAAC, PictogramDetail } from "../lib/arasaac";

const API_URL = getApiUrl();

function WebBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const numNodes = 35;
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1
      });
    }
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const opacity = (1 - dist / 140) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(26, 26, 26, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 26, 26, 0.12)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 26, 26, 0.25)';
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pictogramDetails, setPictogramDetails] = useState<PictogramDetail[]>([]);
  const [cleanedInfo, setCleanedInfo] = useState<{raw: string[], cleaned: string[]} | null>(null);
  const [activeTab, setActiveTab] = useState("translator");
  const [selectedModel, setSelectedModel] = useState<"t5" | "clip">("t5");
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkHealth().then(()=>{}).catch(()=>{});
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    setPictogramDetails([]);
    try {
      const translation = await translateText(inputText, selectedModel);
      setResult(translation);
      const cleaned = cleanPictogramsForAAC(translation.pictograms);
      setCleanedInfo(cleaned);
      const details = await batch_search_pictograms(cleaned.cleaned);
      setPictogramDetails(details);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] relative">
      <WebBackground />
      <div className="fixed inset-0 dot-grid opacity-40 pointer-events-none" style={{ zIndex: 0 }} />

      <motion.header 
        initial={{ y: 0 }}
        animate={{ y: headerVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-20 border-b-[1.5px] border-slate-900 bg-white/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-[14px] rounded-[6px]">V</div>
            <div>
              <h1 className="text-[18px] font-semibold tracking-tight">Visual Voice</h1>
              <p className="text-[11px] text-slate-500 tracking-wide uppercase">VIT Chennai</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`${API_URL}/`} target="_blank" className="text-[11px] px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-black transition">HF Space</a>
          </div>
        </div>
      </motion.header>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="max-w-3xl">
          <h2 className="text-[34px] md:text-[44px] font-semibold leading-[1.05] tracking-tight">
            Visual Voice converts text into pictograms for assistive communication.
          </h2>
          <p className="mt-6 text-[15px] leading-[1.7] text-slate-600 max-w-2xl">
            Visual Voice is a text-to-pictogram translation system built for Augmentative and Alternative Communication. It uses a fine-tuned T5-Base transformer trained on ImageCLEF 2026 toPicto data to convert English sentences into ARASAAC pictogram identifiers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="bg-white border-[1.5px] border-slate-900 rounded-[10px] px-4 py-3 min-w-[120px] shadow-[3px_3px_0px_#1a1a1a]">
              <div className="text-[20px] font-semibold leading-none">59,278</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Training samples</div>
            </div>
            <div className="bg-slate-900 text-white border-[1.5px] border-slate-900 rounded-[10px] px-4 py-3 min-w-[120px] shadow-[3px_3px_0px_#1a1a1a]">
              <div className="text-[20px] font-semibold leading-none">51.41</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1.5">BLEU score</div>
            </div>
            <div className="bg-white border-[1.5px] border-slate-900 rounded-[10px] px-4 py-3 min-w-[120px] shadow-[3px_3px_0px_#1a1a1a]">
              <div className="text-[20px] font-semibold leading-none">6,838</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Pictogram terms</div>
            </div>
          </div>
        </div>
      </section>

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

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'translator' && (
            <motion.div key="translator" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="grid lg:grid-cols-[380px_1fr] gap-6">
              
              <div className="space-y-4">
                <div className="bg-white border-[1.5px] border-slate-900 rounded-[14px] p-5 shadow-[4px_4px_0px_#1a1a1a]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">How to use</div>
                  <div className="text-[13px] text-slate-700 mb-6">Click Translate.</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Select model: T5 model or CLIP model.</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value as "t5" | "clip")}
                        className="w-full h-[44px] rounded-[10px] border-[1.5px] border-slate-900 bg-white px-3.5 text-[14px] font-medium focus:outline-none"
                      >
                        <option value="t5">T5-Base</option>
                        <option value="clip">CLIP Model</option>
                      </select>
                    </div>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a sentence..."
                      className="w-full h-[100px] rounded-[10px] border-[1.5px] border-slate-900 bg-white p-3.5 text-[14px] leading-[1.5] placeholder:text-slate-400 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating}
                      className="w-full h-[44px] rounded-full bg-slate-900 text-white text-[14px] font-medium hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {isTranslating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Translating...</> : "Translate"}
                    </button>
                  </div>
                </div>

                <div className="bg-white border-[1.5px] border-slate-900 rounded-[14px] p-5 shadow-[4px_4px_0px_#1a1a1a]">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Try examples</div>
                  <div className="space-y-2">
                    {examples.map((ex, i) => (
                      <button key={i} onClick={() => setInputText(ex.text)} className="w-full text-left rounded-[10px] border border-slate-200 p-3 hover:border-slate-900 transition">
                        <div className="text-[13px] leading-[1.4]">"{ex.text}"</div>
                        <div className="text-[11px] text-slate-500 mt-1">{ex.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border-[1.5px] border-slate-900 rounded-[14px] p-6 min-h-[680px] flex flex-col shadow-[4px_4px_0px_#1a1a1a] relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Output</div>
                  <div className="flex items-center gap-2">
                    {result && <div className="text-[11px] text-slate-500">{pictogramDetails.length} pictograms</div>}
                    {/* Small round button for details - hidden model info */}
                    {result && (
                      <div className="relative">
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="w-8 h-8 rounded-full bg-white border-[1.5px] border-slate-900 flex items-center justify-center text-[12px] font-bold shadow-[2px_2px_0px_#1a1a1a] hover:shadow-[3px_3px_0px_#1a1a1a] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                        >
                          i
                        </button>
                        {showDetails && (
                          <div className="absolute right-0 top-10 w-72 rounded-[12px] bg-white border-[1.5px] border-slate-900 p-4 shadow-[4px_4px_0px_#1a1a1a] z-20">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Model Info (hidden)</div>
                            <div className="text-[11px] font-mono leading-[1.5] text-slate-700">
                              <div>Model: {result.model}</div>
                              <div className="mt-1">Method: {result.method}</div>
                              <div className="mt-1">Tokens: {result.num_tokens}</div>
                              <div className="mt-1">Source: {result.from_cache ? "From cache (GPU quota exceeded)" : result.is_clip_fallback ? "CLIP Model (fallback)" : "T5 model (fresh prediction)"}</div>
                              <div className="mt-1">From cache: {result.from_cache ? "Yes" : "No"}</div>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="mt-3 text-[11px] px-3 py-1 rounded-full bg-slate-900 text-white">Close</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!result && !isTranslating && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 rounded-[12px] border-[1.5px] border-dashed border-slate-300 flex items-center justify-center mb-4 bg-[#f8f7f4]">
                      <div className="w-10 h-10 rounded-[8px] bg-white border-[1.5px] border-slate-900" />
                    </div>
                    <div className="text-[14px] font-medium">No translation yet</div>
                    <div className="text-[13px] text-slate-500 mt-1 max-w-sm">Select model, type text, click Translate.</div>
                  </div>
                )}

                {isTranslating && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-6 h-6 border-[2px] border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                    <div className="text-[14px] font-medium">Translating...</div>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pictogramDetails.length > 0 ? pictogramDetails.map((picto, idx) => (
                          <div key={`${picto.word}-${idx}`} className="bg-white border-[1.5px] border-slate-900 rounded-[12px] p-3 relative shadow-[3px_3px_0px_#1a1a1a]">
                            <div className="aspect-square rounded-[8px] bg-[#f8fafc] mb-3 overflow-hidden flex items-center justify-center">
                              {picto.image_url ? (
                                <img src={picto.image_url} alt={picto.word} className="w-full h-full object-contain p-3" />
                              ) : (
                                <div className="text-[11px] text-slate-500 p-2 text-center">{picto.word}</div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-[13px] font-medium tracking-tight truncate">{picto.word}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1">ID {picto.id || '—'}</div>
                            </div>
                            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-medium border-2 border-white">
                              {idx + 1}
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full text-[13px] text-slate-500">No images, raw: {result.pictograms.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
              <div className="bg-white border-[1.5px] border-slate-900 rounded-[14px] p-6 shadow-[4px_4px_0px_#1a1a1a]">
                <h3 className="text-[14px] font-semibold uppercase tracking-wider mb-5">Evaluation Results - Review 3</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { label: "sacreBLEU", value: "51.41", base: "29.24" },
                    { label: "METEOR", value: "70.50", base: "60.30" },
                    { label: "PictoER", value: "30.14", base: "41.15" },
                  ].map(m => (
                    <div key={m.label} className="rounded-[10px] border-[1.5px] border-slate-900 p-4 bg-[#f8f7f4]">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">{m.label}</div>
                      <div className="text-[28px] font-semibold leading-none mt-2">{m.value}</div>
                      <div className="text-[11px] text-slate-500 mt-3 border-t border-slate-200 pt-2">Baseline: {m.base}</div>
                    </div>
                  ))}
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
              <div className="text-[13px] text-slate-600 mt-2 max-w-sm leading-[1.6]">An intelligent text-to-pictogram system for AAC, built as capstone project at VIT Chennai.</div>
            </div>
            <div className="text-[13px] leading-[1.7]">
              <div className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 mb-2">Made by</div>
              <div>Lakshhmi Narayanan T - 23BAI1048</div>
              <div>Adithiyaa D - 23BAI1038</div>
              <div className="mt-3 font-semibold">VIT Chennai</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
