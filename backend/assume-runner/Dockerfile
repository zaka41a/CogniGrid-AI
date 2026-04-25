FROM python:3.11-slim

WORKDIR /app

# System deps for ASSUME (mango-agents needs eventfd, pandas needs numpy libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8006

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006"]
