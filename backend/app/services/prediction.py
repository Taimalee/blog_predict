from typing import List, Optional
from openai import AsyncOpenAI
from app.core.config import settings
from collections import defaultdict
import random

class PredictionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.trigram_model = defaultdict(lambda: defaultdict(int))

    def train_trigram_model(self, text: str) -> None:
        """Train the trigram model on input text."""
        words = text.lower().split()
        for i in range(len(words) - 2):
            trigram = (words[i], words[i + 1])
            next_word = words[i + 2]
            self.trigram_model[trigram][next_word] += 1

    def predict_basic(self, text: str, num_words: int = 5) -> List[str]:
        """Predict next words using trigram model."""
        words = text.lower().split()
        if len(words) < 2:
            return []
        
        predictions = []
        current_trigram = (words[-2], words[-1])
        
        for _ in range(num_words):
            if current_trigram not in self.trigram_model:
                break
                
            next_words = self.trigram_model[current_trigram]
            if not next_words:
                break
                
            # Choose next word based on frequency
            total = sum(next_words.values())
            r = random.uniform(0, total)
            cumsum = 0
            for word, count in next_words.items():
                cumsum += count
                if cumsum > r:
                    predictions.append(word)
                    current_trigram = (current_trigram[1], word)
                    break
        
        return predictions

    async def predict_advanced(self, text: str, num_words: int = 5) -> List[str]:
        """Predict next words using GPT-3.5 Turbo."""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that predicts the next words in a text. Only return the predicted words, separated by spaces."},
                    {"role": "user", "content": f"Given the text: '{text}', predict the next {num_words} words."}
                ],
                max_tokens=50,
                temperature=0.7
            )
            predictions = response.choices[0].message.content.strip().split()
            return predictions[:num_words]
        except Exception as e:
            print(f"Error in GPT prediction: {e}")
            return []

    async def spellcheck_text(self, text: str) -> str:
        """Check and correct spelling in the given text using GPT-3.5 Turbo."""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that corrects spelling and grammar in text. Only return the corrected text, maintaining the original meaning and style."},
                    {"role": "user", "content": f"Correct any spelling or grammar errors in this text: '{text}'"}
                ],
                max_tokens=100,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error in spellcheck: {e}")
            return text 