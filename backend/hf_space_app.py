# VisualVoice HF Space - T5 + ARASAAC - ZeroGPU Free
# This is the app.py deployed to https://huggingface.co/spaces/LakshhmiNarayanan/visualvoice-api
# Uses ZeroGPU - sleeps after 48h idle, wake by opening Space URL

import spaces
import gradio as gr
import requests

# Dummy to ensure spaces imported before torch
@spaces.GPU
def dummy():
    pass

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

MODEL_ID = "LakshhmiNarayanan/visualvoice-t5-base"
print(f"Loading {MODEL_ID}...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSeq2SeqLM.from_pretrained(
    MODEL_ID, 
    torch_dtype=torch.float16, 
    low_cpu_mem_usage=True,
    device_map="auto" if torch.cuda.is_available() else None
)
model.eval()

STOPWORDS = {"the", "a", "an", "of", "be", "is", "are", "was", "were", "at", "in", "on", "at_the"}

def get_arasaac_image(word):
    if word.lower() in STOPWORDS:
        return None, None
    tries = [word, word.replace("_", " "), word.split("_")[0]]
    for w in tries:
        try:
            r = requests.get(f"https://api.arasaac.org/api/pictograms/en/search/{w}", timeout=5)
            if r.status_code == 200 and r.json():
                picto_id = r.json()[0]["_id"]
                return f"https://static.arasaac.org/pictograms/{picto_id}/{picto_id}_500.png", picto_id
        except:
            continue
    return None, None

@spaces.GPU(duration=60)
def translate(text, model_type="auto"):
    # model_type kept for compatibility with frontend that sends [text, model_type]
    # but we only have T5-Base 51.41 BLEU
    if not text.strip():
        return "Please enter text", []
    
    inputs = tokenizer(f"translate to pictograms: {text}", return_tensors="pt", max_length=128, truncation=True)
    # Move to GPU if available
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
        model.cuda()
    
    with torch.no_grad():
        outputs = model.generate(**inputs, max_length=128, num_beams=6, early_stopping=True)
    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    raw_pictos = decoded.split()
    
    cleaned_pictos = [p for p in raw_pictos if p.lower() not in STOPWORDS]
    display_pictos = cleaned_pictos if cleaned_pictos else raw_pictos
    
    images = []
    for w in display_pictos:
        url, pid = get_arasaac_image(w)
        if url:
            images.append((url, w))
        else:
            images.append((None, w))
    
    raw_seq = " → ".join(raw_pictos)
    clean_seq = " → ".join(display_pictos)
    return f"Raw model: {raw_seq}\n\nCleaned AAC: {clean_seq}\n\nModel: T5-Base 51.41 BLEU | Method: constrained_beam_search | Tokens: {len(display_pictos)}", images

# Gradio UI
with gr.Blocks(title="VisualVoice - T5 + ARASAAC - ZeroGPU Free") as demo:
    gr.Markdown("# VisualVoice - T5 + ARASAAC Images - ZeroGPU Free\n### Text-to-Pictogram for AAC | VIT Chennai Capstone | T5-Base 51.41 BLEU")
    gr.Markdown("**How to use:** Type English sentence → Click Translate → View pictogram sequence. Images from ARASAAC API. ZeroGPU sleeps after 48h - if Vercel shows CLIP fallback, open this Space in new tab to wake T5.")
    
    with gr.Row():
        with gr.Column():
            inp = gr.Textbox(label="Input Text", placeholder="The boy is eating an apple", lines=2)
            with gr.Row():
                model_type = gr.Dropdown(choices=["auto", "t5", "clip"], value="auto", label="Model Type (for Vercel compatibility)", visible=False)
            btn = gr.Button("Translate", variant="primary")
            gr.Examples(
                examples=[
                    ["The boy is eating an apple"],
                    ["She lives in Detroit"],
                    ["you cannot know"],
                    ["he brush teeth"],
                    ["there is now a bus station"],
                    ["the commune of mahambo is located on the island of madagascar"],
                ],
                inputs=inp,
                label="Try examples"
            )
        with gr.Column():
            out_text = gr.Textbox(label="Sequence (Raw + Cleaned AAC)", lines=4)
            gallery = gr.Gallery(label="Pictograms - ARASAAC Images", columns=4, height="auto")
    
    btn.click(fn=translate, inputs=[inp, model_type], outputs=[out_text, gallery], api_name="translate")
    inp.submit(fn=translate, inputs=[inp, model_type], outputs=[out_text, gallery])

demo.launch()
