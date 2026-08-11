#!/usr/bin/env bash
set -e

echo "=== Step 1: Install latest CPU-only PyTorch ==="
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet

echo "=== Step 2: Install remaining dependencies ==="
pip install -r requirements-prod.txt --quiet

echo "=== Step 3: Pre-download HuggingFace models (cache for fast startup) ==="
python - <<'PYEOF'
import os
from sentence_transformers import SentenceTransformer, CrossEncoder

embedding_model = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
reranker_model  = os.environ.get("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

print(f"Downloading embedding model: {embedding_model}")
SentenceTransformer(embedding_model)
print(f"Downloading reranker model:  {reranker_model}")
CrossEncoder(reranker_model)
print("Model download complete.")
PYEOF

echo "=== Build complete ==="
pip show torch | grep Version
