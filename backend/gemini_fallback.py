"""
Gemini Fallback - Free API option for when T5 model accuracy is low
Uses Google Gemini Flash (free tier) to generate pictogram sequences
Keep this in reserve as per user request
"""
import os
import json
import logging
from typing import List, Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Load vocab for prompting
VOCAB_PATH = Path(__file__).parent / "target_vocab.json"
TARGET_VOCAB = []
if VOCAB_PATH.exists():
    TARGET_VOCAB = json.loads(VOCAB_PATH.read_text())
    # For prompt, use most common 2000 terms to keep prompt small
    # In production, you'd use full vocab or retrieval
    COMMON_VOCAB = TARGET_VOCAB[:2000] if len(TARGET_VOCAB) > 2000 else TARGET_VOCAB
else:
    COMMON_VOCAB = ["boy", "girl", "eat", "apple", "city", "metropolis", "she", "he", "you", "not", "be_able_to", "brush_teeth"]

GEMINI_PROMPT_TEMPLATE = """You are an expert AAC (Augmentative and Alternative Communication) pictogram translator for the VisualVoice system.

TASK: Convert free-form English text into an ordered sequence of ARASAAC pictogram terms.

RULES:
1. Output ONLY pictogram terms from the allowed vocabulary
2. Use compound terms with underscores when appropriate (e.g., brush_teeth, be_able_to, bus_station, Great_Britain)
3. Handle OOV locations like Detroit, Watertown -> use metropolis or city
4. Handle negation: "cannot" -> ["be_able_to", "not"] or ["not"]
5. Keep order meaningful for AAC users
6. Use simple, concrete concepts
7. Return ONLY a JSON array of strings, no explanation

ALLOWED VOCABULARY SAMPLE (use these and similar ARASAAC terms):
{ vocab_sample }

EXAMPLES:
Input: "The boy is eating an apple"
Output: ["boy", "eat", "apple"]

Input: "she finds herself also in the british isles"
Output: ["she", "locate", "in", "the", "islet", "Great_Britain"]

Input: "he then became a horse trainer"
Output: ["past", "he", "later_on", "trainer", "by", "horse"]

Input: "you cannot know"
Output: ["you", "be_able_to", "know", "not"]

Input: "She lives in Detroit"
Output: ["she", "live", "in", "metropolis"]

Input: "{user_input}"
Output:"""

def get_gemini_client():
    """Get Gemini client if API key is available"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')  # Free tier, fast
        return model
    except Exception as e:
        logger.error(f"Failed to init Gemini client: {e}")
        return None

def translate_with_gemini(text: str, vocab_sample: List[str] = None) -> Dict:
    """
    Translate using Gemini Flash as fallback
    This is your reserve option when T5 accuracy is low
    """
    client = get_gemini_client()
    if not client:
        return {
            "error": "GEMINI_API_KEY not set. Set it in Hugging Face Space Secrets or .env file",
            "pictograms": [],
            "is_fallback": True,
            "fallback_needed": True
        }
    
    vocab_sample = vocab_sample or COMMON_VOCAB[:100]  # Keep prompt small
    vocab_str = ", ".join(vocab_sample[:150])
    
    prompt = GEMINI_PROMPT_TEMPLATE.format(
        vocab_sample=vocab_str,
        user_input=text
    )
    
    try:
        response = client.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,  # Low temp for consistency
                "max_output_tokens": 200,
            }
        )
        
        raw_text = response.text.strip()
        
        # Try to parse JSON array from response
        # Handle cases where model adds markdown
        import re
        # Extract JSON array pattern
        json_match = re.search(r'\[.*?\]', raw_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            pictograms = json.loads(json_str)
        else:
            # Fallback: split by comma/space
            cleaned = raw_text.replace('"', '').replace("'", "").replace("[", "").replace("]", "")
            pictograms = [p.strip() for p in cleaned.split(",") if p.strip()]
        
        # Clean pictograms
        pictograms = [p.strip().strip('"').strip("'") for p in pictograms if p.strip()]
        
        return {
            "input": text,
            "pictograms": pictograms,
            "raw_output": raw_text,
            "model": "gemini-1.5-flash (fallback API)",
            "method": "llm_api_fallback",
            "num_tokens": len(pictograms),
            "is_fallback": True,
            "is_mock": False
        }
        
    except Exception as e:
        logger.error(f"Gemini translation failed: {e}")
        return {
            "error": f"Gemini API failed: {str(e)}",
            "input": text,
            "pictograms": text.lower().split()[:5],  # fallback to simple split
            "model": "gemini-1.5-flash (failed, using simple fallback)",
            "method": "fallback_error",
            "is_fallback": True
        }

def check_gemini_available() -> bool:
    """Check if Gemini API is configured"""
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))

# For testing
if __name__ == "__main__":
    test_text = "The boy is eating an apple"
    if check_gemini_available():
        result = translate_with_gemini(test_text)
        print(json.dumps(result, indent=2))
    else:
        print("Set GEMINI_API_KEY to test")
