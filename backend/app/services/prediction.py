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
        
        # Get n-gram predictions with expanded context window
        predictions = self.ngram_model.predict(text, num_words, context_window=4)
        
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


#             system_prompt = """You are a sophisticated AI writing assistant specialized in predicting the next words in blog posts.
# Your task is to predict the next few words that would naturally follow in a piece of writing.

# Here are examples of high-quality predictions for technology blogs:
# Example 1: 
# Input: "The integration of artificial intelligence into healthcare has"
# Prediction: "revolutionized patient care and treatment outcomes"

# Example 2:
# Input: "Cloud computing offers businesses several advantages including"
# Prediction: "scalability, cost-efficiency, and improved collaboration capabilities"

# Example 3:
# Input: "The future of remote work depends on"
# Prediction: "effective communication tools and adaptive management strategies"

# Follow these guidelines:
# 1. Maintain the writing style and tone of the text
# 2. Provide natural, coherent continuations
# 3. Consider context and topic when making predictions
# 4. Return ONLY the predicted words, no explanations or formatting
# """

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


#             # Add tech blog vocabulary context
#             user_prompt += """ Focus on professional technology blog writing.
# Use appropriate tech vocabulary that might include: development, application, framework, 
# implementation, infrastructure, deployment, API, interface, functionality, algorithm, 
# optimization, scalability, database, cloud computing, security, integration."""
            
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