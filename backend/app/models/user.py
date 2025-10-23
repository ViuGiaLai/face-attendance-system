from app.models import db
from datetime import datetime
import uuid

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # student, teacher, admin
    face_image = db.Column(db.LargeBinary)  # Store raw face image data for backup
    face_encodings = db.Column(db.Text)  # JSON encoded face encodings (multiple per user)
    face_registered_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attendance_logs = db.relationship('AttendanceLog', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'face_registered_at': self.face_registered_at.isoformat() if self.face_registered_at else None,
            'has_face_image': bool(self.face_image),
            'is_face_registered': bool(self.face_registered_at)
        }