import os
from datetime import timedelta
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'f4c3-4tt3nd4nc3-sys-jwt-s3cr3t-k3y-32b')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'f4c3-4tt3nd4nc3-sys-jwt-s3cr3t-k3y-32b')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'sqlite:///attendance.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
