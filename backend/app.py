"""
VisualVoice - FastAPI Backend
Main API server for Text-to-Pictogram Translation
Pluggable architecture: T5 (current) | CLIP (future) | Gemini (fallback reserve)

Run locally: uvicorn app:app --reload --host 0.0.0.0 --port 8000
Deploy: Hugging Face Spaces Docker
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv()

from model_manager import get_model, reset_model, TARGET_VOCAB
from arasaac import batch_search_pictograms, search_pictogram
from gemini_fallback import translate_with_gemini, check_gemini_available

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VisualVoice API",
    description="An Intelligent Text-to-Pictogram Translation System for AAC - Capstone Project",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Allow frontend from Vercel and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set to your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class TranslateRequest(BaseModel):
    text: str
    model_type: Optional[str] = "auto"  # auto, t5, mock, gemini
    num_beams: Optional[int] = 6
    use_constrained: Optional[bool] = True
    include_images: Optional[bool] = True

class TranslateResponse(BaseModel):
    input: str
    pictograms: List[str]
    pictogram_details: Optional[List[Dict]] = None
    raw_output: Optional[str] = None
    model: str
    method: str
    num_tokens: int
    is_mock: Optional[bool] = False
    is_fallback: Optional[bool] = False

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_type: str
    vocab_size: int
    gemini_available: bool
    device: str

# Global state
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "VisualVoice API - Text-to-Pictogram Translation for AAC",
        "version": "1.0.0",
        "project": "BCSE497J Capstone - VIT Chennai",
        "team": ["Adithiyaa D (23BAI1038)", "Lakshhmi Narayanan T (23BAI1048)"],
        "guide": "Dr. Lekshmi K",
        "endpoints": {
            "translate": "POST /translate",
            "health": "GET /health",
            "models": "GET /models",
            "vocab": "GET /vocab",
            "docs": "GET /docs"
        },
        "frontend": "Deploy frontend on Vercel, point VITE_API_URL to this backend"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check with model status"""
    try:
        model = get_model()
        model_loaded = model is not None
        model_type = type(model).__name__
    except:
        model_loaded = False
        model_type = "none"
    
    return HealthResponse(
        status="healthy" if model_loaded else "degraded (using mock)",
        model_loaded=model_loaded,
        model_type=model_type,
        vocab_size=len(TARGET_VOCAB),
        gemini_available=check_gemini_available(),
        device=DEVICE
    )

@app.get("/models", tags=["Models"])
async def list_models():
    """List available model options"""
    return {
        "current_model": os.getenv("MODEL_TYPE", "auto"),
        "available_models": [
            {
                "id": "t5-base",
                "name": "T5-Base + Greedy (Best - 51.41 BLEU)",
                "description": "Your proposed architecture from Review 3, fine-tuned on ImageCLEF 2026",
                "status": "primary",
                "metrics": {"BLEU": 51.41, "METEOR": 70.50, "PictoER": 30.14}
            },
            {
                "id": "t5-large",
                "name": "T5-Large + Beam Search",
                "description": "Larger model, slower but potentially better",
                "status": "alternative",
                "metrics": {"BLEU": 27.58, "METEOR": 63.07, "PictoER": 39.41}
            },
            {
                "id": "clip",
                "name": "CLIP Retrieval (Future)",
                "description": "Image-grounded training - your next step from PPT Slide 19",
                "status": "future",
                "note": "Requires FAISS index of 39k ARASAAC images"
            },
            {
                "id": "gemini",
                "name": "Gemini 1.5 Flash (Fallback Reserve)",
                "description": "Free LLM API for when T5 accuracy is low - use only when absolutely needed",
                "status": "fallback_reserve",
                "available": check_gemini_available(),
                "note": "Set GEMINI_API_KEY in .env or HF Space Secrets to enable"
            },
            {
                "id": "mock",
                "name": "Mock Model (Demo)",
                "description": "Rule-based demo when real model weights not downloaded",
                "status": "demo"
            }
        ],
        "hf_model_id": os.getenv("HF_MODEL_ID", "not set - using local/mock"),
        "gemini_configured": check_gemini_available()
    }

@app.get("/vocab", tags=["Vocabulary"])
async def get_vocab(limit: int = Query(100, le=1000), search: Optional[str] = None):
    """Get target vocabulary"""
    vocab = TARGET_VOCAB
    if search:
        vocab = [v for v in vocab if search.lower() in v.lower()]
    
    return {
        "total_size": len(TARGET_VOCAB),
        "returned": len(vocab[:limit]),
        "vocab": vocab[:limit],
        "search": search
    }

@app.post("/translate", response_model=TranslateResponse, tags=["Translation"])
async def translate_text(request: TranslateRequest):
    """
    Main translation endpoint - Text to Pictogram Sequence
    Pluggable: will use T5 if available, else mock, or Gemini if requested
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(request.text) > 500:
        raise HTTPException(status_code=400, detail="Text too long (max 500 chars for demo)")
    
    logger.info(f"Translate request: '{request.text}' model_type={request.model_type}")
    
    try:
        # Check if user explicitly wants Gemini fallback (reserve option)
        if request.model_type == "gemini":
            if not check_gemini_available():
                raise HTTPException(
                    status_code=400, 
                    detail="Gemini API key not configured. Set GEMINI_API_KEY in .env or HF Space Secrets. Get free key at https://aistudio.google.com/app/apikey"
                )
            result = translate_with_gemini(request.text)
            
            # Fetch pictogram images
            pictogram_details = []
            if request.include_images and result.get("pictograms"):
                pictogram_details = await batch_search_pictograms(result["pictograms"])
            
            return TranslateResponse(
                input=result["input"],
                pictograms=result["pictograms"],
                pictogram_details=pictogram_details,
                raw_output=result.get("raw_output"),
                model=result["model"],
                method=result["method"],
                num_tokens=result["num_tokens"],
                is_mock=False,
                is_fallback=True
            )
        
        # Otherwise use primary model (T5 or mock)
        model = get_model(model_type=request.model_type)
        result = model.translate(
            request.text,
            num_beams=request.num_beams
        )
        
        # Fetch ARASAAC images for each pictogram
        pictogram_details = []
        if request.include_images and result.get("pictograms"):
            pictogram_details = await batch_search_pictograms(result["pictograms"])
        
        return TranslateResponse(
            input=result["input"],
            pictograms=result["pictograms"],
            pictogram_details=pictogram_details,
            raw_output=result.get("raw_output"),
            model=result["model"],
            method=result["method"],
            num_tokens=result["num_tokens"],
            is_mock=result.get("is_mock", False),
            is_fallback=result.get("is_fallback", False)
        )
        
    except Exception as e:
        logger.error(f"Translation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@app.post("/translate/gemini", tags=["Translation"])
async def translate_with_gemini_endpoint(request: TranslateRequest):
    """
    Explicit Gemini fallback endpoint - Your reserve option
    Use this when T5 model is not producing good output live
    """
    if not check_gemini_available():
        raise HTTPException(
            status_code=400,
            detail="GEMINI_API_KEY not set. Get free key at https://aistudio.google.com/app/apikey and set in HF Space Secrets"
        )
    
    result = translate_with_gemini(request.text)
    pictogram_details = []
    if request.include_images and result.get("pictograms"):
        pictogram_details = await batch_search_pictograms(result["pictograms"])
    
    return {
        **result,
        "pictogram_details": pictogram_details,
        "note": "This is fallback reserve - primary should be your T5 model"
    }

@app.get("/pictogram/{word}", tags=["Pictograms"])
async def get_pictogram(word: str):
    """Get single pictogram image and info"""
    result = await search_pictogram(word)
    if not result:
        raise HTTPException(status_code=404, detail=f"Pictogram not found for '{word}'")
    return result

@app.get("/examples", tags=["Examples"])
async def get_examples():
    """Get example sentences from your PPT for demo"""
    return {
        "examples": [
            {
                "text": "The boy is eating an apple",
                "expected": ["boy", "eat", "apple"],
                "category": "Simple SVO - Works reliably",
                "source": "Review 3 PPT - Success case"
            },
            {
                "text": "she finds herself also in the british isles",
                "expected": ["she", "locate", "in", "the", "islet", "Great_Britain"],
                "category": "Qualitative result - Success",
                "source": "common_voice_fr_19759450.mp3"
            },
            {
                "text": "he then became a horse trainer",
                "expected": ["past", "he", "later_on", "trainer", "by", "horse"],
                "category": "Qualitative result - Success",
                "source": "common_voice_fr_24814133.mp3"
            },
            {
                "text": "She lives in Detroit",
                "expected": ["she", "live", "in", "metropolis"],
                "category": "OOV Handling - Detroit -> metropolis",
                "source": "Review 3 - Difficult case"
            },
            {
                "text": "you cannot know",
                "expected": ["you", "be_able_to", "know", "not"],
                "category": "Negation & Modality",
                "source": "Review 3 - Difficult case"
            },
            {
                "text": "he brush teeth",
                "expected": ["he", "brush_teeth"],
                "category": "Multi-word concept - Compound token",
                "source": "Review 3 - Difficult case"
            },
            {
                "text": "there is now a bus station",
                "expected": ["there", "be", "now", "a", "bus_station"],
                "category": "Test set example",
                "source": "test.json"
            },
            {
                "text": "the commune of mahambo is located on the island of madagascar",
                "expected": ["the", "commune", "of", "mahambo", "be", "locate", "on", "the", "island", "of", "madagascar"],
                "category": "Complex sentence",
                "source": "test.json"
            }
        ]
    }

@app.post("/admin/reload-model", tags=["Admin"])
async def reload_model():
    """Reload model - useful after pushing new model to HF Hub"""
    reset_model()
    try:
        model = get_model()
        return {"status": "reloaded", "model_type": type(model).__name__}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

# For Hugging Face Spaces - health check
@app.get("/ping")
async def ping():
    return {"ping": "pong"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
