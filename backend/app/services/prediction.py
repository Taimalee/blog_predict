from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from collections import defaultdict
import random
from app.services.user_patterns import UserPatternService
from app.db.session import SessionLocal

class PredictionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.trigram_model = defaultdict(lambda: defaultdict(int))
        self.db = SessionLocal()
        self.pattern_service = UserPatternService(self.db)

    def train_trigram_model(self, text: str) -> None:
        """Train the trigram model on input text."""
        words = text.lower().split()
        for i in range(len(words) - 2):
            trigram = (words[i], words[i + 1])
            next_word = words[i + 2]
            self.trigram_model[trigram][next_word] += 1

    def predict_basic(self, text: str, num_words: int = 5, user_id: str = None) -> List[str]:
        """Basic prediction using trigram model with user patterns."""
        # Get user patterns if user_id is provided
        user_patterns = None
        if user_id:
            try:
                user_patterns = self.pattern_service.get_user_patterns(user_id)
                # Update patterns with current text
                self.pattern_service.update_user_patterns(user_id, text)
            except Exception as e:
                print(f"Error getting user patterns: {e}")
                user_patterns = None
        
        # Get personalized suggestions
        personalized_suggestions = []
        if user_patterns and isinstance(user_patterns, dict):
            try:
                personalized_suggestions = self.pattern_service.get_suggestions(user_id, text)
            except Exception as e:
                print(f"Error getting suggestions: {e}")
        
        # Combine with basic trigram predictions
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
        
        # Add personalized suggestions to the mix
        if personalized_suggestions and isinstance(personalized_suggestions, list):
            return personalized_suggestions[:num_words]
        
        return ["the", "and", "but", "or", "so"]  # Default fallback

    async def predict_advanced(self, text: str, num_words: int = 5, user_id: str = None) -> List[str]:
        """Advanced prediction using GPT-3.5 Turbo with user patterns."""
        try:
            # Get user patterns if user_id is provided
            user_patterns = None
            if user_id:
                try:
                    user_patterns = self.pattern_service.get_user_patterns(user_id)
                    # Update patterns with current text
                    self.pattern_service.update_user_patterns(user_id, text)
                except Exception as e:
                    print(f"Error getting user patterns: {e}")
                    user_patterns = None
            
            # Prepare context with user patterns
            context = f"Given the text: '{text}', predict the next {num_words} words. "
            if user_patterns and isinstance(user_patterns, dict):
                metrics = user_patterns.get('writing_style_metrics', {})
                if isinstance(metrics, dict):
                    vocab_level = metrics.get('vocabulary_level', 'intermediate')
                    context += f"Match the user's writing style: {vocab_level} vocabulary level. "
                    
                    transitions = metrics.get('common_transitions', {})
                    if isinstance(transitions, dict) and transitions:
                        transition_words = list(transitions.keys())[:3]
                        if transition_words:
                            context += f"Use transitions like: {', '.join(transition_words)}. "
            
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that predicts the next words in a text. Only return the predicted words, separated by spaces."},
                    {"role": "user", "content": context}
                ],
                max_tokens=50,
                temperature=0.7
            )
            
            predictions = response.choices[0].message.content.strip().split()
            return predictions[:num_words]
            
        except Exception as e:
            print(f"Error in GPT prediction: {e}")
            return self.predict_basic(text, num_words, user_id)

    async def spellcheck_text(self, text: str) -> str:
        """Check spelling only (no grammar) in the given text using GPT-3.5 Turbo."""
        try:
            # Only process single words
            if not text or ' ' in text or not text.strip().isalpha():
                return text

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a basic spell checker. If the word is spelled correctly, return it unchanged. If it's misspelled, return ONLY the corrected word. Do not consider grammar or context. Do not add any explanations or additional text."},
                    {"role": "user", "content": text}
                ],
                max_tokens=50,
                temperature=0.3
            )
            corrected = response.choices[0].message.content.strip()
            
            # Only accept pure word responses
            if not corrected or not corrected.isalpha():
                return text
                
            return corrected
        except Exception as e:
            print(f"Error in spellcheck: {e}")
            return text 