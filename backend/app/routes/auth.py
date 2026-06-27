from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import db
from app.models.user import User
from app.routes.audit import log_audit

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Vui lòng nhập đầy đủ thông tin', 'code': 'MISSING_DATA'}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not name:
            return jsonify({'error': 'Vui lòng nhập họ tên', 'field': 'name', 'code': 'MISSING_NAME'}), 400
        
        if not email:
            return jsonify({'error': 'Vui lòng nhập email', 'field': 'email', 'code': 'MISSING_EMAIL'}), 400
        
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Email không đúng định dạng', 'field': 'email', 'code': 'INVALID_EMAIL'}), 400
        
        if not password:
            return jsonify({'error': 'Vui lòng nhập mật khẩu', 'field': 'password', 'code': 'MISSING_PASSWORD'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự', 'field': 'password', 'code': 'SHORT_PASSWORD'}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email này đã được đăng ký', 'field': 'email', 'code': 'EMAIL_EXISTS'}), 400
        
        student_code = data.get('student_code', '').strip()
        if student_code:
            existing_code = User.query.filter_by(student_code=student_code).first()
            if existing_code:
                return jsonify({'error': 'Mã số sinh viên này đã được đăng ký', 'field': 'student_code', 'code': 'CODE_EXISTS'}), 400

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            name=name,
            role=data.get('role', 'student'),
            student_code=student_code or None,
            phone=data.get('phone', '').strip() or None,
            department=data.get('department', '').strip() or None,
        )
        
        db.session.add(user)
        db.session.commit()

        log_audit(user.id, 'register', 'user', user.id, 'Tự đăng ký tài khoản', request.remote_addr)

        return jsonify({
            'message': 'Đăng ký thành công!',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Lỗi máy chủ, vui lòng thử lại sau', 'code': 'SERVER_ERROR'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Vui lòng nhập email và mật khẩu', 'code': 'MISSING_DATA'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email:
            return jsonify({'error': 'Vui lòng nhập email', 'field': 'email', 'code': 'MISSING_EMAIL'}), 400
        
        if not password:
            return jsonify({'error': 'Vui lòng nhập mật khẩu', 'field': 'password', 'code': 'MISSING_PASSWORD'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'Email không tồn tại trong hệ thống', 'field': 'email', 'code': 'EMAIL_NOT_FOUND'}), 401
        
        if not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Mật khẩu không đúng', 'field': 'password', 'code': 'WRONG_PASSWORD'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên.', 'code': 'ACCOUNT_DEACTIVATED'}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'role': user.role}
        )
        
        log_audit(user.id, 'login', 'user', user.id, 'Đăng nhập', request.remote_addr)

        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Lỗi máy chủ, vui lòng thử lại sau', 'code': 'SERVER_ERROR'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500