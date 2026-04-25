FROM python:3.11-slim

WORKDIR /app

# ── Layer 1: PyTorch CPU (heavy) — before any COPY for stable caching ─────────
RUN pip install --no-cache-dir --timeout=300 --retries 5 \
    torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=600 --retries 10 -r requirements.txt

COPY . .

EXPOSE 8004
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
