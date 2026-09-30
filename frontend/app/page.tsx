"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Brain, Eye, MessageSquare, 
  Mic, Send, Zap, Shield, Cpu, 
  BarChart3, Layers, Globe, 
  Play, Github, ExternalLink,
  CheckCircle2, AlertCircle, Loader2,
  Volume2, Image as ImageIcon, Settings
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
interface PictogramDetail {
  word: string;
  id?: number;
  image_url?: string;
  image_url_300?: string;
  fallback?: boolean;
}

interface TranslationResult {
  input: string;
  pictograms: string[];
  pictogram_details?: PictogramDetail[];
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
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState("translator");

  // Check API health on load
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(setApiStatus)
      .catch(() => setApiStatus({ status: "offline", model_type: "offline" }));
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
    
    try {
      const response = await fetch(`${API_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          model_type: selectedModel,
          num_beams: 6,
          use_constrained: true,
          include_images: true
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Translation failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend. Is it running?");
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
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
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VisualVoice</h1>
              <p className="text-xs text-slate-500 -mt-1">BCSE497J • VIT Chennai</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs">
              <div className={`w-2 h-2 rounded-full ${apiStatus?.status === 'healthy' ? 'bg-green-500' : apiStatus?.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="font-medium">{apiStatus?.model_type || 'checking...'}</span>
              <span className="text-slate-400">• {apiStatus?.vocab_size || 6838} terms</span>
            </div>
            <button 
              onClick={() => window.open(`${API_URL}/docs`, '_blank')}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-violet-600/5 to-fuchsia-600/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                ImageCLEF 2026 toPicto Task
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9] mb-4">
                Text to
                <span className="gradient-text block">Pictograms</span>
                <span className="text-2xl md:text-3xl font-bold text-slate-600 block mt-2">for AAC Communication</span>
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                An intelligent Transformer-based system that converts free-form English into ordered 
                <span className="font-semibold text-slate-900"> ARASAAC pictogram sequences</span> for autism, cerebral palsy & aphasia support. 
                <span className="bg-yellow-100 px-1.5 py-0.5 rounded font-medium"> 51.41 BLEU • 70.5 METEOR</span>
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Training Data", value: "59,278", sub: "sentences" },
                  { label: "Vocabulary", value: "6,838", sub: "pictogram terms" },
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
                <button
                  onClick={() => document.getElementById('translator')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Live Demo
                </button>
                <button
                  onClick={() => setActiveTab('architecture')}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Architecture
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Floating pictogram demo */}
              <div className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-xs font-mono text-slate-400">VisualVoice Live</div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border">
                    <div className="text-xs font-medium text-slate-500 mb-1">INPUT</div>
                    <div className="font-medium">The boy is eating an apple</div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100">
                    <div className="text-xs font-medium text-blue-600 mb-3">PICTOGRAM SEQUENCE • 51.41 BLEU</div>
                    <div className="flex gap-3">
                      {[
                        { emoji: "👦", label: "boy" },
                        { emoji: "🍽️", label: "eat" },
                        { emoji: "🍎", label: "apple" },
                      ].map((p, i) => (
                        <motion.div
                          key={p.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex-1 p-3 bg-white rounded-xl border shadow-sm text-center"
                        >
                          <div className="text-2xl mb-1">{p.emoji}</div>
                          <div className="text-xs font-medium">{p.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> T5-Base + Greedy</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> VCD Constrained</span>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg"
              >
                ✓ 30.14 PictoER
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-lg"
              >
                ARASAAC 39k Symbols
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
          {[
            { id: 'translator', label: 'Live Translator', icon: MessageSquare },
            { id: 'architecture', label: 'Architecture', icon: Brain },
            { id: 'results', label: 'Results & Metrics', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'translator' && (
            <motion.div
              key="translator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="translator"
              className="grid lg:grid-cols-5 gap-6"
            >
              {/* Input Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Input Text
                    </h3>
                    <div className="flex gap-2">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg border bg-slate-50"
                      >
                        <option value="auto">Auto (Best Available)</option>
                        <option value="t5">T5-Base (51.41 BLEU)</option>
                        <option value="mock">Mock Demo</option>
                        <option value="gemini">Gemini Flash (Fallback Reserve)</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a sentence to translate to pictograms... e.g., 'The boy is eating an apple'"
                      className="w-full h-32 p-4 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-[15px] leading-relaxed"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTranslate();
                      }}
                    />
                    <button
                      onClick={handleVoiceInput}
                      className={`absolute right-3 top-3 p-2 rounded-lg transition ${
                        isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleTranslate}
                      disabled={!inputText.trim() || isTranslating}
                      className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                    >
                      {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isTranslating ? 'Translating...' : 'Translate to Pictograms'}
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Press Cmd+Enter to translate • Mic for speech-to-picto
                  </div>
                </div>

                {/* Examples */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Try these examples (from Review 3)
                  </h4>
                  <div className="space-y-2">
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setInputText(ex.text)}
                        className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition group"
                      >
                        <div className="text-[13px] font-medium group-hover:text-blue-700">"{ex.text}"</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            ex.category === 'success' ? 'bg-green-100 text-green-700' :
                            ex.category === 'oov' ? 'bg-orange-100 text-orange-700' :
                            ex.category === 'complex' ? 'bg-violet-100 text-violet-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {ex.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Info */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4" />
                    Current Setup
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Backend</span>
                      <span className="font-mono text-xs">{API_URL.includes('localhost') ? 'localhost:8000' : 'HF Space'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Model</span>
                      <span className="font-medium">{apiStatus?.model_type || 'Loading...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gemini Fallback</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${apiStatus?.gemini_available ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                        {apiStatus?.gemini_available ? 'Ready (Reserve)' : 'Not configured'}
                      </span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-white/10 text-xs text-slate-400">
                      💡 For demo: If T5 accuracy low live, switch model to Gemini Flash (free) - it's your reserve option.
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Panel */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
                  {/* Output Header */}
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Pictogram Sequence
                      {result && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {result.num_tokens} pictograms
                        </span>
                      )}
                    </h3>
                    {result && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full font-medium ${
                          result.is_mock ? 'bg-yellow-100 text-yellow-700' : 
                          result.is_fallback ? 'bg-violet-100 text-violet-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {result.is_mock ? 'Mock Demo' : result.is_fallback ? 'Gemini Fallback' : 'T5 Model'}
                        </span>
                        <span className="text-slate-500 font-mono">{result.method}</span>
                      </div>
                    )}
                  </div>

                  {/* Output Content */}
                  <div className="flex-1 p-6">
                    {!result && !error && !isTranslating && (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mb-4">
                          <Eye className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="font-medium text-slate-900 mb-1">No translation yet</h4>
                        <p className="text-sm text-slate-500 max-w-sm">
                          Enter text on the left and click Translate. Pictograms will appear here with ARASAAC images.
                        </p>
                        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-left max-w-sm">
                          <div className="text-xs font-semibold text-blue-900 mb-1">💡 Capstone Demo Tip</div>
                          <div className="text-xs text-blue-700 leading-relaxed">
                            Start with <span className="font-mono bg-white px-1 rounded">"The boy is eating an apple"</span> - it's your most reliable example from Review 3. Then show OOV handling with Detroit.
                          </div>
                        </div>
                      </div>
                    )}

                    {isTranslating && (
                      <div className="h-full flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <div className="font-medium">Translating to pictograms...</div>
                        <div className="text-sm text-slate-500 mt-1">Running {selectedModel} • VCD constrained decoding</div>
                        <div className="mt-6 flex gap-2">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-20 h-20 rounded-xl shimmer" style={{ animationDelay: `${i*0.2}s` }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-900 text-sm">Translation failed</div>
                          <div className="text-sm text-red-700 mt-1">{error}</div>
                          <div className="mt-3 text-xs text-red-600">
                            <div className="font-medium">Troubleshooting:</div>
                            <div>1. Is backend running? Check {API_URL}/health</div>
                            <div>2. If using mock, it's okay - shows UI works</div>
                            <div>3. For Gemini fallback, set GEMINI_API_KEY in .env</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {result && (
                      <div className="space-y-6">
                        {/* Pictogram Strip - Main Visual */}
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visual Sequence • ARASAAC Pictograms</div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {result.pictogram_details && result.pictogram_details.length > 0 ? (
                              result.pictogram_details.map((picto, idx) => (
                                <motion.div
                                  key={`${picto.word}-${idx}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="pictogram-card group relative bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-blue-200"
                                >
                                  <div className="aspect-square bg-slate-50 rounded-xl mb-2 overflow-hidden flex items-center justify-center">
                                    {picto.image_url ? (
                                      <img
                                        src={picto.image_url}
                                        alt={picto.word}
                                        className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <div className={`${picto.image_url ? 'hidden' : ''} text-center p-2`}>
                                      <div className="text-2xl mb-1">🖼️</div>
                                      <div className="text-[10px] font-medium text-slate-600">{picto.word}</div>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-sm truncate">{picto.word}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">#{picto.id || 'N/A'}</div>
                                  </div>
                                  <div className="absolute top-2 left-2 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {idx + 1}
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              // Fallback if no image details
                              result.pictograms.map((word, idx) => (
                                <motion.div
                                  key={`${word}-${idx}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="pictogram-card bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 rounded-2xl p-4 text-center"
                                >
                                  <div className="text-2xl mb-2">🔤</div>
                                  <div className="font-semibold text-sm">{word}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">{idx + 1}</div>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Raw Sequence */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Raw Sequence • For Evaluation</div>
                          <div className="font-mono text-sm bg-white p-3 rounded-lg border">
                            {result.pictograms.join(' → ')}
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-slate-500">
                            <span>Model: {result.model}</span>
                            <span>Method: {result.method}</span>
                            <span>Tokens: {result.num_tokens}</span>
                          </div>
                        </div>

                        {/* Mock Warning */}
                        {result.is_mock && (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-amber-900">Demo Mode - Mock Model</div>
                              <div className="text-amber-800 mt-1">
                                Real T5 weights not loaded. This shows UI flow. Download your Kaggle model (models/t5-base-picto) and set <code className="bg-white px-1 rounded">MODEL_PATH</code> or <code className="bg-white px-1 rounded">HF_MODEL_ID</code> to use real model.
                              </div>
                              <div className="mt-2 text-xs">
                                <strong>Steps to enable real model:</strong> See docs/DEPLOYMENT.md - Step 1: Download Kaggle output
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success */}
                        {!result.is_mock && (
                          <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-green-900">Translation successful</div>
                              <div className="text-green-800 mt-1">
                                Generated {result.num_tokens} pictograms preserving meaning. 
                                {result.is_fallback ? ' Using Gemini Flash fallback (reserve option).' : ' Using your fine-tuned T5 with VCD constrained decoding.'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Brain className="w-7 h-7 text-violet-600" />
                  Proposed Architecture (Review 3)
                </h2>

                {/* Architecture Diagram */}
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border">
                    <div className="flex items-center justify-between gap-2">
                      {[
                        { icon: "🔤", title: "Input Sentence", desc: "Free-form text or ASR transcript", color: "bg-blue-500" },
                        { icon: "≡", title: "Task-Prefix", desc: '"translate to pictogram: " + sentence', color: "bg-violet-500" },
                        { icon: "🔧", title: "T5 Tokenizer + Vocab Injection", desc: "2,041 compound terms as atomic units", color: "bg-fuchsia-500" },
                        { icon: "🧠", title: "T5-Base Encoder-Decoder", desc: "Fine-tuned seq2seq, 220M params", color: "bg-indigo-500" },
                        { icon: "⚙️", title: "Constrained Beam Search", desc: "num_beams=6 + VCD logits processor", color: "bg-emerald-500" },
                        { icon: "📋", title: "Pictogram Sequence", desc: "Mapped to ARASAAC IDs + Images", color: "bg-orange-500" },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="text-center min-w-[110px]">
                            <div className={`w-12 h-12 mx-auto rounded-xl ${step.color} flex items-center justify-center text-white text-xl mb-2`}>
                              {step.icon}
                            </div>
                            <div className="font-semibold text-xs">{step.title}</div>
                            <div className="text-[10px] text-slate-500 mt-1 leading-tight">{step.desc}</div>
                          </div>
                          {i < 5 && <div className="w-8 h-0.5 bg-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-2">🔧 Key Enhancement 1: Compound Token Injection</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      From your notebook Cell 5: <code className="bg-white px-1 rounded">tokenizer.add_tokens(compound_toks)</code>. 
                      Terms like <code>brush_teeth</code>, <code>be_able_to</code> kept atomic instead of BPE splitting. +2,041 tokens. Embedding resize from mean/covariance.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-violet-50 border border-violet-100">
                    <h4 className="font-semibold text-violet-900 mb-2">🛡️ Key Enhancement 2: Vocab-Constrained Decoding</h4>
                    <p className="text-sm text-violet-800 leading-relaxed">
                      Your Review 3 challenge: early runs emitted plain English like "cannot" absent from ARASAAC. 
                      Solution: <code className="bg-white px-1 rounded">VocabConstraintLogitsProcessor</code> with -10 soft penalty on non-pictogram tokens.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <h4 className="font-semibold text-emerald-900 mb-2">📊 Result: T5-Base + Greedy Wins</h4>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      Baseline T5_direct: 29.24 BLEU. Your T5-large + Beam: 27.58. 
                      <strong> Your T5-base + Greedy: 51.41 BLEU, 70.50 METEOR, 30.14 PictoER</strong> - best across all metrics. Shows smaller model + greedy generalizes better for open-domain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border p-6">
                  <h3 className="font-semibold mb-4">Handling Difficult Cases (From PPT Slide 13)</h3>
                  <div className="space-y-3">
                    {[
                      { case: "OOV: Detroit", input: "She lives in Detroit", output: "she live in metropolis", fix: "Constrained decoder falls back to nearest in-vocab concept" },
                      { case: "Negation & Modality", input: "you cannot know", output: "you be_able_to know not", fix: "AAC grammar moves negation to end, learns substitution" },
                      { case: "Multi-word", input: "he brush teeth", output: "he brush_teeth", fix: "Compound-token injection keeps atomic" },
                    ].map(c => (
                      <div key={c.case} className="p-3 rounded-xl bg-slate-50 border">
                        <div className="font-medium text-sm">{c.case}</div>
                        <div className="text-xs font-mono mt-1"><span className="text-slate-500">IN:</span> {c.input}</div>
                        <div className="text-xs font-mono"><span className="text-slate-500">OUT:</span> <span className="text-green-700 font-semibold">{c.output}</span></div>
                        <div className="text-[11px] text-slate-600 mt-1">{c.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border p-6">
                  <h3 className="font-semibold mb-4">Deployment Architecture (Option C)</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0">V</div>
                      <div>
                        <div className="font-medium text-sm">Frontend: Vercel (Next.js)</div>
                        <div className="text-xs text-slate-600">Impressive UI with Tailwind + Framer Motion. Free, fast, professional. Hosts this page.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center flex-shrink-0">HF</div>
                      <div>
                        <div className="font-medium text-sm">Backend: Hugging Face Spaces (FastAPI)</div>
                        <div className="text-xs text-slate-600">Docker with T5 model on free CPU (16GB RAM). Pluggable: MODEL_TYPE env var switches T5/CLIP/Gemini.</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0">A</div>
                      <div>
                        <div className="font-medium text-sm">Pictograms: ARASAAC API</div>
                        <div className="text-xs text-slate-600">Live fetch from static.arasaac.org/pictograms/{'{id}'}/{'{id}'}_500.png. 39k symbols.</div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-violet-50 border border-violet-100 text-xs">
                      <strong>Future-proof:</strong> Change model from T5 to CLIP? Just set MODEL_TYPE=clip in HF Space Secrets. Frontend unchanged. For Gemini fallback reserve, set GEMINI_API_KEY secret.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { metric: "sacreBLEU ↑", value: "51.41", baseline: "29.24", desc: "Word/phrase overlap", good: ">30 good" },
                  { metric: "METEOR ↑", value: "70.50", baseline: "60.30", desc: "Semantic similarity, synonyms", good: ">40 good" },
                  { metric: "PictoER ↓", value: "30.14", baseline: "41.15", desc: "Pictogram Error Rate (insert/del/sub)", good: "lower better" },
                ].map(m => (
                  <div key={m.metric} className="bg-white rounded-2xl border p-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.metric}</div>
                    <div className="text-3xl font-black mt-2">{m.value}</div>
                    <div className="text-sm text-slate-600 mt-1">{m.desc}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-slate-100 rounded-full">Baseline: {m.baseline}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{m.good}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold mb-4">Baseline vs Proposed (From Review 3 Slide 15)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-3 font-medium">Model</th>
                        <th className="pb-3 font-medium">BLEU ↑</th>
                        <th className="pb-3 font-medium">METEOR ↑</th>
                        <th className="pb-3 font-medium">PictoER ↓</th>
                        <th className="pb-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { model: "T5_direct baseline", bleu: "29.24", meteor: "60.30", pictoer: "41.15", note: "From base paper" },
                        { model: "T5-large + Beam Search", bleu: "27.58", meteor: "63.07", pictoer: "39.41", note: "Your initial run" },
                        { model: "T5-base + Greedy (BEST)", bleu: "51.41", meteor: "70.50", pictoer: "30.14", note: "Proposed - smaller generalizes better", highlight: true },
                      ].map(row => (
                        <tr key={row.model} className={`border-b last:border-0 ${row.highlight ? 'bg-green-50/50 font-semibold' : ''}`}>
                          <td className="py-3">{row.model} {row.highlight && '🏆'}</td>
                          <td className="py-3">{row.bleu}</td>
                          <td className="py-3">{row.meteor}</td>
                          <td className="py-3">{row.pictoer}</td>
                          <td className="py-3 text-slate-600">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold mb-4">Qualitative Results (From PPT Slide 16)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { text: "she finds herself also in the british isles", output: "she locate in the islet Great_Britain", status: "✓ Success", id: "common_voice_fr_19759450.mp3" },
                    { text: "he then became a horse trainer", output: "past he later_on trainer by horse", status: "✓ Success", id: "common_voice_fr_24814133.mp3" },
                    { text: "the other important cities are wichian buri...", output: "the other metropolis important be metropolis and metropolis", status: "△ Partial (OOV cities)", id: "common_voice_fr_29061879.mp3" },
                    { text: "he is also the grandson of claude de bullion", output: "he be = the grandson of half_body", status: "✗ Failure - named entity", id: "common_voice_fr_35286577.mp3" },
                  ].map((ex, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ex.status.includes('Success') ? 'bg-green-100 text-green-700' :
                          ex.status.includes('Partial') ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{ex.status}</span>
                        <span className="text-[10px] font-mono text-slate-500">{ex.id}</span>
                      </div>
                      <div className="text-sm font-medium">"{ex.text}"</div>
                      <div className="text-xs font-mono text-slate-600 mt-1">→ {ex.output}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                  <strong>Gap Analysis (Slide 17):</strong> 2024/2025 French tasks were medical-domain (repeated vocab) → 74-76 BLEU. 2026 is open-domain English with many OOV names (no ARASAAC pictogram yet) → 51.41 is strong. CLIP fallback aims to fix coverage gap.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="font-bold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                VisualVoice
              </div>
              <div className="text-sm text-slate-600 mt-1">
                BCSE497J Project I • Review 3 • VIT Chennai<br />
                Team: Adithiyaa D (23BAI1038), Lakshhmi Narayanan T (23BAI1048) • Guide: Dr. Lekshmi K
              </div>
            </div>
            <div className="text-xs text-slate-500">
              <div>Dataset: ImageCLEF 2026 toPicto (59,278 train / 4,397 val / 4,306 test)</div>
              <div>Vocab: ARASAAC 39k symbols • 6,838 terms used • 2,041 compound tokens injected</div>
              <div className="mt-2">Built with Next.js + FastAPI + T5 • Deploy: Vercel + HF Spaces</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
