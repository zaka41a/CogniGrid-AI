FROM python:3.11-slim

WORKDIR /app

# Dépendances système pour EasyOCR, PyMuPDF, lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    libmupdf-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Télécharge le modèle SpaCy
RUN python -m spacy download en_core_web_sm

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
