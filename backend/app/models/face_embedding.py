from app.models import db
from datetime import datetime
import uuid
import json

class FaceEmbedding(db.Model):
    __tablename__ = 'face_embeddings'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    embedding = db.Column(db.Text, nullable=False)  # Stored as JSON string of the float array
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'embedding': json.loads(self.embedding) if self.embedding else [],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
