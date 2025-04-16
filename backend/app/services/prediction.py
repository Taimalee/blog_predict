from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from collections import defaultdict
import random
from app.services.user_patterns import UserPatternService
from app.db.session import SessionLocal
from app.models.ngram_model import NGramModel
from app.services.suggestion_tracker import suggestion_tracker
import os
import re
import gc

class PredictionService:
    _instance = None
    _ngram_model = None
    _model_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PredictionService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.db = SessionLocal()
            self.pattern_service = UserPatternService(self.db)
            self.initialized = True

    def _get_ngram_model(self):
        if not self._model_loaded:
            self._ngram_model = NGramModel()
            model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngram_model.json')
            if os.path.exists(model_path):
                self._ngram_model.load(model_path)
                # Force garbage collection after loading
                gc.collect()
                self._model_loaded = True
        return self._ngram_model

    def _unload_ngram_model(self):
        """Unload the ngram model to free memory"""
        if self._model_loaded:
            self._ngram_model = None
            self._model_loaded = False
            gc.collect()

    def train_ngram_model(self, text: str) -> None:
        """Train the n-gram model on input text."""
        ngram_model = self._get_ngram_model()
        ngram_model.train(text)
        
        # Save the model
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngram_model.json')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        ngram_model.save(model_path)

    def predict_basic(self, text: str, num_words: int = 5, user_id: str = None) -> List[str]:
        """Basic prediction using n-gram model with user patterns."""
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
            
            # Get n-gram predictions with expanded context window
            ngram_model = self._get_ngram_model()
            predictions = ngram_model.predict(text, num_words, context_window=4)
            
            # Immediately unload the model after prediction
            self._unload_ngram_model()
            
            # Filter out special tokens and duplicates
            filtered_predictions = []
            seen = set()
            special_tokens = {'@-@', '<unk>'}
            for pred in predictions:
                if pred not in special_tokens and re.match(r'^\w+$', pred):
                    if pred not in seen:
                        filtered_predictions.append(pred)
                        seen.add(pred)
            
            # Get personalized suggestions
            personalized_suggestions = []
            if user_patterns and isinstance(user_patterns, dict):
                try:
                    personalized_suggestions = self.pattern_service.get_suggestions(user_id, text)
                except Exception as e:
                    print(f"Error getting suggestions: {e}")
            
            # Blend personalized suggestions with n-gram predictions
            if personalized_suggestions and isinstance(personalized_suggestions, list):
                blended_predictions = []
                # Use 60% personalized, 40% n-gram predictions
                personal_count = min(int(num_words * 0.6) + 1, len(personalized_suggestions))
                ngram_count = num_words - personal_count
                
                blended_predictions.extend(personalized_suggestions[:personal_count])
                
                # Add n-gram predictions not already in blended list
                for pred in filtered_predictions:
                    if pred not in blended_predictions and len(blended_predictions) < num_words:
                        blended_predictions.append(pred)
                    
                return blended_predictions[:num_words]
            
            return filtered_predictions[:num_words]
        except Exception as e:
            print(f"Error in basic prediction: {e}")
            return []

    async def predict_advanced(self, text: str, num_words: int = 5, user_id: str = None, context_data: Dict = None) -> List[str]:
        """
        Advanced prediction using GPT-3.5 Turbo with enhanced prompting, context awareness, and feedback-driven temperature.
        
        Args:
            text: The input text to predict from
            num_words: Number of words to predict
            user_id: User ID for personalization
            context_data: Optional dict with contextual information like {'title': '...', 'category': '...'}
        """
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
                    
            # Get user feedback statistics to adjust model parameters
            # Start with default temperature
            temperature = 0.7
            
            if user_id:
                try:
                    stats = suggestion_tracker.get_stats(user_id)
                    # Only adjust after some usage data is collected
                    if stats["shownCount"] > 10:
                        # Calculate acceptance rate
                        acceptance_rate = stats["acceptanceRate"]
                        # Adjust temperature based on acceptance rate
                        if acceptance_rate > 0.7:
                            # User accepts many suggestions, lower temperature for more precise predictions
                            temperature = 0.5
                        elif acceptance_rate < 0.3:
                            # User rejects many suggestions, increase temperature for more variety
                            temperature = 0.9
                except Exception as e:
                    print(f"Error getting suggestion stats: {e}")
            
            # Build a more detailed system prompt with few-shot examples
            system_prompt = """You are a sophisticated AI writing assistant designed to predict the next few words in blog posts across a variety of topics. 
            Your task is to generate natural, coherent continuations for any given piece of text, maintaining the original tone and context.

Examples:
Example 1:
Input: "The integration of innovative technologies in healthcare has"
Prediction: "transformed patient care and improved treatment outcomes"

Example 2:
Input: "Cloud computing provides numerous benefits including"
Prediction: "enhanced efficiency, scalability, and seamless collaboration"

Example 3:
Input: "The future of work depends on"
Prediction: "adaptive strategies and modern communication tools"

Guidelines:
1. Preserve the original writing style and tone.
2. Provide natural, cohesive continuations that align with the context.
3. Return ONLY the predicted words without explanations or additional formatting.
"""

            # Add blog topic context
            user_prompt = f"Given the text: '{text}', predict the next {num_words} words."
            
            # Add contextual information from the article if available
            if context_data:
                if context_data.get("title"):
                    user_prompt += f" This is from an article titled: '{context_data.get('title')}'."
                if context_data.get("category"):
                    user_prompt += f" The category is: {context_data.get('category')}."
            
            # Add tech blog vocabulary context
            user_prompt += """ Focus on crafting engaging and professional blog content that 
            appeals to a broad audience. Use versatile vocabulary that reflects contemporary trends 
            and diverse perspectives, ensuring clarity and reader interest."""
            
            # Add user-specific writing style information
            if user_patterns and isinstance(user_patterns, dict):
                metrics = user_patterns.get('writing_style_metrics', {})
                if isinstance(metrics, dict):
                    vocab_level = metrics.get('vocabulary_level', 'intermediate')
                    user_prompt += f" Match the user's writing style: {vocab_level} vocabulary level."
                    
                    transitions = metrics.get('common_transitions', {})
                    if isinstance(transitions, dict) and transitions:
                        transition_words = list(transitions.keys())[:3]
                        if transition_words:
                            user_prompt += f" Consider using transitions like: {', '.join(transition_words)}."
            
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=50,
                temperature=temperature
            )
            
            predictions = response.choices[0].message.content.strip().split()
            
            # Process predictions to handle formatting or special characters
            filtered_predictions = []
            for pred in predictions:
                # Remove any unwanted characters
                cleaned_pred = re.sub(r'[^a-zA-Z0-9\-\']', '', pred)
                if cleaned_pred and cleaned_pred not in filtered_predictions:
                    filtered_predictions.append(cleaned_pred)
            
            return filtered_predictions[:num_words]
            
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