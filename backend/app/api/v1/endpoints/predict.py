from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.prediction import PredictionService
from app.schemas.prediction import PredictionRequest, SpellCheckRequest, SpellCheckResponse

router = APIRouter()
prediction_service = PredictionService()

class PredictionRequest(BaseModel):
    text: str
    num_words: int = 5
    model_type: str = "basic"  # "basic" or "advanced"
    user_id: str

class SpellCheckRequest(BaseModel):
    text: str

@router.post("/spellcheck", response_model=SpellCheckResponse)
async def spellcheck(request: SpellCheckRequest) -> SpellCheckResponse:
    """
    Check and correct spelling in the given text using GPT-3.5 Turbo.
    """
    try:
        corrected = await prediction_service.spellcheck_text(request.text)
        return {"corrected": corrected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/basic")
async def predict_basic(request: PredictionRequest) -> List[str]:
    try:
        if not request.user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return prediction_service.predict_basic(
            text=request.text,
            num_words=request.num_words,
            user_id=request.user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/advanced")
async def predict_advanced(request: PredictionRequest) -> List[str]:
    try:
        if not request.user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return await prediction_service.predict_advanced(
            text=request.text,
            num_words=request.num_words,
            user_id=request.user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 