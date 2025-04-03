from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.user_pattern import UserPattern
from app.models.user import User
import json
from datetime import datetime
import re
from collections import Counter

class UserPatternService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_text(self, text: str) -> Dict:
        """Analyze text to extract writing patterns."""
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        words = text.lower().split()
        
        # Calculate metrics
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        
        # Word frequencies
        word_freq = Counter(words)
        
        # Common transitions (words that start sentences)
        transitions = [s.split()[0].lower() for s in sentences if s.strip()]
        transition_freq = Counter(transitions)
        
        # Vocabulary level (simple metric based on word length)
        avg_word_length = sum(len(w) for w in words) / len(words)
        vocab_level = "basic" if avg_word_length < 5 else "intermediate" if avg_word_length < 7 else "advanced"
        
        return {
            'word_frequencies': dict(word_freq),
            'writing_style_metrics': {
                'avg_sentence_length': avg_sentence_length,
                'vocabulary_level': vocab_level,
                'common_transitions': dict(transition_freq)
            }
        }

    def update_user_patterns(self, user_id: str, text: str) -> None:
        """Update user patterns based on new text."""
        patterns = self.analyze_text(text)
        
        # Update word frequencies
        for word, freq in patterns['word_frequencies'].items():
            self._update_pattern(user_id, 'word_frequencies', word, freq)
        
        # Update writing style metrics
        metrics = patterns['writing_style_metrics']
        for metric, value in metrics.items():
            self._update_pattern(user_id, 'writing_style_metrics', metric, value)

    def _update_pattern(self, user_id: str, pattern_type: str, pattern: str, value: any) -> None:
        """Update or create a pattern entry."""
        existing_pattern = self.db.query(UserPattern).filter(
            UserPattern.user_id == user_id,
            UserPattern.pattern_type == pattern_type,
            UserPattern.pattern == pattern
        ).first()
        
        if existing_pattern:
            existing_pattern.frequency += 1
            existing_pattern.last_used = datetime.utcnow()
        else:
            new_pattern = UserPattern(
                user_id=user_id,
                pattern_type=pattern_type,
                pattern=pattern,
                frequency=1
            )
            self.db.add(new_pattern)
        
        self.db.commit()

    def get_user_patterns(self, user_id: str) -> Dict:
        """Get all patterns for a user."""
        patterns = self.db.query(UserPattern).filter(
            UserPattern.user_id == user_id
        ).all()
        
        result = {
            'word_frequencies': {},
            'writing_style_metrics': {}
        }
        
        for pattern in patterns:
            if pattern.pattern_type == 'word_frequencies':
                result['word_frequencies'][pattern.pattern] = pattern.frequency
            elif pattern.pattern_type == 'writing_style_metrics':
                result['writing_style_metrics'][pattern.pattern] = pattern.frequency
        
        return result

    def get_suggestions(self, user_id: str, current_text: str) -> List[str]:
        """Get personalized suggestions based on user patterns."""
        patterns = self.get_user_patterns(user_id)
        current_analysis = self.analyze_text(current_text)
        
        suggestions = []
        
        # Suggest based on common transitions
        if 'common_transitions' in patterns['writing_style_metrics']:
            common_transitions = patterns['writing_style_metrics']['common_transitions']
            if common_transitions:
                suggestions.extend(list(common_transitions.keys())[:3])
        
        # Suggest based on vocabulary level
        if 'vocabulary_level' in patterns['writing_style_metrics']:
            vocab_level = patterns['writing_style_metrics']['vocabulary_level']
            if vocab_level == 'basic':
                suggestions.extend(['and', 'but', 'so'])
            elif vocab_level == 'intermediate':
                suggestions.extend(['however', 'therefore', 'consequently'])
            else:
                suggestions.extend(['furthermore', 'moreover', 'consequently'])
        
        return suggestions 