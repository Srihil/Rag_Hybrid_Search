#!/usr/bin/env bash
set -e

echo "=== Step 1: Install dependencies (ONNX-based, no PyTorch) ==="
pip install -r requirements-prod.txt --quiet

echo "=== Step 2: Pre-download HuggingFace models into build cache ==="
python - <<'PYEOF'
import os
from fastembed import TextEmbedding
from fastembed.rerank.cross_encoder import TextCrossEncoder

embedding_model = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
reranker_model  = os.environ.get("RERANKER_MODEL",  "Xenova/ms-marco-MiniLM-L-6-v2")

print(f"Downloading embedding model: {embedding_model}")
TextEmbedding(embedding_model)
print(f"Downloading reranker model:  {reranker_model}")
try:
    TextCrossEncoder(reranker_model)
except Exception as e:
    print(f"Reranker download skipped (will degrade gracefully): {e}")

print("Model download complete.")
PYEOF

echo "=== Build complete ==="
