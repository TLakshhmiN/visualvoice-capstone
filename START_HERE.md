# START HERE - VisualVoice Capstone Final Review
## Read this first - 10 min setup guide

### You asked: Build UI for Review 3, tell what to download, detailed steps, error-free, attractive, future-proof, with Gemini reserve.

### ✅ What I Built For You (Option C)

1. **Frontend (Vercel)**: Next.js 14 + Tailwind + Framer Motion - Looks like a startup product, not Gradio. Has 3 tabs: Live Translator, Architecture, Results.
2. **Backend (HF Spaces Docker)**: FastAPI with pluggable models - T5 (your current best), Mock (for demo without model), Gemini Flash (reserve free API), CLIP (future ready).
3. **Docs**: Complete deployment guide with what to download from Kaggle.

**Build Status:** ✅ Frontend builds successfully (48.6 kB), Backend syntax OK, Ready to deploy.

---

## 📥 STEP 0: What You Need to Download (You haven't yet)

You ran notebook in Kaggle GPU. You need to download model output.

### In Kaggle:

1. Open your Kaggle Notebook (Final_notebook)
2. Right side panel -> Output -> Find `models/t5-large-picto` or `models/t5-base-picto`
3. Click Download (or select files -> Download as zip)

### Required files (inside folder):

```
models/t5-base-picto/
├── config.json
├── pytorch_model.bin  (or model.safetensors)  <- BIG file 800MB for base, 3GB for large
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
├── generation_config.json
└── target_vocab.json (if not there, we generated one for you: backend/target_vocab.json with 6838 terms)
```

**Your BEST model per PPT Slide 15 is T5-base + Greedy: 51.41 BLEU, 70.50 METEOR, 30.14 PictoER.** So prioritize downloading `t5-base-picto` if you have it. If you only have `t5-large-picto`, that's okay (27.58 BLEU) but try to retrain t5-base quickly or use Gemini fallback.

**Where to place after download:**

```
visualvoice/
├── backend/
│   ├── models/
│   │   └── t5-base-picto/  <- Put here
│   │       ├── config.json
│   │       └── pytorch_model.bin etc
```

---

## 🚀 STEP 1: Push Model to Hugging Face Hub (Solves 8GB RAM problem)

This is CRITICAL - Your laptop has no GPU, 8GB RAM can't run T5-large reliably. Push to HF Hub so it runs on HF free CPU (16GB RAM).

### 1.1 Create HF account

- https://huggingface.co/join
- After login: https://huggingface.co/settings/tokens -> New token -> Write access -> Copy token

### 1.2 Login locally (lightweight, no GPU needed)

```bash
pip install huggingface_hub
huggingface-cli login
# Paste token
```

### 1.3 Push model (edit file first!)

Open `visualvoice/push_model_to_hf.py`, change:

```python
HF_USERNAME = "YOUR_HF_USERNAME"  # <- Your HF username
MODEL_LOCAL_PATH = "backend/models/t5-base-picto"
```

Then run:

```bash
cd visualvoice
python push_model_to_hf.py
```

Result: Model live at `https://huggingface.co/YOUR_USERNAME/visualvoice-t5-base`

**Do this for both base and large if you have both.**

---

## 🔧 STEP 2: Backend to Hugging Face Spaces (Free)

### 2.1 Create Space

- https://huggingface.co/new-space
- Name: `visualvoice-api`
- SDK: **Docker** (NOT Gradio!)
- Hardware: **CPU basic** (free, 16GB RAM)
- Public

### 2.2 Clone and copy

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/visualvoice-api
cd visualvoice-api
cp -r /path/to/visualvoice/backend/* .
# Check: ls should show app.py, Dockerfile, requirements.txt, target_vocab.json etc
```

### 2.3 Set Secrets (IMPORTANT - In HF Space UI)

Go to your Space -> Settings -> Variables and Secrets -> Add Secret:

- `HF_MODEL_ID` = `YOUR_USERNAME/visualvoice-t5-base` (from Step 1)
- `MODEL_TYPE` = `t5`
- `GEMINI_API_KEY` = (optional, for reserve - see Step 4)

### 2.4 Push

```bash
git add .
git commit -m "Deploy VisualVoice backend"
git push
```

Wait 3-5 mins for build. Check logs.

**Test:** Open `https://YOUR_USERNAME-visualvoice-api.hf.space/health`

Should show:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_type": "T5Model",
  "vocab_size": 6838,
  "device": "cpu"
}
```

If shows `MockModel`, then HF_MODEL_ID wrong or model not pushed.

Docs: `https://YOUR_USERNAME-visualvoice-api.hf.space/docs`

---

## 🎨 STEP 3: Frontend to Vercel (Free, Impressive)

### 3.1 Local test (works on 8GB laptop)

```bash
cd visualvoice/frontend
npm install
echo "NEXT_PUBLIC_API_URL=https://YOUR_USERNAME-visualvoice-api.hf.space" > .env.local
# Or for local backend testing:
# echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
# Open http://localhost:3000
```

You should see impressive UI with hero, stats, translator.

### 3.2 Deploy to Vercel

**Option A - GitHub (Recommended):**

1. Push `frontend/` to GitHub repo
2. https://vercel.com/new -> Import GitHub repo
3. Settings:
   - Framework: Next.js
   - Root Directory: `frontend` (if monorepo, set it)
   - Env Variable: `NEXT_PUBLIC_API_URL` = `https://YOUR_USERNAME-visualvoice-api.hf.space`
4. Deploy -> Live at `https://visualvoice.vercel.app`

**Option B - CLI:**

```bash
cd frontend
npm i -g vercel
vercel
# Follow prompts, set env var
vercel --prod
```

**Final URL:** `https://your-project.vercel.app` - This is what you show in final review!

---

## 🔑 STEP 4: Gemini Fallback Reserve (Your Safety Net)

You wanted free API option kept in reserve when T5 accuracy low live.

### Get free key (60 req/min free):

1. https://aistudio.google.com/app/apikey
2. Create API Key -> Copy

### Enable:

- **HF Spaces:** Settings -> Secrets -> New Secret -> `GEMINI_API_KEY` = your key -> Space auto-restarts
- **Local:** `export GEMINI_API_KEY=your_key` in backend/.env

### Use live during review:

In frontend UI -> Model selector dropdown -> Choose **"Gemini Flash (Fallback Reserve)"**

Explain to reviewers: "Primary is our fine-tuned T5 with 51.41 BLEU and VCD. Gemini is reserve for robustness, showing pluggable architecture for future CLIP."

Our backend prompt for Gemini instructs it to output ONLY ARASAAC vocab terms, handle OOV Detroit->metropolis, negation, compound tokens - so UI unchanged.

---

## 🧪 STEP 5: Final Review Demo Flow (Impress Reviewers)

### Opening:

"VisualVoice is Text-to-Pictogram for AAC, ImageCLEF 2026 Task 1. We benchmarked 6 models, best is T5-base + Greedy with 51.41 BLEU vs baseline 29.24. Key innovations: 2,041 compound tokens injection + Vocab-Constrained Decoding."

Show Architecture tab in UI.

### Live Demo (use these in order):

1. **"The boy is eating an apple"** -> boy eat apple (✓ reliable, from PPT)
2. **"She lives in Detroit"** -> she live in metropolis (OOV handling)
3. **"you cannot know"** -> you be_able_to know not (negation handling)
4. **"he brush teeth"** -> he brush_teeth (compound token)

Show pictogram images loading from ARASAAC API.

### Metrics:

Show Results tab: 51.41 BLEU, 70.50 METEOR, 30.14 PictoER. Explain gap vs 2024/2025 French medical tasks (74 BLEU) because 2026 is open-domain English with many OOV names - exactly where CLIP future work helps.

### Deployment:

"We deployed Option C: Vercel frontend (impressive UI) + HF Spaces backend (free CPU 16GB RAM) - works on 8GB laptop no GPU. Pluggable backend supports T5/CLIP/Gemini via MODEL_TYPE env var - future-proof."

### Backup:

Have video recording of demo working, in case WiFi fails.

---

## 📂 Project Files You Have Now

```
visualvoice/
├── START_HERE.md (this file)
├── README.md (overview)
├── push_model_to_hf.py (script to push Kaggle model to HF Hub)
├── backend/
│   ├── app.py (main FastAPI, 5 endpoints)
│   ├── model_manager.py (pluggable T5/Mock/CLIP/Gemini, VCD)
│   ├── arasaac.py (ARASAAC API fetcher)
│   ├── gemini_fallback.py (Gemini reserve)
│   ├── target_vocab.json (6838 terms)
│   ├── requirements.txt
│   ├── Dockerfile (for HF Spaces)
│   └── .env.example
├── frontend/
│   ├── app/page.tsx (impressive UI - 600+ lines, 3 tabs)
│   ├── app/layout.tsx
│   ├── app/globals.css (glass morphism, gradients)
│   ├── package.json
│   └── .env.example
└── docs/
    └── DEPLOYMENT.md (detailed 8-part guide)
```

**Build verified:** Frontend `npm run build` ✓ 48.6 kB, Backend syntax OK ✓

---

## ❓ FAQ

**Q: Model size? Will Option C work if I change to CLIP?**
A: Yes! Frontend never talks to model directly, only to backend POST /translate. Change MODEL_TYPE env var in HF Space from t5 to clip to gemini - frontend unchanged. For large models (T5-XXL 11GB), upgrade HF Space hardware from CPU basic to T4 small (1-click, no code change).

**Q: What if T5 accuracy low live?**
A: Use Gemini fallback reserve - select in UI dropdown. It's free and better accuracy. Keep as reserve as you wanted.

**Q: My laptop 8GB RAM, no GPU - can I run locally?**
A: Don't run T5-large locally (3GB). Use HF Space URL for frontend dev - frontend only needs 500MB RAM. For local backend testing, MockModel works without any model file.

**Q: What to show if backend offline?**
A: Frontend works with MockModel showing UI flow. But for final review, ensure HF Space health shows T5Model.

**Q: Cost?**
A: $0 - HF Spaces free, Vercel free, Gemini free, ARASAAC free.

---

## ✅ Checklist Before Final Review

- [ ] Downloaded `models/t5-base-picto/` from Kaggle (config.json + pytorch_model.bin)
- [ ] Pushed to HF Hub via `push_model_to_hf.py`
- [ ] Backend Space deployed, `/health` shows `T5Model` and `healthy`
- [ ] Frontend deployed to Vercel, env var points to HF Space URL
- [ ] Tested 3 examples live
- [ ] Gemini API key configured as reserve, tested switching
- [ ] Backup video recorded
- [ ] Architecture and Results tabs ready to explain

---

## 🆘 If Stuck

- Backend docs: `https://YOUR_SPACE.hf.space/docs`
- Health: `https://YOUR_SPACE.hf.space/health`
- Frontend env var must be backend URL
- See `docs/DEPLOYMENT.md` Part 8 Troubleshooting

Good luck! Your 51.41 BLEU with T5-base + Greedy + VCD is solid for open-domain 2026.

---

## 📞 Next Steps

1. Download model from Kaggle (Step 0)
2. Push to HF Hub (Step 1)
3. Deploy backend to HF Spaces (Step 2)
4. Deploy frontend to Vercel (Step 3)
5. Configure Gemini reserve (Step 4)
6. Practice demo flow (Step 5)

You have everything needed. The UI is built to be attractive, elegant, and understandable for reviewers.

Let's make your capstone shine! 🚀
