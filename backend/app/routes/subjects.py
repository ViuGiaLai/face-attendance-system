from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.class_model import Subject
from app.models.user import User
from datetime import datetime

subjects_bp = Blueprint('subjects', __name__)


@subjects_bp.route('', methods=['GET'])
@jwt_required()
def get_subjects():
    try:
        subjects = Subject.query.filter_by(is_active=True).order_by(Subject.name).all()
        return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@subjects_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_subjects():
    try:
        subjects = Subject.query.order_by(Subject.name).all()
        return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@subjects_bp.route('', methods=['POST'])
@jwt_required()
def create_subject():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        data = request.get_json()
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Tên và mã môn học là bắt buộc'}), 400

        existing = Subject.query.filter_by(code=data['code']).first()
        if existing:
            return jsonify({'error': f'Mã môn "{data["code"]}" đã tồn tại'}), 400

        subject = Subject(
            name=data['name'],
            code=data['code'],
            credits=data.get('credits', 3),
            department=data.get('department'),
            description=data.get('description'),
        )
        db.session.add(subject)
        db.session.commit()

        return jsonify({'message': 'Tạo môn học thành công', 'subject': subject.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@subjects_bp.route('/<subject_id>', methods=['GET'])
@jwt_required()
def get_subject(subject_id):
    try:
        subject = Subject.query.get(subject_id)
        if not subject:
            return jsonify({'error': 'Không tìm thấy môn học'}), 404
        return jsonify({'subject': subject.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@subjects_bp.route('/<subject_id>', methods=['PUT'])
@jwt_required()
def update_subject(subject_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        subject = Subject.query.get(subject_id)
        if not subject:
            return jsonify({'error': 'Không tìm thấy môn học'}), 404

        data = request.get_json()
        if data.get('name'):
            subject.name = data['name']
        if data.get('code'):
            existing = Subject.query.filter(Subject.code == data['code'], Subject.id != subject_id).first()
            if existing:
                return jsonify({'error': f'Mã môn "{data["code"]}" đã tồn tại'}), 400
            subject.code = data['code']
        if data.get('credits') is not None:
            subject.credits = data['credits']
        if data.get('department') is not None:
            subject.department = data['department']
        if data.get('description') is not None:
            subject.description = data['description']
        if data.get('is_active') is not None:
            subject.is_active = data['is_active']
        subject.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify({'message': 'Cập nhật môn học thành công', 'subject': subject.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@subjects_bp.route('/<subject_id>', methods=['DELETE'])
@jwt_required()
def delete_subject(subject_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Yêu cầu quyền quản trị viên'}), 403

        subject = Subject.query.get(subject_id)
        if not subject:
            return jsonify({'error': 'Không tìm thấy môn học'}), 404

        db.session.delete(subject)
        db.session.commit()
        return jsonify({'message': 'Xóa môn học thành công'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
