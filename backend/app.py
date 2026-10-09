"""
Render Proxy Backend - No model loading, just proxy to HF Gradio T5 Space
This works on Render Free 512MB RAM because it doesn't load T5 model
- Vercel frontend -> Render proxy (512MB, no model) -> HF Gradio Space T5 (16GB RAM)
- Fixes CORS and Gradio 405 errors by calling HF Space server-side via gradio_client
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VisualVoice Proxy API",
    description="Proxy to HF Gradio T5 Space - Works on Render Free 512MB",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_SPACE_URL = os.getenv("HF_SPACE_URL", "https://lakshhminarayanan-visualvoice-api.hf.space")
HF_MODEL_ID = os.getenv("HF_MODEL_ID", "LakshhmiNarayanan/visualvoice-t5-base")

class TranslateRequest(BaseModel):
    text: str
    model_type: Optional[str] = "auto"
    num_beams: Optional[int] = 6
    use_constrained: Optional[bool] = True
    include_images: Optional[bool] = False

# Try to import gradio_client for calling HF Space
try:
    from gradio_client import Client
    GRADIO_CLIENT_AVAILABLE = True
    logger.info("gradio_client available")
except ImportError:
    GRADIO_CLIENT_AVAILABLE = False
    logger.warning("gradio_client not available, will use direct HTTP")

# Fallback: direct model loading if HF Space unreachable and we have RAM (for paid Render)
# But for free 512MB, we avoid loading model
try:
    from model_manager import get_model, TARGET_VOCAB
    MODEL_MANAGER_AVAILABLE = True
except:
    MODEL_MANAGER_AVAILABLE = False
    TARGET_VOCAB = []

def translate_via_gradio_client(text: str, model_type: str = "auto"):
    """Call HF Gradio Space via gradio_client library (server-side, no CORS)"""
    if not GRADIO_CLIENT_AVAILABLE:
        raise Exception("gradio_client not installed")
    
    try:
        client = Client(HF_SPACE_URL)
        # Gradio Space has translate function that takes text and model_type
        # fn_index 0 is translate function
        result = client.predict(text, model_type, fn_index=0)
        # result is [formatted_text, pictos_list] or similar
        # Our HF Space returns [text, images] where images is list of [url, word] or words
        if isinstance(result, (list, tuple)) and len(result) >= 2:
            formatted, pictos_data = result[0], result[1]
            pictograms = []
            if isinstance(pictos_data, list):
                if len(pictos_data) > 0 and isinstance(pictos_data[0], (list, tuple)):
                    pictograms = [item[1] if len(item) > 1 else item[0] for item in pictos_data]
                else:
                    pictograms = [p for p in pictos_data if isinstance(p, str)]
            else:
                # Parse from formatted text
                if "→" in str(formatted):
                    # Extract cleaned AAC part if exists
                    if "Cleaned AAC:" in str(formatted):
                        cleaned_part = str(formatted).split("Cleaned AAC:")[1].split("\n")[0]
                        pictograms = [p.strip() for p in cleaned_part.split("→") if p.strip()]
                    else:
                        pictograms = [p.strip() for p in str(formatted).split("→") if p.strip()]
            
            return {
                "input": text,
                "pictograms": pictograms,
                "raw_output": str(formatted),
                "model": f"hf-gradio-t5-{model_type}",
                "method": "gradio_client_proxy",
                "num_tokens": len(pictograms)
            }
        else:
            raise Exception(f"Unexpected Gradio result format: {result}")
            
    except Exception as e:
        logger.error(f"Gradio client failed: {e}")
        raise

def translate_via_direct_model(text: str):
    """Fallback: load model directly if gradio_client fails and we have RAM"""
    if not MODEL_MANAGER_AVAILABLE:
        raise Exception("model_manager not available")
    
    model = get_model()
    result = model.translate(text)
    return result

@app.get("/")
async def root():
    return {
        "message": "VisualVoice Proxy API - Render Free 512MB -> HF Gradio T5 16GB",
        "version": "2.0.0",
        "hf_space_url": HF_SPACE_URL,
        "hf_model_id": HF_MODEL_ID,
        "gradio_client_available": GRADIO_CLIENT_AVAILABLE,
        "endpoints": {
            "translate": "POST /translate",
            "health": "GET /health",
            "docs": "GET /docs"
        }
    }

@app.get("/health")
async def health_check():
    # Don't load model here, just check if proxy can reach HF Space
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Check if HF Space is reachable
            resp = await client.get(f"{HF_SPACE_URL}/", timeout=5.0)
            hf_reachable = resp.status_code == 200
    except:
        hf_reachable = False
    
    return {
        "status": "healthy",
        "proxy": "render-free-512mb",
        "hf_space_url": HF_SPACE_URL,
        "hf_space_reachable": hf_reachable,
        "gradio_client_available": GRADIO_CLIENT_AVAILABLE,
        "model_manager_available": MODEL_MANAGER_AVAILABLE,
        "vocab_size": len(TARGET_VOCAB) if TARGET_VOCAB else 6838,
        "note": "This proxy doesn't load T5 model, it calls HF Gradio Space which has 16GB RAM and T5"
    }

@app.post("/translate")
async def translate_text(request: TranslateRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Try Gradio client first (calls HF Space T5 - works on free RAM)
    if GRADIO_CLIENT_AVAILABLE:
        try:
            result = translate_via_gradio_client(request.text, request.model_type)
            return result
        except Exception as e:
            logger.warning(f"Gradio client failed, trying direct model: {e}")
    
    # Fallback to direct model if available (needs more RAM, for paid Render)
    if MODEL_MANAGER_AVAILABLE:
        try:
            result = translate_via_direct_model(request.text)
            return result
        except Exception as e:
            logger.error(f"Direct model failed: {e}")
    
    # Final fallback - mock
    words = request.text.lower().split()
    pictograms = [w for w in words if len(w) > 2][:10]  # No 5 limit, up to 10
    
    return {
        "input": request.text,
        "pictograms": pictograms,
        "raw_output": " → ".join(pictograms),
        "model": "mock-proxy-fallback",
        "method": "mock",
        "num_tokens": len(pictograms),
        "is_mock": True,
        "note": "Both Gradio client and direct model failed, using mock. Check HF_SPACE_URL and HF_MODEL_ID"
    }

@app.get("/ping")
async def ping():
    return {"ping": "pong"}
