from typing import List, Dict, Tuple
from collections import defaultdict
import json
import os
import math
import gc

class NGramModel:
    def __init__(self):
        self.bigrams = defaultdict(lambda: defaultdict(int))
        self.trigrams = defaultdict(lambda: defaultdict(int))
        self.fourgrams = defaultdict(lambda: defaultdict(int))
        self.unigrams = defaultdict(int)
        self.total_words = 0
        self._loaded = False
        
    def train(self, text: str) -> None:
        """Train the model on input text."""
        words = text.lower().split()
        
        # Train unigrams
        for word in words:
            self.unigrams[word] += 1
            self.total_words += 1
            
        # Train bigrams
        for i in range(len(words) - 1):
            self.bigrams[words[i]][words[i + 1]] += 1
            
        # Train trigrams
        for i in range(len(words) - 2):
            self.trigrams[(words[i], words[i + 1])][words[i + 2]] += 1
            
        # Train 4-grams
        for i in range(len(words) - 3):
            self.fourgrams[(words[i], words[i + 1], words[i + 2])][words[i + 3]] += 1
            
        # Force garbage collection after training
        gc.collect()
            
    def predict(self, text: str, num_words: int = 5, context_window: int = 3) -> List[str]:
        """
        Predict next words using interpolated n-gram model with 4-grams, trigrams, bigrams, and unigrams.
        
        Args:
            text: Input text
            num_words: Number of words to predict
            context_window: Number of previous words to consider for context
        """
        words = text.lower().split()
        
        # Take only the last 'context_window' words for context
        if len(words) > context_window:
            words = words[-context_window:]
            
        predictions = []
        
        # Interpolation weights - can be tuned based on performance
        w4 = 0.4  # 4-gram weight
        w3 = 0.3  # trigram weight
        w2 = 0.2  # bigram weight
        w1 = 0.1  # unigram weight
        
        for _ in range(num_words):
            candidates = {}
            
            # Get 4-gram probabilities if possible
            if len(words) >= 3:
                fourgram_context = (words[-3], words[-2], words[-1])
                if fourgram_context in self.fourgrams:
                    fourgram_total = sum(self.fourgrams[fourgram_context].values())
                    for word, count in self.fourgrams[fourgram_context].items():
                        candidates[word] = candidates.get(word, 0) + w4 * (count / fourgram_total)
            
            # Get trigram probabilities if possible
            if len(words) >= 2:
                trigram_context = (words[-2], words[-1])
                if trigram_context in self.trigrams:
                    trigram_total = sum(self.trigrams[trigram_context].values())
                    for word, count in self.trigrams[trigram_context].items():
                        candidates[word] = candidates.get(word, 0) + w3 * (count / trigram_total)
            
            # Get bigram probabilities
            if len(words) >= 1:
                if words[-1] in self.bigrams:
                    bigram_total = sum(self.bigrams[words[-1]].values())
                    for word, count in self.bigrams[words[-1]].items():
                        candidates[word] = candidates.get(word, 0) + w2 * (count / bigram_total)
            
            # Add unigram probabilities (with smoothing)
            unigram_total = self.total_words
            for word, count in self.unigrams.items():
                # Add-1 smoothing
                prob = (count + 1) / (unigram_total + len(self.unigrams))
                candidates[word] = candidates.get(word, 0) + w1 * prob
                
            # Choose the best candidate
            if candidates:
                next_word = max(candidates.items(), key=lambda x: x[1])[0]
                predictions.append(next_word)
                words.append(next_word)
                # Maintain context window
                if len(words) > context_window:
                    words = words[-context_window:]
            else:
                # Fallback to top unigram if no candidates found
                next_word = self._get_top_unigrams(1)[0]
                predictions.append(next_word)
                words.append(next_word)
                
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
            'fourgrams': {str(k): dict(v) for k, v in self.fourgrams.items()},
            'unigrams': dict(self.unigrams),
            'total_words': self.total_words
        }
        with open(filepath, 'w') as f:
            json.dump(data, f)
            
    def load(self, filepath: str) -> None:
        """Load the model from a file."""
        if not os.path.exists(filepath):
            return
            
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        # Clear existing data
        self.bigrams.clear()
        self.trigrams.clear()
        self.fourgrams.clear()
        self.unigrams.clear()
        
        # Load new data
        for k, v in data['bigrams'].items():
            self.bigrams[k].update(v)
            
        for k, v in data['trigrams'].items():
            k_tuple = tuple(eval(k))
            self.trigrams[k_tuple].update(v)
            
        if 'fourgrams' in data:
            for k, v in data['fourgrams'].items():
                k_tuple = tuple(eval(k))
                self.fourgrams[k_tuple].update(v)
                
        self.unigrams.update(data['unigrams'])
        self.total_words = data.get('total_words', sum(self.unigrams.values()))
        self._loaded = True
        
        # Force garbage collection after loading
        gc.collect()
        
    def _is_loaded(self) -> bool:
        """Check if the model is loaded."""
        return self._loaded 