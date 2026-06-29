from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from app.models.user import User
from app.models.attendance import AttendanceLog
from app.models.class_model import Class, Subject, Schedule, ClassStudent
from app.models.audit_log import AuditLog
from app.models.face_embedding import FaceEmbedding