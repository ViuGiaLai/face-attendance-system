from app.models import db
from datetime import datetime
import uuid

class AttendanceLog(db.Model):
    __tablename__ = 'attendance_logs'
    __table_args__ = {'extend_existing': True}  # Allow table redefinition
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # present, absent, late
    confidence = db.Column(db.Float)  # Confidence score from face recognition
    image_path = db.Column(db.String(255))  # Path to captured image
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'date': self.date.isoformat(),
            'time': self.time.isoformat(),
            'status': self.status,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat()
        }