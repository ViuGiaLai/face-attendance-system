from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.user import User

users_bp = Blueprint('users', __name__)

@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    try:
        role = request.args.get('role')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        query = User.query
        
        if role:
            query = query.filter_by(role=role)
        
        if active_only:
            query = query.filter_by(is_active=True)
        
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
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Delete associated face data if it exists
        if user.face_encodings is not None or user.face_image is not None:
            # Clear face-related data
            user.face_encodings = None
            user.face_image = None
            user.face_registered_at = None
            db.session.commit()
            
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500