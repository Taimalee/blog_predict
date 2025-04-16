from datasets import load_dataset
from app.models.ngram_model import NGramModel
import os
from tqdm import tqdm

def train_ngram_model():
    # Initialize the n-gram model
    ngram_model = NGramModel()
    
    # Load the dataset (using wikitext as it's well-formatted and clean)
    print("Loading dataset...")
    dataset = load_dataset("wikitext", "wikitext-2-v1", split="train")
    
    # Process and train on the dataset
    print("Training n-gram model...")
    for batch in tqdm(dataset):
        if "text" in batch:
            text = batch["text"]
            # Only train on non-empty text
            if text and text.strip():
                ngram_model.train(text)
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Save the trained model
    model_path = os.path.join(data_dir, "ngram_model.json")
    print(f"Saving model to {model_path}...")
    ngram_model.save(model_path)
    print("Training complete!")

if __name__ == "__main__":
    train_ngram_model() 