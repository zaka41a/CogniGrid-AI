FROM python:3.11-slim

WORKDIR /app

# System deps for EasyOCR, PyMuPDF, lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    libmupdf-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 1: PyTorch CPU (heavy, ~700 MB) ─────────────────────────────────────
# Installed BEFORE any COPY so this layer stays cached even when
# requirements change. Re-runs only if this RUN line itself changes.
RUN pip install --no-cache-dir --timeout=300 --retries 5 \
    torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu

# ── Layer 2: Base packages (web, DB, parsers, storage) ────────────────────────
COPY requirements-base.txt .
RUN pip install --no-cache-dir --timeout=300 --retries 10 -r requirements-base.txt

# ── Layer 3: ML / NLP packages (medium weight) ────────────────────────────────
COPY requirements-ml.txt .
RUN pip install --no-cache-dir --timeout=300 --retries 10 -r requirements-ml.txt

# Download SpaCy model
RUN python -m spacy download en_core_web_sm

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
