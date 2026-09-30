"""
Push your Kaggle-trained model to Hugging Face Hub
Run this AFTER downloading models/t5-base-picto from Kaggle

Usage:
  pip install huggingface_hub transformers
  huggingface-cli login  (paste your HF token)
  python push_model_to_hf.py

You need to set HF_USERNAME below
"""

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from pathlib import Path
import shutil
import json

# ===== CONFIGURE THESE =====
HF_USERNAME = "LakshhmiNarayanan"  # <-- CHANGE THIS to your HF username
MODEL_LOCAL_PATH = "backend/models/t5-base-picto"  # or "models/t5-base-picto" 
# If you have both base and large, push both by changing this
# ============================

def push_model(local_path: str, repo_name: str):
    local_path = Path(local_path)
    if not local_path.exists():
        print(f"❌ Path not found: {local_path}")
        print(f"   Make sure you downloaded from Kaggle and placed in {local_path}")
        print(f"   Expected files: config.json, pytorch_model.bin or model.safetensors, tokenizer.json")
        return False

    print(f"📁 Loading model from {local_path}...")
    print(f"   Files: {list(local_path.glob('*'))}")

    # Load
    try:
        model = AutoModelForSeq2SeqLM.from_pretrained(str(local_path))
        tokenizer = AutoTokenizer.from_pretrained(str(local_path))
        print(f"✅ Model loaded: {model.config.model_type}, vocab size {len(tokenizer)}")
    except Exception as e:
        print(f"❌ Failed to load: {e}")
        return False

    # Check target_vocab.json exists, if not copy from our generated one
    target_vocab_src = Path("backend/target_vocab.json")
    target_vocab_dst = local_path / "target_vocab.json"
    if target_vocab_src.exists() and not target_vocab_dst.exists():
        shutil.copy(target_vocab_src, target_vocab_dst)
        print(f"📋 Copied target_vocab.json to model folder")

    repo_id = f"{HF_USERNAME}/{repo_name}"
    print(f"🚀 Pushing to https://huggingface.co/{repo_id}...")

    try:
        model.push_to_hub(repo_id, private=False)
        tokenizer.push_to_hub(repo_id, private=False)
        
        # Also push target_vocab.json if exists
        if (local_path / "target_vocab.json").exists():
            from huggingface_hub import HfApi
            api = HfApi()
            api.upload_file(
                path_or_fileobj=str(local_path / "target_vocab.json"),
                path_in_repo="target_vocab.json",
                repo_id=repo_id,
                repo_type="model"
            )
            print(f"📋 Uploaded target_vocab.json")

        print(f"✅ Done! Model at https://huggingface.co/{repo_id}")
        print(f"   Use this as HF_MODEL_ID in your HF Space Secrets")
        return True
    except Exception as e:
        print(f"❌ Push failed: {e}")
        print(f"   Did you run huggingface-cli login?")
        return False

if __name__ == "__main__":
    if HF_USERNAME == "YOUR_HF_USERNAME":
        print("❌ Please edit this file and set HF_USERNAME = your actual HF username")
        print("   Get username from https://huggingface.co/settings")
        exit(1)

    # Push base model
    print("="*60)
    print("Pushing T5-Base (your best - 51.41 BLEU)")
    print("="*60)
    push_model(MODEL_LOCAL_PATH, "visualvoice-t5-base")

    # Optionally push large if exists
    large_path = "backend/models/t5-large-picto"
    if Path(large_path).exists():
        print("\n" + "="*60)
        print("Found T5-Large, pushing as well")
        print("="*60)
        push_model(large_path, "visualvoice-t5-large")
    else:
        print(f"\nℹ️ T5-Large not found at {large_path}, skipping (only base pushed - that's fine, base is your best)")
