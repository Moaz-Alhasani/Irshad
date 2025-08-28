from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer(r'D:\sent transformres\all-MiniLM-L6-v2')

def compute_embedding(texts):
    if not texts:
        return []
    embeddings = model.encode(texts)
    avg_embedding = np.mean(embeddings, axis=0).tolist()
    return avg_embedding