from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from functools import wraps
from datetime import datetime, date, timedelta
import base64
import json
import traceback
import time
from sqlalchemy import func
from werkzeug.security import generate_password_hash

from app.models import db
from app.models.user import User
from app.models.attendance import AttendanceLog
from app.services.face_engine_simple import face_engine

# Rate limiting storage
registration_attempts = {}

# Decorator for admin/teacher only endpoints
def admin_or_teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403
        return f(*args, **kwargs)
    return decorated_function

face_bp = Blueprint('face', __name__)

# Rate limiting decorator
def rate_limit_register(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        current_time = time.time()
        
        # Clean up old entries
        registration_attempts[user_id] = [t for t in registration_attempts.get(user_id, []) 
                                        if current_time - t < 60]  # 1 minute window
        
        # Check rate limit (max 5 attempts per minute)
        if len(registration_attempts.get(user_id, [])) >= 5:
            return jsonify({
                'error': 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.'
            }), 429
            
        # Record this attempt
        if user_id not in registration_attempts:
            registration_attempts[user_id] = []
        registration_attempts[user_id].append(current_time)
        
        return f(*args, **kwargs)
    return decorated_function

@face_bp.route('/register-status/<string:user_id>', methods=['GET'])
@jwt_required()
def get_face_registration_status(user_id):
    """Get the current face registration status for a user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        # Check permissions
        if str(current_user_id) != str(user_id) and current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Không có quyền truy cập'}), 403
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        # Check database encodings
        encodings_count = 0
        encodings = []
        if user.face_encodings:
            try:
                encodings = json.loads(user.face_encodings)
                encodings_count = len(encodings)
            except Exception as e:
                print(f"Error parsing face encodings: {e}")
                return jsonify({'error': 'Lỗi khi đọc dữ liệu khuôn mặt'}), 500
        
        # Get temporary encodings count
        temp_count = face_engine.get_face_encodings_count(user_id)
        total_count = encodings_count + temp_count
        
        # Calculate registration progress (0-100%)
        progress = min(100, (total_count / 5) * 100) if total_count <= 5 else 100
        
        return jsonify({
            'user_id': user_id,
            'user_name': user.name,
            'face_encodings_count': total_count,
            'saved_encodings_count': encodings_count,
            'temp_encodings_count': temp_count,
            'registration_complete': total_count >= 5,
            'has_face_encoding': total_count > 0,
            'progress': progress,
            'remaining_images': max(0, 5 - total_count)
        }), 200
        
    except Exception as e:
        error_msg = f"Error in get_face_registration_status: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            'error': 'Lỗi khi lấy trạng thái đăng ký khuôn mặt',
            'details': str(e)
        }), 500

@face_bp.route('/register', methods=['POST'])
@jwt_required()
@rate_limit_register
def register_face():
    try:
        data = request.get_json()
        print(f"Register face request received for user: {data.get('user_id')}")
        
        if not data or not data.get('image_data'):
            return jsonify({'error': 'Thiếu dữ liệu ảnh'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'Thiếu ID người dùng'}), 400
            
        # Check if user exists and is active
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'Tài khoản người dùng đã bị vô hiệu hóa'}), 400
        
        # Get current user making the request
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'Người dùng hiện tại không tồn tại'}), 404
        
        # Check permissions
        if str(current_user_id) != str(user_id) and current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Bạn không có quyền đăng ký khuôn mặt cho người khác'}), 403
        
        # Decode base64 image
        try:
            print("Decoding image data...")
            if ',' in data['image_data']:
                image_data = base64.b64decode(data['image_data'].split(',')[-1])
            else:
                image_data = base64.b64decode(data['image_data'])
            print(f"Image decoded successfully, size: {len(image_data)} bytes")
        except Exception as e:
            error_msg = f'Định dạng ảnh không hợp lệ: {str(e)}'
            print(error_msg)
            return jsonify({'error': error_msg}), 400
        
        # Get face encoding using face_engine
        print("Encoding face from image...")
        face_encoding = face_engine.encode_face_from_image(image_data)
        
        if face_encoding is None:
            return jsonify({
                'error': 'Không thể trích xuất đặc trưng khuôn mặt',
                'details': 'Không tìm thấy khuôn mặt trong ảnh hoặc chất lượng ảnh kém',
                'code': 'NO_FACE_DETECTED'
            }), 400
        
        print(f"Face encoding successful, length: {len(face_encoding)}")
        
        # Convert numpy array to list for storage
        if hasattr(face_encoding, 'tolist'):
            face_encoding = face_encoding.tolist()
        
        # Add encoding to temporary storage
        success = face_engine.add_face_encoding(user_id, face_encoding)
        
        if not success:
            return jsonify({'error': 'Không thể lưu đặc trưng khuôn mặt'}), 400
        
        # Get current encodings count
        temp_count = face_engine.get_face_encodings_count(user_id)
        
        # Get existing encodings from database
        db_count = 0
        existing_encodings = []
        if user.face_encodings:
            try:
                existing_encodings = json.loads(user.face_encodings)
                # Ensure all encodings are lists, not numpy arrays
                existing_encodings = [enc.tolist() if hasattr(enc, 'tolist') else enc 
                                   for enc in existing_encodings]
                db_count = len(existing_encodings)
                print(f"Found {db_count} existing encodings in database")
            except Exception as e:
                print(f"Error loading existing encodings: {e}")
                return jsonify({
                    'error': 'Lỗi khi đọc dữ liệu khuôn mặt hiện có',
                    'details': str(e)
                }), 500
        
        total_count = db_count + temp_count
        print(f"Total encodings: {total_count} (DB: {db_count}, Temp: {temp_count})")
        
        # Check if we have enough images to complete registration
        if total_count >= 5:
            return _complete_registration(user, existing_encodings, temp_count)
        else:
            progress = (total_count / 5) * 100
            return jsonify({
                'message': f'Đã thêm ảnh khuôn mặt ({total_count}/5)',
                'face_encodings_count': total_count,
                'saved_encodings_count': db_count,
                'temp_encodings_count': temp_count,
                'registration_complete': False,
                'remaining_images': 5 - total_count,
                'progress': progress,
                'user_id': user_id,
                'user_name': user.name
            }), 200
        
    except Exception as e:
        db.session.rollback()
        error_msg = f'Lỗi khi đăng ký khuôn mặt: {str(e)}'
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            'error': 'Lỗi khi xử lý yêu cầu đăng ký khuôn mặt',
            'details': str(e)
        }), 500

def _complete_registration(user, existing_encodings, temp_count):
    """Helper function to complete face registration"""
    try:
        user_id = user.id
        # Get new encodings from temporary storage
        temp_encodings = face_engine.temp_face_encodings.get(user_id, [])
        
        # Ensure all encodings are lists, not numpy arrays
        temp_encodings = [enc.tolist() if hasattr(enc, 'tolist') else enc 
                         for enc in temp_encodings]
        
        # Ensure existing encodings are also lists
        existing_encodings = [enc.tolist() if hasattr(enc, 'tolist') else enc 
                            for enc in existing_encodings]
        
        # Combine existing and new encodings
        all_encodings = existing_encodings.copy()
        all_encodings.extend(temp_encodings)
        
        # Keep only the most recent encodings (max 10)
        if len(all_encodings) > 10:
            all_encodings = all_encodings[-10:]
        
        # Save to database
        try:
            user.face_encodings = json.dumps(all_encodings)
            user.face_registered = True
            user.face_registered_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error saving encodings to database: {str(e)}")
            raise
        
        # Refresh the user object to get the updated values
        db.session.refresh(user)
        
        # Clear temporary storage
        face_engine.clear_temp_encodings(user_id)
        
        # Reload face encodings for recognition
        users_with_faces = User.query.filter(
            User.face_encodings.isnot(None),
            User.is_active == True
        ).all()
        face_engine.load_face_encodings_from_db(users_with_faces)
        
        print(f"Registration completed with {len(all_encodings)} encodings for user {user_id}")
        
        return jsonify({
            'message': 'Đăng ký khuôn mặt hoàn tất!',
            'face_encodings_count': len(all_encodings),
            'saved_encodings_count': len(all_encodings),
            'temp_encodings_count': 0,
            'registration_complete': True,
            'total_saved': len(all_encodings),
            'progress': 100,
            'user_id': user_id,
            'user_name': user.name
        }), 200
        
    except Exception as e:
        db.session.rollback()
        error_msg = f'Lỗi khi hoàn tất đăng ký khuôn mặt: {str(e)}'
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            'error': 'Lỗi khi hoàn tất đăng ký khuôn mặt',
            'details': str(e)
        }), 500

@face_bp.route('/recognize', methods=['POST'])
@jwt_required()
def recognize_face():
    try:
        print("Received request to /api/face/recognize")
        data = request.get_json()
        
        if not data or not data.get('image_data'):
            print("Error: No image data provided")
            return jsonify({
                'recognized': False,
                'error': 'Thiếu dữ liệu ảnh',
                'code': 'MISSING_IMAGE_DATA'
            }), 400
        
        try:
            print("Attempting to decode image data...")
            # Extract base64 data
            if ',' in data['image_data']:
                image_data = base64.b64decode(data['image_data'].split(',')[-1])
            else:
                image_data = base64.b64decode(data['image_data'])
            print(f"Successfully decoded image data. Size: {len(image_data)} bytes")
        except Exception as e:
            error_msg = f"Error decoding image data: {str(e)}"
            print(error_msg)
            return jsonify({
                'recognized': False,
                'error': 'Định dạng ảnh không hợp lệ',
                'details': error_msg,
                'code': 'INVALID_IMAGE_FORMAT'
            }), 400
        
        try:
            print("Attempting face recognition...")
            # Ensure face encodings are loaded
            users_with_faces = User.query.filter(
                User.face_encodings.isnot(None),
                User.is_active == True
            ).all()
            
            if not users_with_faces:
                return jsonify({
                    'recognized': False,
                    'error': 'Không có dữ liệu khuôn mặt nào trong hệ thống',
                    'code': 'NO_FACE_DATA'
                }), 400
                
            face_engine.load_face_encodings_from_db(users_with_faces)
            
            # Recognize face
            user_id, confidence = face_engine.recognize_face(image_data)
            print(f"Face recognition result - User ID: {user_id}, Confidence: {confidence}")
            
            if user_id and confidence > 0.6:  # Confidence threshold
                return _process_recognized_user(user_id, confidence)
            else:
                print(f"No face recognized or low confidence: {confidence}")
                return jsonify({
                    'recognized': False,
                    'message': 'Không nhận diện được khuôn mặt hoặc độ tin cậy thấp',
                    'confidence': float(confidence) if confidence else 0.0,
                    'code': 'LOW_CONFIDENCE' if confidence else 'NO_FACE_DETECTED'
                }), 200
                
        except Exception as e:
            error_msg = f"Error in face recognition: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            return jsonify({
                'recognized': False,
                'error': 'Lỗi trong quá trình nhận diện khuôn mặt',
                'details': error_msg,
                'type': type(e).__name__,
                'code': 'RECOGNITION_ERROR'
            }), 500
            
    except Exception as e:
        error_msg = f"Unexpected error in /recognize endpoint: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            'recognized': False,
            'error': 'Lỗi máy chủ nội bộ',
            'details': error_msg,
            'type': type(e).__name__,
            'code': 'INTERNAL_SERVER_ERROR'
        }), 500

def _process_recognized_user(user_id, confidence):
    """Helper function to process recognized user and log attendance"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'recognized': False,
                'error': 'Người dùng không tồn tại',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        print(f"Recognized user {user.name} with confidence {confidence}")
        
        # Check if already logged today
        today = date.today()
        existing_log = AttendanceLog.query.filter_by(
            user_id=user_id, date=today
        ).first()
        
        if existing_log:
            return jsonify({
                'recognized': True,
                'message': f'{user.name} đã điểm danh hôm nay',
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                },
                'confidence': float(confidence),
                'already_logged': True,
                'timestamp': datetime.utcnow().isoformat(),
                'attendance_id': existing_log.id
            }), 200
        
        # Log the attendance
        now = datetime.utcnow()
        attendance = AttendanceLog(
            user_id=user.id,
            date=today,
            time=now.time(),
            status='present',
            confidence=float(confidence),
            created_at=now
        )
        db.session.add(attendance)
        db.session.commit()
        print("Attendance logged successfully")
        
        return jsonify({
            'recognized': True,
            'message': f'Điểm danh thành công cho {user.name}!',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role
            },
            'confidence': float(confidence),
            'already_logged': False,
            'timestamp': now.isoformat(),
            'attendance_id': attendance.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        error_msg = f"Error processing recognized user: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({
            'recognized': False,
            'error': 'Lỗi khi xử lý thông tin người dùng',
            'details': str(e),
            'code': 'USER_PROCESSING_ERROR'
        }), 500

@face_bp.route('/register/batch', methods=['POST'])
@jwt_required()
def batch_register_faces():
    try:
        data = request.get_json()
        
        user_id = data.get('user_id')
        images = data.get('images', [])
        
        if not user_id or not images:
            return jsonify({'error': 'Thiếu user_id hoặc danh sách ảnh'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        all_encodings = []
        successful_images = 0
        
        for image_data in images:
            face_encoding = face_engine.encode_face_from_image(image_data)
            if face_encoding is not None:
                # Convert numpy array to list for storage
                if hasattr(face_encoding, 'tolist'):
                    face_encoding = face_encoding.tolist()
                all_encodings.append(face_encoding)
                successful_images += 1
        
        if successful_images == 0:
            return jsonify({'error': 'Không thể trích xuất khuôn mặt từ bất kỳ ảnh nào'}), 400
        
        # Save all encodings to database
        try:
            user.face_encodings = json.dumps(all_encodings)
            user.face_registered = True
            user.face_registered_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error saving batch encodings: {str(e)}")
            return jsonify({
                'error': 'Lỗi khi lưu dữ liệu khuôn mặt',
                'details': str(e)
            }), 500
        
        # Reload face encodings
        try:
            users_with_faces = User.query.filter(
                User.face_encodings.isnot(None),
                User.is_active == True
            ).all()
            face_engine.load_face_encodings_from_db(users_with_faces)
        except Exception as e:
            print(f"Error reloading face encodings: {str(e)}")
            # Continue even if reloading fails, as the main operation succeeded
        
        return jsonify({
            'message': f'Đăng ký thành công với {successful_images} ảnh',
            'registered_images': successful_images,
            'total_encodings': len(all_encodings),
            'user_id': user_id,
            'user_name': user.name
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in batch_register_faces: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500