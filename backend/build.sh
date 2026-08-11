#!/usr/bin/env bash
set -e

echo "=== Step 1: Install latest CPU-only PyTorch ==="
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet

echo "=== Step 2: Install remaining dependencies ==="
pip install -r requirements-prod.txt --quiet

echo "=== Build complete ==="
pip show torch | grep Version
