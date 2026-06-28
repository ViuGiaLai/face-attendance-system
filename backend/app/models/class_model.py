from app.models import db
from datetime import datetime
import uuid

class Class(db.Model):
    __tablename__ = 'classes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(200))
    teacher_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    room = db.Column(db.String(100))
    schedule_description = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = db.relationship('User', backref='classes_teaching', foreign_keys=[teacher_id])
    students = db.relationship('ClassStudent', backref='class_ref', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        teacher_name = self.teacher.name if self.teacher else None
        student_count = self.students.count()
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'department': self.department,
            'teacher_id': self.teacher_id,
            'teacher_name': teacher_name,
            'room': self.room,
            'schedule_description': self.schedule_description,
            'is_active': self.is_active,
            'student_count': student_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    credits = db.Column(db.Integer, default=3)
    department = db.Column(db.String(200))
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'credits': self.credits,
            'department': self.department,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Schedule(db.Model):
    __tablename__ = 'schedules'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = db.Column(db.String(36), db.ForeignKey('classes.id'), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey('subjects.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    class_ref = db.relationship('Class', backref=db.backref('schedules', cascade='all, delete-orphan'), foreign_keys=[class_id])
    subject = db.relationship('Subject', backref=db.backref('schedules', cascade='all, delete-orphan'))

    def to_dict(self):
        days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
        return {
            'id': self.id,
            'class_id': self.class_id,
            'class_name': self.class_ref.name if self.class_ref else None,
            'class_code': self.class_ref.code if self.class_ref else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
            'day_of_week': self.day_of_week,
            'day_name': days[self.day_of_week] if 0 <= self.day_of_week < 7 else 'Unknown',
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'room': self.room,
        }


class ClassStudent(db.Model):
    __tablename__ = 'class_students'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = db.Column(db.String(36), db.ForeignKey('classes.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('User', backref=db.backref('class_enrollments', cascade='all, delete-orphan'), foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'user_id': self.user_id,
            'student_name': self.student.name if self.student else None,
            'student_email': self.student.email if self.student else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
