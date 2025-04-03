from pydantic import BaseModel
from typing import List

class PredictionRequest(BaseModel):
    text: str
    num_words: int = 5
    user_id: str

class SpellCheckRequest(BaseModel):
    text: str

class SpellCheckResponse(BaseModel):
    corrected: str 