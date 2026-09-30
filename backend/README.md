# VisualVoice Backend - Hugging Face Spaces

This is the backend for VisualVoice - Text-to-Pictogram Translation for AAC.

## Deploy to Hugging Face Spaces (Docker)

This folder is ready to be pushed to a Hugging Face Space with Docker SDK.

### Steps:

1. Create Space: https://huggingface.co/new-space
   - SDK: Docker
   - Hardware: CPU basic (free, 16GB RAM) - enough for T5-base
   - Public

2. Clone and copy:
```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/visualvoice-api
cd visualvoice-api
cp -r /path/to/backend/* .
```

3. Set Secrets in Space Settings -> Variables and Secrets:
   - `HF_MODEL_ID` = `your-username/visualvoice-t5-base` (model pushed to HF Hub)
   - `MODEL_TYPE` = `t5`
   - `GEMINI_API_KEY` = `your_gemini_key` (optional, for fallback reserve)

4. Push:
```bash
git add .
git commit -m "Deploy VisualVoice backend"
git push
```

Space will build and deploy automatically. Live at `https://YOUR_USERNAME-visualvoice-api.hf.space`

### Endpoints:

- `GET /` - Root info
- `GET /health` - Health check with model status
- `POST /translate` - Main translation: {text, model_type, num_beams, include_images}
- `GET /models` - List available models
- `GET /vocab` - Get target vocab
- `GET /examples` - Get demo examples from Review 3
- `GET /docs` - Swagger docs

### Environment Variables:

- `HF_MODEL_ID` - HF Hub model ID (e.g., your-username/visualvoice-t5-base)
- `MODEL_PATH` - Local path to model (e.g., ./models/t5-base-picto)
- `MODEL_TYPE` - t5, mock, gemini, clip
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` - For Gemini fallback reserve (free at https://aistudio.google.com/app/apikey)
- `PORT` - Default 7860 for HF Spaces, 8000 locally

### Local Development:

```bash
pip install -r requirements.txt
export HF_MODEL_ID=your-username/visualvoice-t5-base
# or
export MODEL_PATH=./models/t5-base-picto
# optional Gemini fallback
export GEMINI_API_KEY=your_key

uvicorn app:app --reload --port 8000
# Docs at http://localhost:8000/docs
```

### Model Loading Priority:

1. `MODEL_PATH` if exists locally
2. `HF_MODEL_ID` if set (downloads from HF Hub)
3. Tries local paths: models/t5-base-picto, models/t5-large-picto
4. Falls back to MockModel (rule-based demo)

### Pluggable Architecture:

- `T5Model` - Your current best (51.41 BLEU) - T5-base + Greedy + VCD
- `MockModel` - Demo without weights, uses simple heuristics
- `Gemini Fallback` - Free LLM API, reserve option
- `CLIP` (future) - Add FAISS index for retrieval

Change via `MODEL_TYPE` env var, no code change needed.

### ARASAAC Integration:

Fetches pictogram images live from `https://static.arasaac.org/pictograms/{id}/{id}_500.png`
via search API `https://api.arasaac.org/api/pictograms/en/search/{word}`

### For Large Models (T5-XXL 11GB):

If model too large for CPU basic (16GB RAM), upgrade Space hardware:
- Settings -> Hardware -> T4 small (free tier includes hours) or A10G small ($0.60/hr)
- No code change needed.
