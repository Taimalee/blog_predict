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
import openai
import logging
import json

logger = logging.getLogger(__name__)

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
            try:
                self._ngram_model = NGramModel()
                model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ngram_model.json')
                if os.path.exists(model_path):
                    self._ngram_model.load(model_path)
                    gc.collect()  # Force garbage collection after loading
                    self._model_loaded = True
                else:
                    logger.error(f"Model file not found at {model_path}")
                    return None
            except Exception as e:
                logger.error(f"Error loading ngram model: {e}")
                self._model_loaded = False
                self._ngram_model = None
                gc.collect()
                return None
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
            # Check if text is empty or too short
            if not text or len(text.strip().split()) < 2:
                return []

            # Get n-gram predictions with expanded context window
            ngram_model = self._get_ngram_model()
            if not ngram_model or not ngram_model._is_loaded():
                logger.error("NGram model not loaded")
                return []

            try:
                predictions = ngram_model.predict(text, num_words, context_window=4)
            except Exception as e:
                logger.error(f"Error during prediction: {e}")
                return []
            finally:
                # Always unload the model after prediction
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
            
            return filtered_predictions[:num_words]
        except Exception as e:
            logger.error(f"Error in basic prediction: {e}")
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
                    logger.error(f"Error getting user patterns: {e}")
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
                    logger.error(f"Error getting suggestion stats: {e}")
            
            # Keep the original system prompt
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
            
            # Make the optimized API call
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=20,  # Reduced for faster response
                temperature=temperature,
                presence_penalty=0.5,  # Added to reduce repetition
                frequency_penalty=0.5,  # Added to reduce common words
                top_p=0.9,  # Added for better quality while maintaining speed
                n=3  # Return 3 predictions for user choice
            )
            
            # Process all predictions
            all_predictions = []
            for choice in response.choices:
                predictions = choice.message.content.strip().split()
                for pred in predictions:
                    # Remove any unwanted characters
                    cleaned_pred = re.sub(r'[^a-zA-Z0-9\-\']', '', pred)
                    if cleaned_pred and cleaned_pred not in all_predictions:
                        all_predictions.append(cleaned_pred)
            
            return all_predictions[:num_words]
            
        except Exception as e:
            logger.error(f"Error in GPT prediction: {e}")
            return self.predict_basic(text, num_words, user_id)

    async def spellcheck_text(self, text: str) -> dict:
        """Check spelling in the given text using GPT-3.5 Turbo."""
        try:
            # Only process single words
            if not text or ' ' in text or not text.strip().isalpha():
                return {"corrected": text, "confidence": 0.0}

            system_prompt = """You are a precise spell checker. Your task is to:
1. If the word is spelled correctly, return it unchanged with confidence 1.0
2. If the word is misspelled, return the corrected word with a confidence score between 0.0 and 1.0
3. Preserve the original case of the word
4. Only correct obvious spelling mistakes
5. Return the word and confidence score in JSON format: {"word": "corrected_word", "confidence": 0.95}

Examples:
Input: "teh"
Output: {"word": "the", "confidence": 0.98}

Input: "Python"
Output: {"word": "Python", "confidence": 1.0}

Input: "recieved"
Output: {"word": "received", "confidence": 0.95}

Input: "Github"
Output: {"word": "Github", "confidence": 1.0}"""

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                max_tokens=50,
                temperature=0.1  # Lower temperature for more consistent results
            )

            try:
                result = json.loads(response.choices[0].message.content.strip())
                return {
                    "corrected": result["word"],
                    "confidence": float(result["confidence"])
                }
            except (json.JSONDecodeError, KeyError):
                return {"corrected": text, "confidence": 0.0}

        except Exception as e:
            print(f"Error in spellcheck: {e}")
            return {"corrected": text, "confidence": 0.0} 