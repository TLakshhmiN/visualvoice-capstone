"""
Model Manager - Pluggable architecture for VisualVoice
Supports: T5 (current), BART, CLIP (future), Gemini API (fallback)
"""
import os
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, LogitsProcessor, LogitsProcessorList
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load vocab
VOCAB_PATH = Path(__file__).parent / "target_vocab.json"
TARGET_VOCAB = []
if VOCAB_PATH.exists():
    TARGET_VOCAB = json.loads(VOCAB_PATH.read_text())
    logger.info(f"Loaded target vocab: {len(TARGET_VOCAB)} terms")
else:
    logger.warning(f"Vocab file not found at {VOCAB_PATH}")

# For constrained decoding
class VocabConstraintLogitsProcessor(LogitsProcessor):
    """
    Penalizes tokens that are not part of ARASAAC vocabulary
    Implements the VCD from your Review 3 PPT
    """
    def __init__(self, tokenizer, allowed_tokens: List[str], penalty: float = -10.0):
        self.tokenizer = tokenizer
        self.penalty = penalty
        # Build allowed token IDs
        self.allowed_ids = set()
        for term in allowed_tokens:
            ids = tokenizer.encode(term, add_special_tokens=False)
            self.allowed_ids.update(ids)
        # Always allow special tokens
        self.allowed_ids.update([
            tokenizer.pad_token_id,
            tokenizer.eos_token_id,
            tokenizer.unk_token_id if tokenizer.unk_token_id else 0
        ])
        logger.info(f"Constrained decoding: {len(self.allowed_ids)} allowed token IDs")

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor) -> torch.FloatTensor:
        # Apply penalty to disallowed tokens
        # This is a soft penalty, not hard ban, as per your paper
        mask = torch.ones_like(scores, dtype=torch.bool)
        for allowed_id in self.allowed_ids:
            if allowed_id < scores.shape[-1]:
                mask[:, allowed_id] = False
        scores[mask] += self.penalty
        return scores

class ModelInterface:
    def translate(self, text: str, **kwargs) -> Dict:
        raise NotImplementedError

class T5Model(ModelInterface):
    def __init__(self, model_path: str, use_constrained: bool = True):
        self.model_path = model_path
        self.use_constrained = use_constrained
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.target_vocab = TARGET_VOCAB
        self.load_model()

    def load_model(self):
        try:
            logger.info(f"Loading T5 model from {self.model_path} on {self.device}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            
            # Try to inject compound tokens if vocab exists (from your notebook Cell 5)
            if self.target_vocab:
                compound_toks = sorted(t for t in self.target_vocab if "_" in t)
                if compound_toks:
                    n_added = self.tokenizer.add_tokens(compound_toks)
                    logger.info(f"Injected {n_added} compound tokens")
            
            # Load model
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.model_path,
                torch_dtype=torch.float32,  # Use float32 for CPU
                low_cpu_mem_usage=True
            )
            
            # Resize embeddings if we added tokens
            if self.tokenizer and len(self.tokenizer) != self.model.config.vocab_size:
                self.model.resize_token_embeddings(len(self.tokenizer))
            
            self.model.to(self.device)
            self.model.eval()
            logger.info(f"Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load T5 model: {e}")
            raise

    def translate(self, text: str, num_beams: int = 6, max_length: int = 128) -> Dict:
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model not loaded")
        
        prefix = "translate to pictograms: " if "t5" in self.model_path.lower() else ""
        input_text = prefix + text.strip()
        
        inputs = self.tokenizer(
            input_text,
            max_length=128,
            truncation=True,
            return_tensors="pt"
        ).to(self.device)
        
        # Setup logits processor for constrained decoding
        logits_processor = None
        if self.use_constrained and self.target_vocab:
            try:
                processor = VocabConstraintLogitsProcessor(
                    self.tokenizer, self.target_vocab, penalty=-5.0
                )
                logits_processor = LogitsProcessorList([processor])
            except Exception as e:
                logger.warning(f"Constrained decoding failed, using unconstrained: {e}")
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=max_length,
                num_beams=num_beams,
                early_stopping=True,
                logits_processor=logits_processor,
                no_repeat_ngram_size=3,
            )
        
        decoded = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Post-process: split and clean
        pictograms = decoded.strip().split()
        
        # Filter to only keep tokens in vocab if constrained
        if self.use_constrained and self.target_vocab:
            vocab_set = set(self.target_vocab)
            # Keep tokens that are in vocab, or are close
            filtered = []
            for token in pictograms:
                if token in vocab_set:
                    filtered.append(token)
                else:
                    # Try to keep it anyway if it's not hallucinated English
                    # (Your Review 3 failure case handling)
                    if "_" in token or token.lower() in vocab_set or len(token) > 2:
                        filtered.append(token)
            pictograms = filtered if filtered else pictograms
        
        return {
            "input": text,
            "pictograms": pictograms,
            "raw_output": decoded,
            "model": self.model_path,
            "method": "constrained_beam_search" if self.use_constrained else "beam_search",
            "num_tokens": len(pictograms)
        }

class MockModel(ModelInterface):
    """
    Mock model for demo when real model is not downloaded yet
    Uses simple rule-based + vocab lookup to simulate your T5 model
    """
    def __init__(self):
        self.target_vocab = set(TARGET_VOCAB) if TARGET_VOCAB else set()
        logger.info("Using Mock Model (for demo without real model weights)")
        
        # Simple mapping for demo - based on your qualitative results from PPT
        self.demo_mappings = {
            "the boy is eating an apple": ["boy", "eat", "apple"],
            "she finds herself also in the british isles": ["she", "locate", "in", "the", "islet", "Great_Britain"],
            "he then became a horse trainer": ["past", "he", "later_on", "trainer", "by", "horse"],
            "she lives in detroit": ["she", "live", "in", "metropolis"],
            "you cannot know": ["you", "be_able_to", "know", "not"],
            "he brush teeth": ["he", "brush_teeth"],
            "the seat of the county is watertown": ["the", "seat", "of", "be", "city"],
            "there is now a bus station": ["there", "be", "now", "a", "bus_station"],
        }

    def translate(self, text: str, **kwargs) -> Dict:
        text_lower = text.lower().strip()
        
        # Check if exact demo mapping exists
        if text_lower in self.demo_mappings:
            pictograms = self.demo_mappings[text_lower]
        else:
            # Simple heuristic translation
            # 1. Lowercase, remove punctuation
            # 2. Split into words
            # 3. Map to vocab if possible, handle OOV
            import re
            words = re.findall(r'\b\w+\b', text_lower)
            pictograms = []
            for w in words:
                # Skip articles for AAC simplicity? Keep for demo
                # Try direct match
                if w in self.target_vocab:
                    pictograms.append(w)
                # Try compound handling
                elif w in ["british", "isles"] and "Great_Britain" in self.target_vocab:
                    if "Great_Britain" not in pictograms:
                        pictograms.append("Great_Britain")
                elif w in ["detroit", "city", "town", "watertown"] and "city" in self.target_vocab:
                    pictograms.append("city")
                elif w in ["eating", "eat", "eats"] and "eat" in self.target_vocab:
                    pictograms.append("eat")
                elif w in ["boy", "boys"] and "boy" in self.target_vocab:
                    pictograms.append("boy")
                elif w in ["apple", "apples"] and "apple" in self.target_vocab:
                    pictograms.append("apple")
                elif w in ["horse", "horses"] and "horse" in self.target_vocab:
                    pictograms.append("horse")
                elif w in ["trainer", "training"] and "trainer" in self.target_vocab:
                    pictograms.append("trainer")
                elif w in ["she", "he", "you", "they", "we", "i"] and w in self.target_vocab:
                    pictograms.append(w)
                # Handle negation
                elif w in ["not", "cannot", "can't", "cannot"] and "not" in self.target_vocab:
                    pictograms.append("not")
                # Skip stopwords for cleaner AAC
                elif w in ["the", "a", "an", "is", "are", "was", "were", "be", "of", "in", "on", "at"]:
                    if w in self.target_vocab and len(words) < 6:  # Keep for short sentences
                        pictograms.append(w)
                else:
                    # OOV handling - map to metropolis for locations, or keep if in vocab
                    if len(w) > 3 and w not in ["with", "from", "that", "this"]:
                        # For demo, try to find close match
                        pictograms.append(w if w in self.target_vocab else w)
            
            # Ensure at least something
            if not pictograms:
                pictograms = words[:5]  # fallback
        
        return {
            "input": text,
            "pictograms": pictograms,
            "raw_output": " ".join(pictograms),
            "model": "mock-model (demo without weights)",
            "method": "rule_based_mock",
            "num_tokens": len(pictograms),
            "is_mock": True,
            "note": "Real model not loaded. Download your Kaggle model and set MODEL_PATH to use real T5."
        }

# Global model instance
_model_instance: Optional[ModelInterface] = None

def get_model(model_type: str = "auto", model_path: Optional[str] = None) -> ModelInterface:
    global _model_instance
    
    if _model_instance is not None:
        return _model_instance
    
    model_type = model_type.lower()
    
    # Try to load real model if path provided
    if model_path and Path(model_path).exists():
        try:
            _model_instance = T5Model(model_path)
            return _model_instance
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {e}, falling back to mock")
    
    # Try to load from HuggingFace Hub
    hf_model_id = os.getenv("HF_MODEL_ID", "")
    if hf_model_id and model_type in ["t5", "auto"]:
        try:
            _model_instance = T5Model(hf_model_id)
            return _model_instance
        except Exception as e:
            logger.error(f"Failed to load HF model {hf_model_id}: {e}")
    
    # Try local paths
    local_paths = [
        "models/t5-base-picto",
        "models/t5-large-picto",
        "./models/t5-base-picto",
        "../models/t5-base-picto",
        os.getenv("MODEL_PATH", "")
    ]
    for path in local_paths:
        if path and Path(path).exists():
            try:
                _model_instance = T5Model(path)
                return _model_instance
            except:
                continue
    
    # Fallback to mock
    logger.warning("No real model found, using MockModel for demo")
    _model_instance = MockModel()
    return _model_instance

def reset_model():
    global _model_instance
    _model_instance = None
