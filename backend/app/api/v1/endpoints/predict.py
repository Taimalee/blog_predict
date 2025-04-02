from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.prediction import PredictionService

router = APIRouter()
prediction_service = PredictionService()

class PredictionRequest(BaseModel):
    text: str
    num_words: int = 5
    model_type: str = "basic"  # "basic" or "advanced"

class SpellCheckRequest(BaseModel):
    text: str

@router.post("/spellcheck", response_model=dict)
async def spellcheck_text(
    *,
    request: SpellCheckRequest,
) -> Any:
    """
    Check and correct spelling in the given text using GPT-3.5 Turbo.
    """
    corrected = await prediction_service.spellcheck_text(request.text)
    return {"corrected": corrected}

@router.post("/basic", response_model=List[str])
def predict_basic(
    *,
    request: PredictionRequest,
) -> Any:
    """
    Predict next words using basic trigram model.
    """
    predictions = prediction_service.predict_basic(
        text=request.text,
        num_words=request.num_words
    )
    return predictions

@router.post("/advanced", response_model=List[str])
async def predict_advanced(
    *,
    request: PredictionRequest,
) -> Any:
    """
    Predict next words using GPT-3.5 Turbo.
    """
    predictions = await prediction_service.predict_advanced(
        text=request.text,
        num_words=request.num_words
    )
    return predictions 