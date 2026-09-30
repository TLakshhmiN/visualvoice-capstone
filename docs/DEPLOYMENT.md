# VisualVoice - Complete Deployment Guide (Option C)
### Capstone Final Review - Step-by-Step for 8GB RAM Laptop (No GPU)

This guide covers everything from downloading your Kaggle model to hosting live.

---

## PART 0: What You Have Now

From your uploads:
- `train.json` (59,278 samples) - src: English, tgt: pictogram terms, pictos: ARASAAC IDs
- `valid.json`, `test.json`
- `Final_notebook_0_03116200_1790710689.pdf` - shows you trained `t5-large` for 15 epochs, got 27.26 BLEU, but your **best is T5-base + Greedy with 51.41 BLEU** (from PPT Slide 12, 15)
- Model output folder in Kaggle: `models/t5-large-picto` or `models/t5-base-picto`

Your Review 3 achievements:
- Baseline: T5_direct 29.24 BLEU
- Proposed Best: T5-base + Greedy 51.41 BLEU, 70.50 METEOR, 30.14 PictoER
- Key innovations: 2,041 compound tokens injection + Vocab-Constrained Decoding (VCD)

---

## PART 1: Download Your Model from Kaggle (CRITICAL - Do This First)

You said you ran notebook in Kaggle GPU and haven't downloaded models/output.

### Steps in Kaggle:

1. Go to your Kaggle Notebook (the one you ran Final_notebook)
2. On the right panel, click **"Output"** or **"Data"** -> you should see `/kaggle/working/models/t5-large-picto` or `t5-base-picto`
3. Click on the folder, then **Download as zip** or select all files and download.

### What files you MUST have (inside models/t5-xxx-picto/):

```
models/t5-base-picto/
├── config.json
├── pytorch_model.bin  OR  model.safetensors  (the big file ~800MB-3GB)
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
├── spiece.model (if T5)
├── generation_config.json
└── target_vocab.json  (6838 terms, we generated for you - but your Kaggle one has it too)
```

**If you trained both t5-base and t5-large, download BOTH.** But for final review, use **t5-base** as it's your best (51.41 BLEU).

### Verify download:

```bash
ls -lh models/t5-base-picto/
# Should be ~800MB for t5-base, ~3GB for t5-large
```

---

## PART 2: Push Model to Hugging Face Hub (For Free Hosting)

This solves your 8GB RAM / no GPU problem - model runs on HF's free CPU (16GB RAM).

### 2.1 Create HF account and token

1. Go to https://huggingface.co/join
2. After login, go to https://huggingface.co/settings/tokens -> Create new token (Write access)
3. Copy token.

### 2.2 Install and login locally (on your 8GB laptop - this is lightweight, no GPU needed)

```bash
pip install huggingface_hub
huggingface-cli login
# Paste your token
```

### 2.3 Push your model (run this in your project folder where models/ exists)

```python
# push_model.py
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from pathlib import Path

model_path = "models/t5-base-picto"  # or t5-large-picto if you want both
username = "YOUR_HF_USERNAME"  # replace

print(f"Loading from {model_path}...")
model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path)

repo_id = f"{username}/visualvoice-t5-base"
print(f"Pushing to {repo_id}...")

model.push_to_hub(repo_id)
tokenizer.push_to_hub(repo_id)

print(f"Done! Model at https://huggingface.co/{repo_id}")
```

Run:
```bash
python push_model.py
```

Now your model is at `https://huggingface.co/your-username/visualvoice-t5-base` and can be loaded anywhere without your laptop.

**Do this for both t5-base and t5-large if you have both.**

---

## PART 3: Backend - Host on Hugging Face Spaces (Free)

### 3.1 Create Space

1. Go to https://huggingface.co/new-space
2. Fill:
   - Space name: `visualvoice-api`
   - License: MIT
   - SDK: **Docker** (important! Not Gradio)
   - Hardware: **CPU basic** (free, 2 vCPU, 16GB RAM - enough for T5-base)
   - Visibility: Public

3. Clone it locally:

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/visualvoice-api
cd visualvoice-api
```

### 3.2 Copy backend files

Copy everything from `visualvoice/backend/` in this project to your cloned space folder:

```bash
cp -r /path/to/visualvoice/backend/* .
# Should have: app.py, model_manager.py, arasaac.py, gemini_fallback.py, requirements.txt, Dockerfile, target_vocab.json
```

### 3.3 Configure Secrets (IMPORTANT)

In your HF Space, go to **Settings -> Variables and Secrets**:

Add these **Secrets** (not Variables):

- `HF_MODEL_ID` = `your-username/visualvoice-t5-base`  (the repo you pushed in Part 2)
- `MODEL_TYPE` = `t5`
- `GEMINI_API_KEY` = `your_gemini_key` (optional, reserve only - see Part 5)

### 3.4 Push to HF Space

```bash
git add .
git commit -m "Deploy VisualVoice backend with T5-base + Gemini fallback"
git push
```

HF will automatically build Docker image and deploy. Wait 2-5 mins. Check logs in Space.

Your backend will be live at: `https://YOUR_USERNAME-visualvoice-api.hf.space`

Test: `https://YOUR_USERNAME-visualvoice-api.hf.space/health` should return `{"status": "healthy", ...}`

And docs at: `https://YOUR_USERNAME-visualvoice-api.hf.space/docs`

### If model too large (T5-XXL 11GB):

In Space Settings -> Hardware, upgrade to **T4 small** (free tier includes some hours) or **A10G small** (paid $0.60/hr). No code change needed.

---

## PART 4: Frontend - Host on Vercel (Free, Impressive)

### 4.1 Prepare frontend

```bash
cd visualvoice/frontend
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=https://YOUR_USERNAME-visualvoice-api.hf.space
```

Test locally (works on 8GB laptop - only frontend dev server, no model):

```bash
npm run dev
# Open http://localhost:3000
```

You should see impressive UI. If backend not yet deployed, it will show "offline" but UI still works with mock.

### 4.2 Deploy to Vercel

1. Go to https://vercel.com/signup - login with GitHub
2. Install Vercel CLI (optional):

```bash
npm i -g vercel
```

**Option A: Via GitHub (Recommended)**

- Push your `frontend/` folder to GitHub repo
- In Vercel dashboard -> Add New Project -> Import from GitHub
- Set:
  - Framework: Next.js
  - Root Directory: `frontend` (if monorepo)
  - Env Variable: `NEXT_PUBLIC_API_URL` = `https://YOUR_USERNAME-visualvoice-api.hf.space`
- Deploy

**Option B: Via CLI (Quick)**

```bash
cd frontend
vercel
# Follow prompts, set env variable when asked
vercel --prod
```

Your frontend live at: `https://visualvoice-frontend.vercel.app` (or custom name)

### 4.3 Final Check

- Frontend loads with hero, stats, translator
- Backend health shows `T5Model` not `MockModel` (means real model loaded)
- Try example: "The boy is eating an apple" -> should get boy eat apple with ARASAAC images

---

## PART 5: Gemini Fallback Reserve (Your Safety Net)

You said: "keep an option in backend where I can use free api for some ai model like gemini... keep it in reserve for me to use only when absolutely needed"

### 5.1 Get Free Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key** (free tier: 60 requests/min, more than enough for demo)
3. Copy key.

### 5.2 Enable in Backend (2 ways)

**If backend already on HF Spaces:**

- Go to Space Settings -> Variables and Secrets -> New Secret
- Name: `GEMINI_API_KEY`, Value: your key
- Space will auto-restart (30 sec)

**If running locally:**

Create `backend/.env`:

```
GEMINI_API_KEY=your_key_here
HF_MODEL_ID=your-username/visualvoice-t5-base
```

### 5.3 How to use live during final review (if T5 fails)

In your frontend UI, there's a dropdown: **Model selector** -> Choose `Gemini Flash (Fallback Reserve)`.

- Primary: T5-Base (your work)
- Reserve: Gemini Flash (free, better accuracy if needed)

Explain to reviewers: "Primary is our fine-tuned T5 with 51.41 BLEU and VCD. We have Gemini as fallback reserve for robustness, configured via env variable, showing pluggable architecture for future CLIP integration."

This shows forward-thinking and impresses reviewers.

### Gemini Prompt we use (from backend/gemini_fallback.py):

We instruct Gemini to only output ARASAAC vocab terms, handle OOV like Detroit -> metropolis, handle negation, use compound tokens. So output format stays same as T5, frontend doesn't change.

---

## PART 6: Running Project After Building (Complete Steps)

### For Development (on your 8GB laptop):

**Terminal 1 - Backend (optional, can use HF Space URL instead):**

```bash
cd visualvoice/backend
pip install -r requirements.txt

# If you have model locally:
export MODEL_PATH=./models/t5-base-picto
# Or if using HF Hub:
export HF_MODEL_ID=your-username/visualvoice-t5-base
# Optional Gemini:
export GEMINI_API_KEY=your_key

uvicorn app:app --reload --port 8000
# Backend at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**Terminal 2 - Frontend:**

```bash
cd visualvoice/frontend
npm install
# Set API URL to local or HF Space
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
# Or for HF Space:
# echo "NEXT_PUBLIC_API_URL=https://YOUR_USERNAME-visualvoice-api.hf.space" > .env.local

npm run dev
# Frontend at http://localhost:3000
```

### For Production (Final Review):

- Frontend: `https://your-project.vercel.app` (Vercel auto-deploys on git push)
- Backend: `https://YOUR_USERNAME-visualvoice-api.hf.space` (HF auto-deploys on git push)
- No need to run anything locally on demo day - just open Vercel URL!

### Demo Day Checklist:

- [ ] Backend health check: `https://...hf.space/health` shows `model_type: T5Model` and `status: healthy`
- [ ] Frontend loads: Vercel URL works
- [ ] Test 3 examples: "The boy is eating an apple", "She lives in Detroit", "you cannot know"
- [ ] Have backup: Recorded video of it working (in case WiFi fails)
- [ ] Have fallback: Gemini API key configured, know how to switch model dropdown
- [ ] Slides ready: Show architecture diagram from frontend Architecture tab

---

## PART 7: Future Updates (CLIP Model)

When you want to switch to CLIP (from PPT Slide 19):

1. **Build FAISS index** (one-time):

```python
# build_clip_index.py (we will provide later)
# Downloads 39k ARASAAC images, encodes with CLIP, saves to arasaac_clip_index.faiss
```

2. **Upload index to HF Hub** or include in Space (large file - use Git LFS)

3. **Change env var** in HF Space: `MODEL_TYPE=clip`

4. **No frontend change** - same `/translate` endpoint returns pictograms.

Backend already has pluggable structure for this.

---

## PART 8: Troubleshooting

**Backend shows MockModel not T5Model:**
- Did you push model to HF Hub? Check HF_MODEL_ID secret correct?
- Check Space logs: Did model download fail due to size? Try T4 hardware.
- Local: Does MODEL_PATH exist and contain pytorch_model.bin?

**ARASAAC images not loading:**
- ARASAAC API sometimes slow. Frontend has fallback to text. Check browser console.
- CORS: We proxy via backend `/pictogram/{word}` which fetches server-side, so should work.

**Vercel frontend shows offline:**
- Check NEXT_PUBLIC_API_URL env var in Vercel dashboard -> Settings -> Environment Variables
- Redeploy after changing env var.

**Gemini fallback says not configured:**
- Set GEMINI_API_KEY secret in HF Space, not variable. Restart space.

**8GB laptop slow:**
- Don't run backend locally with T5-large (3GB) - use HF Space URL for frontend dev. Frontend only needs 500MB RAM.

---

## Summary of What to Download

1. **From Kaggle:** `models/t5-base-picto/` folder (config, tokenizer, pytorch_model.bin, target_vocab.json) - ~800MB
2. **From this project:** `visualvoice/` folder (frontend + backend) - we built for you
3. **No need to download ARASAAC images** - fetched live via API

---

## Cost

- Hugging Face Spaces CPU basic: **Free forever** (16GB RAM)
- Vercel Hobby: **Free forever** (100GB bandwidth)
- Gemini Flash API: **Free** (60 req/min)
- ARASAAC API: **Free**
- Total: **$0**

---

## Need Help?

- Check backend docs: `https://YOUR_SPACE.hf.space/docs`
- Check health: `https://YOUR_SPACE.hf.space/health`
- Frontend env: `NEXT_PUBLIC_API_URL` must be backend URL

Good luck for final review! Your 51.41 BLEU with T5-base + Greedy + VCD is solid for open-domain 2026 task.
