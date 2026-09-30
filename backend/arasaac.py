"""
ARASAAC Pictogram Fetcher
Handles searching and fetching pictogram images from ARASAAC API
"""
import httpx
from typing import List, Dict, Optional
import asyncio
from functools import lru_cache

ARASAAC_API_BASE = "https://api.arasaac.org/api"
ARASAAC_STATIC_BASE = "https://static.arasaac.org/pictograms"

# In-memory cache for pictogram searches
_pictogram_cache: Dict[str, Dict] = {}

async def search_pictogram(word: str, language: str = "en") -> Optional[Dict]:
    """
    Search ARASAAC for a pictogram term.
    Returns best match with id and image URL
    """
    word = word.strip().lower()
    if not word:
        return None
    
    # Check cache
    if word in _pictogram_cache:
        return _pictogram_cache[word]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Try direct search
            url = f"{ARASAAC_API_BASE}/pictograms/{language}/search/{word}"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    # Get best match (first result)
                    best = data[0]
                    picto_id = best.get("_id")
                    result = {
                        "word": word,
                        "id": picto_id,
                        "image_url": f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_500.png",
                        "image_url_300": f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_300.png",
                        "schematic": best.get("schematic", False),
                        "keywords": [k.get("keyword") for k in best.get("keywords", [])][:5]
                    }
                    _pictogram_cache[word] = result
                    return result
            
            # Fallback: try with underscores replaced
            if "_" in word:
                word_space = word.replace("_", " ")
                url = f"{ARASAAC_API_BASE}/pictograms/{language}/search/{word_space}"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data and len(data) > 0:
                        best = data[0]
                        picto_id = best.get("_id")
                        result = {
                            "word": word,
                            "id": picto_id,
                            "image_url": f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_500.png",
                            "image_url_300": f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_300.png",
                            "schematic": False,
                            "keywords": []
                        }
                        _pictogram_cache[word] = result
                        return result
                        
        except Exception as e:
            print(f"ARASAAC search error for '{word}': {e}")
    
    # Fallback: return placeholder with word
    # Use a generic pictogram ID 0 or create placeholder
    fallback = {
        "word": word,
        "id": None,
        "image_url": None,  # Frontend will show text fallback
        "image_url_300": None,
        "schematic": False,
        "keywords": [],
        "fallback": True
    }
    _pictogram_cache[word] = fallback
    return fallback

async def batch_search_pictograms(words: List[str], language: str = "en") -> List[Dict]:
    """Batch search for multiple pictogram words"""
    tasks = [search_pictogram(w, language) for w in words]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]

def get_pictogram_image_url(picto_id: int, size: int = 500) -> str:
    """Get direct image URL for a pictogram ID"""
    return f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_{size}.png"

# For testing / sync version
def search_pictogram_sync(word: str) -> Optional[Dict]:
    import requests
    try:
        url = f"{ARASAAC_API_BASE}/pictograms/en/search/{word}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                best = data[0]
                picto_id = best.get("_id")
                return {
                    "word": word,
                    "id": picto_id,
                    "image_url": f"{ARASAAC_STATIC_BASE}/{picto_id}/{picto_id}_500.png",
                }
    except:
        pass
    return None
