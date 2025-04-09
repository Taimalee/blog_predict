from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from collections import defaultdict
import random
from app.services.user_patterns import UserPatternService
from app.db.session import SessionLocal
from app.models.ngram_model import NGramModel
import os
import re

class PredictionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.ngram_model = NGramModel()
        self.db = SessionLocal()
        self.pattern_service = UserPatternService(self.db)
        
        # Load pre-trained model if exists
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngram_model.json')
        if os.path.exists(model_path):
            self.ngram_model.load(model_path)

    def train_ngram_model(self, text: str) -> None:
        """Train the n-gram model on input text."""
        self.ngram_model.train(text)
        
        # Save the model
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngram_model.json')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        self.ngram_model.save(model_path)

    def predict_basic(self, text: str, num_words: int = 5, user_id: str = None) -> List[str]:
        """Basic prediction using n-gram model with user patterns."""
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
        
        # Get n-gram predictions
        predictions = self.ngram_model.predict(text, num_words)
        
        # Filter out special tokens and duplicates
        filtered_predictions = []
        seen = set()
        special_tokens = {'@-@', '<unk>'}
        for pred in predictions:
            if pred not in special_tokens and re.match(r'^\w+$', pred):
                if pred not in seen:
                    filtered_predictions.append(pred)
                    seen.add(pred)
        
        # Add personalized suggestions to the mix if available
        if personalized_suggestions and isinstance(personalized_suggestions, list):
            return personalized_suggestions[:num_words]
        
        return filtered_predictions[:num_words]

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