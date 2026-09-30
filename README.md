# VisualVoice - Text-to-Pictogram Translation for AAC
### BCSE497J Capstone Project - VIT Chennai - Final Review

**Team:** Adithiyaa D (23BAI1038), Lakshhmi Narayanan T (23BAI1048)  
**Guide:** Dr. Lekshmi K  
**Task:** ImageCLEF 2026 toPicto - Text-to-Picto

> An Intelligent Transformer-based system that converts free-form English into ordered ARASAAC pictogram sequences for AAC users (autism, cerebral palsy, aphasia).

---

## 🏆 Results (Review 3)

| Model | sacreBLEU ↑ | METEOR ↑ | PictoER ↓ |
|-------|-------------|----------|-----------|
| T5_direct baseline | 29.24 | 60.30 | 41.15 |
| T5-large + Beam Search | 27.58 | 63.07 | 39.41 |
| **T5-base + Greedy (BEST)** | **51.41** | **70.50** | **30.14** |

**Key Innovations:**
- 2,041 compound tokens injected as atomic units (`brush_teeth`, `be_able_to`) - Embedding resize from mean/covariance
- Vocab-Constrained Decoding (VCD) with -10 soft penalty to prevent hallucination of non-ARASAAC English
- Handling OOV: Detroit → metropolis, Negation: cannot → be_able_to + not

**Dataset:** 59,278 train / 4,397 val / 4,306 test - ImageCLEF 2026 open-domain English + CommonVoice v15

---

## 🏗️ Architecture - Option C (Recommended for Final Review)

```
[User] 
  → Vercel Frontend (Next.js + Tailwind + Framer Motion) - Impressive UI
  → HF Spaces Backend (FastAPI Docker) - Free CPU 16GB RAM
      → T5-Base Model (from HF Hub: your-username/visualvoice-t5-base)
      → ARASAAC API (39k pictograms live fetch)
      → Gemini Flash Fallback (reserve, via GEMINI_API_KEY secret)
  → Returns: pictogram sequence + ARASAAC images
```

**Why Option C for 8GB RAM no GPU laptop:**
- Frontend dev only needs 500MB RAM - model runs on HF free CPU
- Vercel hosting looks professional (vs plain Gradio)
- Pluggable backend: MODEL_TYPE env var switches T5 / CLIP / Gemini without frontend change
- Future-proof for CLIP (your next step from PPT Slide 19)

---

## 📁 Project Structure

```
visualvoice/
├── backend/                 # FastAPI backend for HF Spaces Docker
│   ├── app.py              # Main API server
│   ├── model_manager.py    # Pluggable T5 / Mock / CLIP / Gemini
│   ├── arasaac.py          # ARASAAC pictogram fetcher
│   ├── gemini_fallback.py  # Gemini Flash reserve (free API)
│   ├── target_vocab.json   # 6,838 ARASAAC terms from train+valid
│   ├── requirements.txt
│   ├── Dockerfile          # For HF Spaces
│   └── .env.example
├── frontend/               # Next.js frontend for Vercel
│   ├── app/
│   │   ├── page.tsx        # Main impressive UI (Translator + Architecture + Results tabs)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── package.json
│   └── next.config.js
└── docs/
    └── DEPLOYMENT.md       # Detailed step-by-step guide
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- 8GB RAM laptop is enough (don't run T5-large locally, use HF Space URL)

### 1. Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt

# Option A: Use mock model (no download needed, for UI testing)
uvicorn app:app --reload --port 8000
# → http://localhost:8000/docs

# Option B: Use real model (after downloading from Kaggle)
export MODEL_PATH=./models/t5-base-picto
uvicorn app:app --reload --port 8000

# Option C: Use model from HF Hub (after pushing)
export HF_MODEL_ID=your-username/visualvoice-t5-base
uvicorn app:app --reload --port 8000
```

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# → http://localhost:3000
```

### 3. Test

Open http://localhost:3000, try:
- "The boy is eating an apple" → boy eat apple (reliable)
- "She lives in Detroit" → she live in metropolis (OOV handling)
- "you cannot know" → you be_able_to know not (negation)

---

## 🌐 Production Deployment (Final Review)

### Backend → Hugging Face Spaces (Free CPU)

1. Create Space: https://huggingface.co/new-space → SDK: Docker, Hardware: CPU basic
2. Copy backend files to Space repo
3. Set Secrets in Space Settings:
   - `HF_MODEL_ID` = `your-username/visualvoice-t5-base`
   - `MODEL_TYPE` = `t5`
   - `GEMINI_API_KEY` = `your_gemini_key` (optional reserve)
4. `git push` → Live at `https://YOUR_USERNAME-visualvoice-api.hf.space`
5. Test: `https://...hf.space/health` should show `T5Model` and `healthy`

See `docs/DEPLOYMENT.md` Part 3 for details.

### Frontend → Vercel (Free, Impressive)

1. Push frontend to GitHub
2. Import in Vercel: https://vercel.com/new
3. Set Env: `NEXT_PUBLIC_API_URL` = `https://YOUR_USERNAME-visualvoice-api.hf.space`
4. Deploy → Live at `https://visualvoice.vercel.app`

See `docs/DEPLOYMENT.md` Part 4 for details.

---

## 🔄 Model Swapping (Future-Proof)

Backend supports `MODEL_TYPE` env var:

| MODEL_TYPE | What happens | When to use |
|------------|--------------|-------------|
| `t5` (default) | Loads T5 from HF_MODEL_ID or MODEL_PATH, uses constrained beam search | **Current - your best 51.41 BLEU** |
| `mock` | Rule-based demo, no model needed | UI testing without downloading model |
| `gemini` | Calls Gemini 1.5 Flash API (free) | **Reserve when T5 accuracy low live** |
| `clip` (future) | CLIP retrieval over 39k ARASAAC images via FAISS | Your next step from PPT Slide 19 |

Change in HF Space Settings → Secrets → `MODEL_TYPE` → Space auto-restarts. **Frontend needs zero change.**

---

## 🔑 Gemini Fallback Reserve (Your Safety Net)

You wanted free API option kept in reserve for when T5 not working live.

**Get free key:** https://aistudio.google.com/app/apikey (60 req/min free)

**Enable:**

- HF Spaces: Settings → Secrets → `GEMINI_API_KEY` = your key
- Local: `export GEMINI_API_KEY=your_key` in backend/.env

**Use:** In frontend UI, select model dropdown → "Gemini Flash (Fallback Reserve)"

**Prompt:** We instruct Gemini to output ONLY ARASAAC vocab terms, handle OOV, negation, compound tokens - so output format matches T5, UI unchanged.

---

## 📥 What to Download from Kaggle

You ran notebook in Kaggle GPU, haven't downloaded models yet:

1. In Kaggle Notebook → Output panel → `models/t5-base-picto/` (or t5-large-picto)
2. Download all files: `config.json`, `pytorch_model.bin` (~800MB for base, ~3GB for large), `tokenizer.json`, `tokenizer_config.json`, `target_vocab.json`
3. Place in `backend/models/t5-base-picto/` locally, then push to HF Hub using script in `docs/DEPLOYMENT.md` Part 2

No need to download ARASAAC images - fetched live via API.

---

## 🎨 UI Features for Reviewers

- **Hero:** Animated stats (59k train, 6,838 vocab, 2,041 compounds), floating pictogram demo
- **Live Translator Tab:** Text input + mic (Web Speech API for Speech-to-Picto Task 2 bonus) + model selector + pictogram strip with real ARASAAC images + raw sequence
- **Architecture Tab:** Visual pipeline diagram from Review 3 + difficult cases handling + deployment architecture
- **Results Tab:** Metrics comparison table (29.24 → 51.41 BLEU), qualitative examples from PPT Slide 16, gap analysis vs 2024/2025 medical French tasks
- **Examples:** 7 curated examples from Review 3 with categories (success, OOV, negation, compound)

Design: Glass morphism, gradient text, framer-motion animations, shimmer loading, pictogram card hover effects - looks like startup product, not academic Gradio.

---

## 📊 Evaluation Metrics (from Review 3)

- **sacreBLEU:** Word/phrase overlap (51.41 - good >30)
- **METEOR:** Semantic similarity with synonyms (70.50 - good >40)
- **PictoER:** Pictogram Error Rate - insertions/deletions/substitutions (30.14 - lower better)

---

## 🔧 Troubleshooting

**Backend shows MockModel:**
- Check HF_MODEL_ID secret correct? Model repo exists?
- Check Space logs for download error
- Local: Does MODEL_PATH folder exist with pytorch_model.bin?

**ARASAAC images not loading:**
- API sometimes slow - frontend has text fallback
- Check browser console, try backend proxy: `/pictogram/{word}`

**Frontend offline:**
- Check NEXT_PUBLIC_API_URL env var in Vercel Settings
- Test backend health: `https://...hf.space/health`

See `docs/DEPLOYMENT.md` Part 8 for full troubleshooting.

---

## 💰 Cost

- HF Spaces CPU basic (16GB RAM): Free
- Vercel Hobby: Free
- Gemini Flash: Free (60 req/min)
- ARASAAC API: Free
- **Total: $0**

---

## 📚 References

- ImageCLEF toPicto 2024/2025/2026 Task Descriptions
- ARASAAC: https://arasaac.org
- Your Review 3 PPT and Report (in uploads/)

---

## 🚀 For Final Review Day

- [ ] Backend health: `...hf.space/health` → healthy, T5Model
- [ ] Frontend: Vercel URL works
- [ ] Test 3 examples live
- [ ] Backup video recorded
- [ ] Gemini fallback key configured, know how to switch
- [ ] Architecture tab ready to explain VCD + compound injection

Good luck! Your T5-base + Greedy with 51.41 BLEU is solid for open-domain 2026 task.

---

## 📝 License

MIT - Capstone Project VIT Chennai
