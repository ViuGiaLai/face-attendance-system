FROM python:3.11-slim-bookworm

WORKDIR /app

# Install runtime dependencies for dlib (openblas, lapack) and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas-dev \
    liblapack-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install face-recognition without installing its dependencies (to prevent it compiling dlib)
RUN pip install --no-cache-dir face-recognition==1.3.0 --no-deps

COPY . .

EXPOSE 5000

# Use gunicorn for production (single-worker for face-recognition memory)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "run:app"]
