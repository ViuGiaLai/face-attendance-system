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
    student_code = db.Column(db.String(50), unique=True, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(200), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), default='active')  # active, inactive, graduated, suspended
    face_image = db.Column(db.LargeBinary)
    face_encodings = db.Column(db.Text)
    face_registered_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendance_logs = db.relationship('AttendanceLog', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'student_code': self.student_code,
            'phone': self.phone,
            'department': self.department,
            'avatar_url': self.avatar_url,
            'status': self.status,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'face_registered_at': self.face_registered_at.isoformat() if self.face_registered_at else None,
            'has_face_image': bool(self.face_image),
            'is_face_registered': bool(self.face_registered_at)
        }