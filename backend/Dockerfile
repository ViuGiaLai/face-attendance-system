FROM python:3.11-slim-bookworm

WORKDIR /app

# Install build deps for dlib (face-recognition)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libgtk-3-dev libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Use gunicorn for production (single-worker for face-recognition memory)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "run:app"]
