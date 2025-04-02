from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.prediction import PredictionService
from app.api import deps
from app.models.user import User

router = APIRouter()
prediction_service = PredictionService()

class PredictionRequest(BaseModel):
    text: str
    num_words: int = 5
    model_type: str = "basic"  # "basic" or "advanced"

@router.post("/basic", response_model=List[str])
def predict_basic(
    *,
    request: PredictionRequest,
    current_user: User = Depends(deps.get_current_active_user),
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
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Predict next words using GPT-3.5 Turbo.
    """
    predictions = await prediction_service.predict_advanced(
        text=request.text,
        num_words=request.num_words
    )
    return predictions 