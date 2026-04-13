FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU-only first to avoid 500MB CUDA toolkit download
RUN pip install --no-cache-dir --timeout=300 \
    torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=120 -r requirements.txt

COPY . .

EXPOSE 8004
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
