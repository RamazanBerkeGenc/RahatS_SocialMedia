from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

app = FastAPI()

# Modelin olduğu klasörün yolu
MODEL_PATH = "./final_moderation_model" 

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

class TextRequest(BaseModel):
    text: str

@app.post("/predict")
async def predict(request: TextRequest):
    inputs = tokenizer(request.text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        # Modelinin çıktı yapısına göre (örneğin 0: Temiz, 1: Argo)
        prediction = torch.argmax(outputs.logits, dim=-1).item()
    
    # Eğer 0 temizse True döndür
    is_clean = True if prediction == 0 else False
    return {"is_clean": is_clean}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)