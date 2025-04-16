from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.services.prediction import PredictionService
from app.schemas.prediction import PredictionRequest, SpellCheckRequest, SpellCheckResponse
from app.services.suggestion_tracker import SuggestionTrackerService

router = APIRouter()
prediction_service = PredictionService()
suggestion_tracker = SuggestionTrackerService()

class PredictionRequest(BaseModel):
    text: str
    num_words: int = 5
    model_type: str = "basic"  # "basic" or "advanced"
    user_id: str

class SpellCheckRequest(BaseModel):
    text: str

class SuggestionTrackRequest(BaseModel):
    user_id: str
    shown: Optional[int] = None
    accepted: Optional[bool] = None

class SuggestionStats(BaseModel):
    shownCount: int
    acceptedCount: int
    acceptanceRate: float

@router.post("/spellcheck")
async def spellcheck(request: SpellCheckRequest = Body(...)) -> dict:
    """
    Check and correct spelling in the given text using GPT-3.5 Turbo.
    """
    try:
        corrected = await prediction_service.spellcheck_text(request.text)
        return {"corrected": corrected}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/basic")
async def predict_basic(request: PredictionRequest = Body(...)) -> List[str]:
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
async def predict_advanced(request: PredictionRequest = Body(...)) -> List[str]:
    try:
        if not request.user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return prediction_service.predict_advanced(
            text=request.text,
            num_words=request.num_words,
            user_id=request.user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track")
async def track_suggestion(request: SuggestionTrackRequest = Body(...)) -> dict:
    try:
        await suggestion_tracker.track(
            user_id=request.user_id,
            shown=request.shown,
            accepted=request.accepted
        )
        return {"message": "Suggestion tracked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{user_id}")
async def get_suggestion_stats(user_id: str) -> dict:
    try:
        stats = await suggestion_tracker.get_stats(user_id)
        return {
            "shownCount": stats.shownCount,
            "acceptedCount": stats.acceptedCount,
            "acceptanceRate": stats.acceptanceRate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 