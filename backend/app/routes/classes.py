from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.class_model import Class, ClassStudent
from app.models.user import User
from datetime import datetime

classes_bp = Blueprint('classes', __name__)


@classes_bp.route('', methods=['GET'])
@jwt_required()
def get_classes():
    try:
        classes = Class.query.filter_by(is_active=True).order_by(Class.name).all()
        return jsonify({'classes': [c.to_dict() for c in classes]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_classes():
    try:
        classes = Class.query.order_by(Class.name).all()
        return jsonify({'classes': [c.to_dict() for c in classes]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@classes_bp.route('', methods=['POST'])
@jwt_required()
def create_class():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        data = request.get_json()
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Tên và mã lớp là bắt buộc'}), 400

        existing = Class.query.filter_by(code=data['code']).first()
        if existing:
            return jsonify({'error': f'Mã lớp "{data["code"]}" đã tồn tại'}), 400

        new_class = Class(
            name=data['name'],
            code=data['code'],
            department=data.get('department'),
            teacher_id=data.get('teacher_id'),
            room=data.get('room'),
            schedule_description=data.get('schedule_description'),
        )
        db.session.add(new_class)
        db.session.commit()

        return jsonify({'message': 'Tạo lớp thành công', 'class': new_class.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>', methods=['GET'])
@jwt_required()
def get_class(class_id):
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404
        return jsonify({'class': cls.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>', methods=['PUT'])
@jwt_required()
def update_class(class_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404

        data = request.get_json()
        if data.get('name'):
            cls.name = data['name']
        if data.get('code'):
            existing = Class.query.filter(Class.code == data['code'], Class.id != class_id).first()
            if existing:
                return jsonify({'error': f'Mã lớp "{data["code"]}" đã tồn tại'}), 400
            cls.code = data['code']
        if data.get('department') is not None:
            cls.department = data['department']
        if data.get('teacher_id') is not None:
            cls.teacher_id = data['teacher_id']
        if data.get('room') is not None:
            cls.room = data['room']
        if data.get('schedule_description') is not None:
            cls.schedule_description = data['schedule_description']
        if data.get('is_active') is not None:
            cls.is_active = data['is_active']
        cls.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify({'message': 'Cập nhật lớp thành công', 'class': cls.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>', methods=['DELETE'])
@jwt_required()
def delete_class(class_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Yêu cầu quyền quản trị viên'}), 403

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404

        ClassStudent.query.filter_by(class_id=class_id).delete()
        db.session.delete(cls)
        db.session.commit()
        return jsonify({'message': 'Xóa lớp thành công'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>/students', methods=['GET'])
@jwt_required()
def get_class_students(class_id):
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404

        enrollments = ClassStudent.query.filter_by(class_id=class_id).all()
        return jsonify({'students': [e.to_dict() for e in enrollments]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>/students', methods=['POST'])
@jwt_required()
def add_student_to_class(class_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Không tìm thấy lớp'}), 404

        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'ID sinh viên là bắt buộc'}), 400

        student = User.query.get(user_id)
        if not student:
            return jsonify({'error': 'Không tìm thấy sinh viên'}), 404

        existing = ClassStudent.query.filter_by(class_id=class_id, user_id=user_id).first()
        if existing:
            return jsonify({'error': 'Sinh viên đã có trong lớp'}), 400

        enrollment = ClassStudent(class_id=class_id, user_id=user_id)
        db.session.add(enrollment)
        db.session.commit()

        return jsonify({'message': 'Thêm sinh viên thành công', 'student': enrollment.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@classes_bp.route('/<class_id>/students/<user_id>', methods=['DELETE'])
@jwt_required()
def remove_student_from_class(class_id, user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        enrollment = ClassStudent.query.filter_by(class_id=class_id, user_id=user_id).first()
        if not enrollment:
            return jsonify({'error': 'Sinh viên không có trong lớp'}), 404

        db.session.delete(enrollment)
        db.session.commit()
        return jsonify({'message': 'Xóa sinh viên khỏi lớp thành công'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
