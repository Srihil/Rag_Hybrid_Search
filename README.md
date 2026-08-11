# Production RAG — Hybrid Search & Grounded Document Intelligence

A complete, production-quality Retrieval-Augmented Generation system that treats retrieval quality, ranking, grounding, and citation accuracy as first-class engineering problems.

---

## Why Basic RAG Is Not Enough

A naive pipeline looks like:

```
Document → chunks → embeddings → vector database → LLM
```

This fails when:
- Exact terminology matters (product codes, policy names, acronyms)
- Semantically similar but incorrect passages are retrieved
- The LLM hallucinates citations

This project combines **dense retrieval + BM25** through **Reciprocal Rank Fusion**, then applies **cross-encoder reranking** before sending carefully grounded evidence to the LLM.

---

## Architecture

```
Document Upload
    ↓
Parser (PDF / DOCX / TXT)
    ↓
Structure-Aware Chunker (paragraph → sentence → character boundaries)
    ↓
Local Embedding Model (BAAI/bge-small-en-v1.5)
    ↓
    ├─→ Qdrant (dense vectors)
    └─→ BM25 Index (lexical, rank_bm25)
         └─→ PostgreSQL (chunks + metadata)

User Query
    ↓
Dense Retrieval (Qdrant cosine similarity, top-20)
BM25 Retrieval (lexical keyword match, top-20)
    ↓
Reciprocal Rank Fusion (k=60)
    ↓
Cross-Encoder Reranking (cross-encoder/ms-marco-MiniLM-L-6-v2)
    ↓
Top-K Evidence Selection
    ↓
Context Construction ([Source N] blocks with metadata)
    ↓
LLM Generation (Ollama local / OpenRouter free)
    ↓
Citation Extraction ([1], [2], …)
Citation Verification (against retrieved evidence)
    ↓
Grounded Response
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | Python + FastAPI + Pydantic |
| Database | PostgreSQL (app state) + Qdrant (vectors) |
| Embeddings | BAAI/bge-small-en-v1.5 (local, sentence-transformers) |
| BM25 | rank_bm25 |
| Reranker | cross-encoder/ms-marco-MiniLM-L-6-v2 (local) |
| LLM | Ollama (primary, local) or OpenRouter (free tier) |
| Deployment | Docker Compose |

---

## Local Setup

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.11+
- [Ollama](https://ollama.ai) installed and running

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env if needed
```

### 2. Pull an Ollama model

```bash
ollama pull llama3.2:3b
# or for better quality:
ollama pull mistral:7b
```

### 3. Start infrastructure

```bash
docker-compose up -d db qdrant
```

### 4. Start backend (development)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Start frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Full Docker deployment

```bash
docker-compose up --build
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8000  
API docs: http://localhost:8000/docs

---

## Using OpenRouter (Free Models)

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

Free models available: `meta-llama/llama-3.1-8b-instruct:free`, `google/gemma-2-9b-it:free`, `mistralai/mistral-7b-instruct:free`

---

## Running Tests

```bash
cd backend
pytest tests/unit/ -v
```

---

## Evaluation

1. Upload documents via the Documents page
2. Find chunk IDs via `GET /api/documents/{id}/chunks`
3. Update `backend/eval_data/evaluation_set.json` with real chunk IDs
4. POST the questions to `POST /api/evaluation/dataset`
5. Click **Run Evaluation** on the Evaluation page

Metrics computed: **Recall@5**, **Hit Rate**, **MRR** across BM25, Dense, Hybrid, Hybrid+Reranker.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Service + model status |
| `/api/documents/upload` | POST | Upload document (multipart) |
| `/api/documents/` | GET | List documents |
| `/api/documents/{id}` | DELETE | Delete document |
| `/api/documents/{id}/chunks` | GET | View chunks |
| `/api/query/` | POST | Ask a question |
| `/api/query/history` | GET | Query history |
| `/api/query/{id}` | GET | Query detail + retrieval trace |
| `/api/evaluation/run` | POST | Run evaluation |
| `/api/evaluation/results` | GET | Latest evaluation results |

---

## Interview Questions This Demonstrates

**Why BM25?** Exact lexical matches catch product codes, policy names, and acronyms that semantic similarity misses.

**Why dense retrieval?** Semantic similarity finds conceptually related passages even when exact words differ.

**Why hybrid?** Both approaches have complementary failure modes. Combining them improves candidate coverage.

**Why RRF?** Combines ranked lists from systems with incomparable score distributions without requiring score normalization. The k=60 constant from Cormack et al. (2009) reduces sensitivity to outliers.

**Why reranking?** Initial retrievers efficiently generate candidates; the cross-encoder performs expensive joint attention over query+passage on a small candidate set, producing more accurate relevance scores.

**Why citations?** Users of enterprise document systems need to verify where answers came from. The system verifies every [N] citation maps to actually-retrieved evidence.

**What happens when evidence is missing?** The LLM is instructed to explicitly say so, and the system returns `status: insufficient_evidence` rather than manufacturing a confident answer.

---

## Limitations

- BM25 index is rebuilt from PostgreSQL on backend restart (fast but not persistent across cold starts without the DB)
- Single-node, no horizontal scaling
- No authentication (portfolio scope)
- Evaluation dataset must be manually populated with real chunk IDs after ingestion
