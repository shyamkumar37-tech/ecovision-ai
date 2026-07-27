"""
app/ai/rag_pipeline.py
──────────────────────
Full RAG pipeline:
  1. Document ingestion  → extract → split → embed → store in ChromaDB
  2. Query              → embed → similarity search → prompt → OpenRouter LLM → answer
  3. Hallucination guard built into system prompt
  4. Redis caching for identical queries (TTL 1 hour)
  5. SDG auto-tagging on every AI response
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

try:
    import chromadb
except ImportError:
    chromadb = None

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    try:
        from langchain_community.chat_models import ChatOpenAI
    except ImportError:
        ChatOpenAI = None

try:
    from langchain.schema import HumanMessage, SystemMessage
except ImportError:
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
    except ImportError:
        HumanMessage, SystemMessage = None, None
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None
from loguru import logger

from app.core.config import settings


# ── SDG keyword → tag mapping ─────────────────────────────────────────────────

_SDG_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"energy|electricity|solar|renewable|kWh|power grid", re.I), "SDG 7"),
    (re.compile(r"campus|urban|building|infrastructure|transport|mobility", re.I), "SDG 11"),
    (re.compile(r"waste|recycl|plastic|landfill|consumption|packaging", re.I), "SDG 12"),
    (re.compile(r"carbon|CO2|emission|climate|greenhouse|footprint", re.I), "SDG 13"),
]


def tag_sdgs(text: str) -> list[str]:
    """Return deduplicated SDG tags found in *text*."""
    tags: list[str] = []
    for pattern, tag in _SDG_PATTERNS:
        if pattern.search(text) and tag not in tags:
            tags.append(tag)
    return tags


# ── Singleton resources (loaded once per worker process) ─────────────────────

class _Resources:
    _instance: "_Resources | None" = None

    def __init__(self) -> None:
        self._embedder = None
        self._chroma_client = None
        self._collection = None
        self._llm = None
        self._splitter = None

    @property
    def embedder(self):
        if self._embedder is None:
            logger.info("Lazy loading embedding model: {}", settings.EMBEDDING_MODEL)
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer(settings.EMBEDDING_MODEL, device="cpu")
        return self._embedder

    @property
    def chroma_client(self):
        if self._chroma_client is None:
            import chromadb
            if settings.CHROMA_HOST and settings.CHROMA_HOST not in ("localhost", "127.0.0.1"):
                try:
                    self._chroma_client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
                except Exception:
                    self._chroma_client = chromadb.PersistentClient(path="./chroma_db")
            else:
                self._chroma_client = chromadb.PersistentClient(path="./chroma_db")
        return self._chroma_client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.chroma_client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    @property
    def llm(self):
        if self._llm is None:
            try:
                from langchain_openai import ChatOpenAI
            except ImportError:
                from langchain_community.chat_models import ChatOpenAI
            self._llm = ChatOpenAI(
                model=settings.OPENROUTER_MODEL,
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base="https://openrouter.ai/api/v1",
                max_tokens=512,
                temperature=0.3,
                model_kwargs={
                    "extra_headers": {
                        "HTTP-Referer": "https://ecovision-ai.onrender.com",
                        "X-Title": "EcoVision AI",
                    },
                },
            )
        return self._llm

    @property
    def splitter(self):
        if self._splitter is None:
            try:
                from langchain_text_splitters import RecursiveCharacterTextSplitter
            except ImportError:
                from langchain.text_splitter import RecursiveCharacterTextSplitter
            self._splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
                separators=["\n\n", "\n", ".", " "],
            )
        return self._splitter

    @classmethod
    def get(cls) -> "_Resources":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


# ── Document ingestion ────────────────────────────────────────────────────────

def extract_text(file_path: str, mime_type: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    path = Path(file_path)

    if mime_type == "application/pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(str(path))
        return "\n\n".join(page.get_text() for page in doc)

    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        from docx import Document
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    # plain text
    return path.read_text(encoding="utf-8", errors="replace")


def index_document(
    document_id: str,
    file_path: str,
    filename: str,
    mime_type: str,
    institution_id: str,
) -> int:
    """
    Full ingestion pipeline:
      extract → split → embed → store in ChromaDB
    Returns the number of chunks stored.
    """
    res = _Resources.get()

    raw_text = extract_text(file_path, mime_type)
    if not raw_text.strip():
        raise ValueError(f"No extractable text in {filename}")

    chunks = res.splitter.split_text(raw_text)
    logger.info("Document '{}' → {} chunks", filename, len(chunks))

    embeddings = res.embedder.encode(chunks, show_progress_bar=False).tolist()

    ids      = [f"{document_id}_{i}" for i in range(len(chunks))]
    metadata = [
        {
            "document_id":    document_id,
            "filename":       filename,
            "institution_id": institution_id,
            "chunk_index":    i,
        }
        for i in range(len(chunks))
    ]

    # ChromaDB batch upsert
    res.collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadata,
    )

    return len(chunks)


def delete_document_chunks(document_id: str) -> None:
    """Remove all ChromaDB vectors belonging to *document_id*."""
    res = _Resources.get()
    results = res.collection.get(where={"document_id": document_id})
    if results["ids"]:
        res.collection.delete(ids=results["ids"])


# ── RAG query ─────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are EcoVision AI, a sustainability assistant for a university campus.
You help faculty, students, and sustainability officers understand energy usage,
water consumption, waste management, and carbon footprint reduction.

Rules:
- Only answer based on the provided context documents.
- If the answer is not in the context, say exactly:
  "I don't have enough information to answer that from the available documents."
- Cite the source document name when you use information from it.
- Tag relevant SDGs at the end of your answer using format [SDG X].
- Be concise, practical, and actionable.
"""


def _build_prompt(context_chunks: list[dict], question: str) -> str:
    context_text = "\n\n---\n\n".join(
        f"[Source: {c['filename']}, chunk {c['chunk_index']}]\n{c['text']}"
        for c in context_chunks
    )
    return (
        f"=== CONTEXT DOCUMENTS ===\n{context_text}\n\n"
        f"=== USER QUESTION ===\n{question}\n\n"
        f"=== ANSWER ==="
    )


def query_rag(
    question: str,
    institution_id: str,
    redis_client: Any,                   # redis.Redis or None
) -> dict:
    """
    Full RAG query:
      embed question → similarity search → build prompt → OpenRouter LLM → answer
    Returns: {"answer": str, "sources": list[dict], "sdg_tags": list[str]}
    """
    # ── Cache check ───────────────────────────────────────────────────────────
    cache_key = "rag:" + hashlib.sha256(
        f"{institution_id}:{question}".encode()
    ).hexdigest()

    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            logger.debug("RAG cache hit for key {}", cache_key)
            return json.loads(cached)

    res = _Resources.get()

    # ── Embed & retrieve ──────────────────────────────────────────────────────
    q_embedding = res.embedder.encode([question], show_progress_bar=False)[0].tolist()

    results = res.collection.query(
        query_embeddings=[q_embedding],
        n_results=settings.TOP_K_RESULTS,
        where={"institution_id": institution_id},
    )

    context_chunks = [
        {
            "text":        doc,
            "filename":    meta["filename"],
            "chunk_index": meta["chunk_index"],
            "document_id": meta["document_id"],
        }
        for doc, meta in zip(
            results["documents"][0],
            results["metadatas"][0],
        )
    ]

    # ── Generate with OpenRouter ──────────────────────────────────────────────
    if context_chunks:
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=_build_prompt(context_chunks, question)),
        ]
        response = res.llm.invoke(messages)
        answer = response.content
    else:
        answer = "I don't have enough information to answer that from the available documents."

    sdg_tags = tag_sdgs(answer)

    payload = {
        "answer":   answer.strip(),
        "sources":  context_chunks,
        "sdg_tags": sdg_tags,
    }

    # ── Cache result ──────────────────────────────────────────────────────────
    if redis_client:
        redis_client.setex(cache_key, settings.CACHE_TTL_SECONDS, json.dumps(payload))

    return payload


# ── Streaming variant (generator) ────────────────────────────────────────────

def stream_rag(
    question: str,
    institution_id: str,
    redis_client: Any,
) -> Any:
    """
    Generator that yields text tokens one-by-one for StreamingResponse.
    Uses OpenRouter streaming via LangChain's ChatOpenAI stream() method.
    """
    # ── Cache check ───────────────────────────────────────────────────────────
    cache_key = "rag:" + hashlib.sha256(
        f"{institution_id}:{question}".encode()
    ).hexdigest()

    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            yield data["answer"]
            yield f"\n\n__SOURCES__:{json.dumps(data['sources'])}"
            yield f"\n__SDGS__:{json.dumps(data['sdg_tags'])}"
            return

    res = _Resources.get()

    q_embedding = res.embedder.encode([question], show_progress_bar=False)[0].tolist()
    results = res.collection.query(
        query_embeddings=[q_embedding],
        n_results=settings.TOP_K_RESULTS,
        where={"institution_id": institution_id},
    )

    context_chunks = [
        {
            "text":        doc,
            "filename":    meta["filename"],
            "chunk_index": meta["chunk_index"],
            "document_id": meta["document_id"],
        }
        for doc, meta in zip(results["documents"][0], results["metadatas"][0])
    ]

    full_answer = ""
    if context_chunks:
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=_build_prompt(context_chunks, question)),
        ]
        for chunk in res.llm.stream(messages):
            token = chunk.content
            full_answer += token
            yield token
    else:
        full_answer = "I don't have enough information to answer that from the available documents."
        yield full_answer

    sdg_tags = tag_sdgs(full_answer)

    # Cache full response
    if redis_client:
        payload = {"answer": full_answer.strip(), "sources": context_chunks, "sdg_tags": sdg_tags}
        redis_client.setex(cache_key, settings.CACHE_TTL_SECONDS, json.dumps(payload))

    yield f"\n\n__SOURCES__:{json.dumps(context_chunks)}"
    yield f"\n__SDGS__:{json.dumps(sdg_tags)}"
