from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.class_model import Schedule, Class, Subject
from app.models.user import User
from datetime import datetime, time

schedules_bp = Blueprint('schedules', __name__)


@schedules_bp.route('', methods=['GET'])
@jwt_required()
def get_schedules():
    try:
        class_id = request.args.get('class_id')
        day_of_week = request.args.get('day_of_week')

        query = Schedule.query
        if class_id:
            query = query.filter_by(class_id=class_id)
        if day_of_week is not None:
            query = query.filter_by(day_of_week=int(day_of_week))

        schedules = query.order_by(Schedule.day_of_week, Schedule.start_time).all()
        return jsonify({'schedules': [s.to_dict() for s in schedules]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('', methods=['POST'])
@jwt_required()
def create_schedule():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        data = request.get_json()
        if not data.get('class_id') or not data.get('subject_id'):
            return jsonify({'error': 'Lớp và môn học là bắt buộc'}), 400
        if data.get('day_of_week') is None:
            return jsonify({'error': 'Thứ trong tuần là bắt buộc'}), 400

        cls = Class.query.get(data['class_id'])
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404

        subject = Subject.query.get(data['subject_id'])
        if not subject:
            return jsonify({'error': 'Không tìm thấy môn học'}), 404

        def parse_time(t):
            if isinstance(t, str):
                parts = t.split(':')
                return time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
            return t

        schedule = Schedule(
            class_id=data['class_id'],
            subject_id=data['subject_id'],
            day_of_week=data['day_of_week'],
            start_time=parse_time(data['start_time']),
            end_time=parse_time(data['end_time']),
            room=data.get('room'),
        )
        db.session.add(schedule)
        db.session.commit()

        return jsonify({'message': 'Tạo lịch học thành công', 'schedule': schedule.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/<schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        schedule = Schedule.query.get(schedule_id)
        if not schedule:
            return jsonify({'error': 'Không tìm thấy lịch học'}), 404

        data = request.get_json()

        def parse_time(t):
            if isinstance(t, str):
                parts = t.split(':')
                return time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
            return t

        if data.get('class_id'):
            schedule.class_id = data['class_id']
        if data.get('subject_id'):
            schedule.subject_id = data['subject_id']
        if data.get('day_of_week') is not None:
            schedule.day_of_week = data['day_of_week']
        if data.get('start_time'):
            schedule.start_time = parse_time(data['start_time'])
        if data.get('end_time'):
            schedule.end_time = parse_time(data['end_time'])
        if data.get('room') is not None:
            schedule.room = data['room']

        db.session.commit()
        return jsonify({'message': 'Cập nhật lịch học thành công', 'schedule': schedule.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@schedules_bp.route('/<schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Yêu cầu quyền quản trị viên'}), 403

        schedule = Schedule.query.get(schedule_id)
        if not schedule:
            return jsonify({'error': 'Không tìm thấy lịch học'}), 404

        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'message': 'Xóa lịch học thành công'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
