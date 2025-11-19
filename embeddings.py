from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer(r'D:\multi-qa-mpnet-base-dot-v1')

def compute_embedding(texts):

    if isinstance(texts, str):
        texts = [texts]
    if not texts:
        return np.zeros((0, model.get_sentence_embedding_dimension()), dtype=np.float32)

    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    if embeddings.ndim == 1:
        embeddings = np.expand_dims(embeddings, axis=0)

    return embeddings 
