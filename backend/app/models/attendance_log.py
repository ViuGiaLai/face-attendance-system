from app.models import db
from datetime import datetime

class AttendanceLog(db.Model):
    __tablename__ = 'attendance_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'check_in' or 'check_out'
    method = db.Column(db.String(20), nullable=False)  # 'face' or 'manual'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'timestamp': self.timestamp.isoformat(),
            'status': self.status,
            'method': self.method
        }
