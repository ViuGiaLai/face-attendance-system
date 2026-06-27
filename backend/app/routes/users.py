from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.user import User
from app.routes.audit import log_audit

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    try:
        role = request.args.get('role')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        search = request.args.get('search', '').strip()
        department = request.args.get('department')

        query = User.query

        if role:
            query = query.filter_by(role=role)

        if active_only:
            query = query.filter_by(is_active=True)

        if department:
            query = query.filter_by(department=department)

        if search:
            query = query.filter(
                db.or_(
                    User.name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.student_code.ilike(f'%{search}%'),
                    User.phone.ilike(f'%{search}%')
                )
            )

        users = query.order_by(User.name).all()

        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if 'name' in data:
            user.name = data['name']
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'student_code' in data:
            existing = User.query.filter(User.student_code == data['student_code'], User.id != user_id).first()
            if existing:
                return jsonify({'error': f'Mã số "{data["student_code"]}" đã tồn tại'}), 400
            user.student_code = data['student_code'] or None
        if 'phone' in data:
            user.phone = data['phone']
        if 'department' in data:
            user.department = data['department']
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        if 'status' in data:
            user.status = data['status']

        db.session.commit()

        admin_id = get_jwt_identity()
        log_audit(admin_id, 'update', 'user', user_id, f'Cập nhật user {user.name}', request.remote_addr)

        return jsonify({
            'message': 'Cập nhật người dùng thành công',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        name = user.name

        if user.face_encodings is not None or user.face_image is not None:
            user.face_encodings = None
            user.face_image = None
            user.face_registered_at = None
            db.session.commit()

        db.session.delete(user)
        db.session.commit()

        admin_id = get_jwt_identity()
        log_audit(admin_id, 'delete', 'user', user_id, f'Xóa user {name}', request.remote_addr)

        return jsonify({
            'message': 'User deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
