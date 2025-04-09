from typing import List, Dict, Tuple
from collections import defaultdict
import json
import os

class NGramModel:
    def __init__(self):
        self.bigrams = defaultdict(lambda: defaultdict(int))
        self.trigrams = defaultdict(lambda: defaultdict(int))
        self.unigrams = defaultdict(int)
        
    def train(self, text: str) -> None:
        """Train the model on input text."""
        words = text.lower().split()
        
        # Train unigrams
        for word in words:
            self.unigrams[word] += 1
            
        # Train bigrams
        for i in range(len(words) - 1):
            self.bigrams[words[i]][words[i + 1]] += 1
            
        # Train trigrams
        for i in range(len(words) - 2):
            self.trigrams[(words[i], words[i + 1])][words[i + 2]] += 1
            
    def predict(self, text: str, num_words: int = 5) -> List[str]:
        """Predict next words using trigram model with fallback to bigram and unigram."""
        words = text.lower().split()
        predictions = []
        
        if len(words) < 2:
            return self._get_top_unigrams(num_words)
            
        current_bigram = (words[-2], words[-1])
        
        for _ in range(num_words):
            # Try trigram first
            if current_bigram in self.trigrams:
                next_words = self.trigrams[current_bigram]
                if next_words:
                    next_word = max(next_words.items(), key=lambda x: x[1])[0]
                    predictions.append(next_word)
                    current_bigram = (current_bigram[1], next_word)
                    continue
                    
            # Fallback to bigram
            if current_bigram[1] in self.bigrams:
                next_words = self.bigrams[current_bigram[1]]
                if next_words:
                    next_word = max(next_words.items(), key=lambda x: x[1])[0]
                    predictions.append(next_word)
                    current_bigram = (current_bigram[1], next_word)
                    continue
                    
            # Fallback to unigram
            next_word = max(self.unigrams.items(), key=lambda x: x[1])[0]
            predictions.append(next_word)
            current_bigram = (current_bigram[1], next_word)
            
        return predictions
        
    def _get_top_unigrams(self, num_words: int) -> List[str]:
        """Get top unigrams by frequency."""
        return [word for word, _ in sorted(self.unigrams.items(), 
                                        key=lambda x: x[1], 
                                        reverse=True)[:num_words]]
                                        
    def save(self, filepath: str) -> None:
        """Save the model to a file."""
        data = {
            'bigrams': {k: dict(v) for k, v in self.bigrams.items()},
            'trigrams': {str(k): dict(v) for k, v in self.trigrams.items()},
            'unigrams': dict(self.unigrams)
        }
        with open(filepath, 'w') as f:
            json.dump(data, f)
            
    def load(self, filepath: str) -> None:
        """Load the model from a file."""
        if not os.path.exists(filepath):
            return
            
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        self.bigrams = defaultdict(lambda: defaultdict(int))
        for k, v in data['bigrams'].items():
            self.bigrams[k].update(v)
            
        self.trigrams = defaultdict(lambda: defaultdict(int))
        for k, v in data['trigrams'].items():
            k_tuple = tuple(eval(k))
            self.trigrams[k_tuple].update(v)
            
        self.unigrams = defaultdict(int)
        self.unigrams.update(data['unigrams']) 