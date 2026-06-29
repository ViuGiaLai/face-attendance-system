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
from app.models.class_model import Class
from app.routes.audit import log_audit
import numpy as np
from app.services.face_engine import face_engine
from app.timezone_utils import get_vn_now, get_vn_today, get_vn_time

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
        # Determine the target user id from payload if possible
        target_user_id = None
        try:
            data = request.get_json(silent=True)
            if data and data.get('user_id'):
                target_user_id = data.get('user_id')
        except Exception:
            pass
            
        if not target_user_id:
            target_user_id = get_jwt_identity()
            
        current_time = time.time()
        
        # Clean up old entries
        registration_attempts[target_user_id] = [t for t in registration_attempts.get(target_user_id, []) 
                                        if current_time - t < 60]  # 1 minute window
        
        # Check rate limit (max 15 attempts per minute to allow 5 successful frames + retries)
        if len(registration_attempts.get(target_user_id, [])) >= 15:
            return jsonify({
                'error': 'Quá nhiều yêu cầu đăng ký cho tài khoản này. Vui lòng thử lại sau 1 phút.'
            }), 429
            
        # Record this attempt
        if target_user_id not in registration_attempts:
            registration_attempts[target_user_id] = []
        registration_attempts[target_user_id].append(current_time)
        
        return f(*args, **kwargs)
    return decorated_function

@face_bp.route('/register-status/<string:user_id>', methods=['GET'])
@face_bp.route('/register/status/<string:user_id>', methods=['GET'])
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
        
        face_encoding = None

        # Prioritize backend Dlib face recognition if image_data is sent
        if data.get('image_data'):
            try:
                print("Decoding image data for Dlib extraction...")
                if ',' in data['image_data']:
                    image_bytes = base64.b64decode(data['image_data'].split(',')[-1])
                else:
                    image_bytes = base64.b64decode(data['image_data'])
                
                print("Encoding face from image using Dlib...")
                face_encoding = face_engine.encode_face_from_image(image_bytes)
            except Exception as e:
                print(f"Error extracting face encoding using Dlib: {str(e)}")

        # Fallback to frontend-computed descriptor if Dlib extraction failed or no image was sent
        if face_encoding is None:
            face_descriptor = data.get('face_descriptor')
            if face_descriptor and isinstance(face_descriptor, list) and len(face_descriptor) == 128:
                print("Falling back to pre-computed face descriptor from frontend")
                face_encoding = face_descriptor
        
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
            user.face_registered_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            
            # Save to FaceEmbedding table
            from app.models.face_embedding import FaceEmbedding
            # Clear old records first
            FaceEmbedding.query.filter_by(user_id=user.id).delete()
            # Add new records
            for enc in all_encodings:
                fe = FaceEmbedding(user_id=user.id, embedding=json.dumps(enc))
                db.session.add(fe)
                
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
        
        if not data or not data.get('image_data') and not data.get('face_descriptor'):
            print("Error: No image data or descriptor provided")
            return jsonify({
                'recognized': False,
                'error': 'Thiếu dữ liệu ảnh hoặc đặc trưng khuôn mặt',
                'code': 'MISSING_DATA'
            }), 400

        # Use pre-computed face descriptor if provided (from face-api.js)
        face_descriptor = data.get('face_descriptor')
        use_descriptor = face_descriptor and isinstance(face_descriptor, list) and len(face_descriptor) == 128

        if not use_descriptor:
            try:
                print("Attempting to decode image data...")
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

            class_id = data.get('class_id')
            user_id = None
            confidence = 0.0

            # Prioritize Dlib recognition from image_data
            if 'image_data' in data:
                try:
                    print("Attempting Dlib recognition on image_data...")
                    if ',' in data['image_data']:
                        image_bytes = base64.b64decode(data['image_data'].split(',')[-1])
                    else:
                        image_bytes = base64.b64decode(data['image_data'])
                    user_id, confidence = face_engine.recognize_face(image_bytes)
                except Exception as e:
                    print(f"Dlib recognition failed: {e}")

            # Fallback to descriptor comparison if Dlib recognition failed or image_data not processed
            if not user_id and use_descriptor:
                print("Falling back to descriptor-based recognition...")
                unknown = np.array(face_descriptor, dtype=np.float32)
                best_match = None
                best_distance = float('inf')

                for i, known in enumerate(face_engine.known_face_encodings):
                    known = np.array(known, dtype=np.float32)
                    distance = np.linalg.norm(unknown - known)
                    if distance < best_distance:
                        best_distance = distance
                        best_match = face_engine.known_face_ids[i]

                tolerance = face_engine.tolerance
                print(f"Descriptor recognition - best distance: {best_distance:.4f}, tolerance: {tolerance}")
                if best_match and best_distance <= tolerance:
                    user_id = best_match
                    confidence = 1 - (best_distance / tolerance)

            print(f"Face recognition result - User ID: {user_id}, Confidence: {confidence}")

            if user_id and confidence > 0.25:
                return _process_recognized_user(user_id, confidence, class_id)
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
@face_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_face():
    try:
        print("Received request to /api/face/verify (1:1 Verification)")
        data = request.get_json()
        
        if not data or (not data.get('image_data') and not data.get('face_descriptor')):
            return jsonify({
                'verified': False,
                'error': 'Thiếu dữ liệu ảnh hoặc đặc trưng khuôn mặt',
                'code': 'MISSING_DATA'
            }), 400
            
        student_code = data.get('student_code', '').strip()
        user_id = data.get('user_id')
        
        if not student_code and not user_id:
            return jsonify({
                'verified': False,
                'error': 'Thiếu mã số sinh viên hoặc ID người dùng',
                'code': 'MISSING_USER_IDENTIFIER'
            }), 400
            
        # Find user
        if student_code:
            user = User.query.filter_by(student_code=student_code, is_active=True).first()
        else:
            user = User.query.filter_by(id=user_id, is_active=True).first()
            
        if not user:
            return jsonify({
                'verified': False,
                'error': 'Không tìm thấy sinh viên hoặc tài khoản bị vô hiệu hóa',
                'code': 'USER_NOT_FOUND'
            }), 404
            
        if not user.face_encodings:
            return jsonify({
                'verified': False,
                'error': 'Sinh viên này chưa đăng ký khuôn mặt',
                'code': 'NO_FACE_DATA'
            }), 400
            
        # Decode and process face encoding
        face_encoding = None
        face_descriptor = data.get('face_descriptor')
        use_descriptor = face_descriptor and isinstance(face_descriptor, list) and len(face_descriptor) == 128
        
        # 1. Extract using Dlib if image_data is provided
        if data.get('image_data'):
            try:
                if ',' in data['image_data']:
                    image_bytes = base64.b64decode(data['image_data'].split(',')[-1])
                else:
                    image_bytes = base64.b64decode(data['image_data'])
                face_encoding = face_engine.encode_face_from_image(image_bytes)
            except Exception as e:
                print(f"Dlib extraction failed in verify_face: {e}")
                
        # 2. Fallback to pre-computed descriptor
        if face_encoding is None and use_descriptor:
            face_encoding = np.array(face_descriptor, dtype=np.float32)
            
        if face_encoding is None:
            return jsonify({
                'verified': False,
                'error': 'Không thể trích xuất khuôn mặt từ ảnh',
                'code': 'NO_FACE_DETECTED'
            }), 400
            
        # Perform 1:1 match
        # Load user's own registered face encodings
        user_encodings = json.loads(user.face_encodings)
        best_distance = float('inf')
        
        # Check against each registered template for this user
        for known in user_encodings:
            known_arr = np.array(known, dtype=np.float32)
            # If face_encoding is not yet a numpy array, convert it
            unknown_arr = np.array(face_encoding, dtype=np.float32)
            distance = np.linalg.norm(unknown_arr - known_arr)
            if distance < best_distance:
                best_distance = distance
                
        tolerance = face_engine.tolerance
        verified = best_distance <= tolerance
        
        if verified:
            confidence = 1 - (best_distance / tolerance)
            
            # Log attendance
            class_id = data.get('class_id')
            today = get_vn_today()
            existing_log = AttendanceLog.query.filter_by(user_id=user.id, date=today).first()
            
            already_logged = False
            attendance_id = None
            
            if existing_log:
                already_logged = True
                attendance_id = existing_log.id
            else:
                now = get_vn_now()
                attendance = AttendanceLog(
                    user_id=user.id,
                    date=today,
                    time=get_vn_time(),
                    status='present',
                    confidence=float(confidence),
                    class_id=class_id,
                    created_at=now
                )
                db.session.add(attendance)
                db.session.commit()
                attendance_id = attendance.id
                log_audit(user.id, 'attendance', 'attendance_log', attendance.id,
                          f'Điểm danh qua face verification 1:1 - {user.name}', None)
                
            return jsonify({
                'verified': True,
                'already_logged': already_logged,
                'attendance_id': attendance_id,
                'confidence': float(confidence),
                'distance': float(best_distance),
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                }
            }), 200
        else:
            return jsonify({
                'verified': False,
                'distance': float(best_distance),
                'error': 'Khuôn mặt không khớp với sinh viên này',
                'code': 'FACE_MISMATCH'
            }), 200
            
    except Exception as e:
        db.session.rollback()
        print(f"Error in verify_face: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'verified': False,
            'error': 'Lỗi máy chủ khi xác thực khuôn mặt',
            'details': str(e)
        }), 500

@face_bp.route('/recognize-multi', methods=['POST'])
@jwt_required()
def recognize_multi_faces():
    try:
        data = request.get_json()
        descriptors = data.get('descriptors', [])
        image_data = data.get('image_data')

        if not descriptors and not image_data:
            return jsonify({'results': [], 'error': 'Thiếu dữ liệu descriptors hoặc ảnh'}), 400

        users_with_faces = User.query.filter(
            User.face_encodings.isnot(None),
            User.is_active == True
        ).all()

        if not users_with_faces:
            return jsonify({'results': [], 'error': 'Không có dữ liệu khuôn mặt'}), 400

        face_engine.load_face_encodings_from_db(users_with_faces)
        results = []

        # Prioritize Dlib multi-face recognition if image_data is provided
        dlib_success = False
        if image_data:
            try:
                print("Attempting Dlib multi-face recognition...")
                if ',' in image_data:
                    image_bytes = base64.b64decode(image_data.split(',')[-1])
                else:
                    image_bytes = base64.b64decode(image_data)
                
                dlib_results = face_engine.recognize_multiple_faces(image_bytes)
                if dlib_results:
                    for res in dlib_results:
                        if res['recognized']:
                            user = User.query.get(res['user_id'])
                            if user:
                                results.append({
                                    'recognized': True,
                                    'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role},
                                    'confidence': res['confidence'],
                                    'distance': res['distance']
                                })
                        else:
                            results.append({
                                'recognized': False,
                                'confidence': 0.0,
                                'distance': res['distance']
                            })
                    dlib_success = True
                    print(f"Dlib multi-face recognition processed {len(results)} faces")
            except Exception as e:
                print(f"Dlib multi-face recognition failed: {e}")

        # Fallback to descriptor-based recognition if Dlib failed or no image was processed
        if not dlib_success and descriptors:
            print("Falling back to descriptor-based multi-face recognition...")
            for desc in descriptors:
                if not isinstance(desc, list) or len(desc) != 128:
                    results.append({'recognized': False, 'error': 'Invalid descriptor'})
                    continue

                unknown = np.array(desc, dtype=np.float32)
                best_match = None
                best_distance = float('inf')

                for i, known in enumerate(face_engine.known_face_encodings):
                    known_arr = np.array(known, dtype=np.float32)
                    distance = np.linalg.norm(unknown - known_arr)
                    if distance < best_distance:
                        best_distance = distance
                        best_match = face_engine.known_face_ids[i]

                tolerance = face_engine.tolerance
                if best_match and best_distance <= tolerance:
                    confidence = 1 - (best_distance / tolerance)
                    user = User.query.get(best_match)
                    if user:
                        results.append({
                            'recognized': True,
                            'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role},
                            'confidence': max(0, confidence),
                            'distance': float(best_distance),
                            'descriptor_used': desc,
                        })
                        continue

                results.append({
                    'recognized': False,
                    'confidence': 0.0,
                    'distance': float(best_distance) if best_match else None,
                })

        # Log attendance for all recognized users
        class_id = data.get('class_id')
        if class_id:
            cls = Class.query.get(class_id)
            if cls:
                class_id = cls.id

        today = get_vn_today()
        now = get_vn_now()
        for result in results:
            if result['recognized']:
                user_id = result['user']['id']
                existing = AttendanceLog.query.filter_by(user_id=user_id, date=today).first()
                if not existing:
                    attendance = AttendanceLog(
                        user_id=user_id,
                        date=today,
                        time=get_vn_time(),
                        status='present',
                        confidence=result['confidence'],
                        class_id=class_id,
                    )
                    db.session.add(attendance)
        db.session.commit()

        return jsonify({'results': results}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _process_recognized_user(user_id, confidence, class_id=None):
    """Helper function to process recognized user and log attendance"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'recognized': False,
                'error': 'Người dùng không tồn tại',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        if class_id:
            cls = Class.query.get(class_id)
            if not cls:
                class_id = None

        print(f"Recognized user {user.name} with confidence {confidence}")
        
        today = get_vn_today()
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
        
        now = get_vn_now()
        attendance = AttendanceLog(
            user_id=user.id,
            date=today,
            time=get_vn_time(),
            status='present',
            confidence=float(confidence),
            class_id=class_id,
            created_at=now
        )
        db.session.add(attendance)
        db.session.commit()
        print("Attendance logged successfully")
        log_audit(user.id, 'attendance', 'attendance_log', attendance.id,
                  f'Điểm danh qua face recognition - {user.name}', None)

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
        descriptors = data.get('descriptors', [])
        
        if not user_id or not images:
            return jsonify({'error': 'Thiếu user_id hoặc danh sách ảnh'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Người dùng không tồn tại'}), 404
        
        all_encodings = []
        successful_images = 0
        
        # Prioritize Dlib extraction from images
        if images:
            for image_data in images:
                try:
                    if ',' in image_data:
                        decoded_img = base64.b64decode(image_data.split(',')[-1])
                    else:
                        decoded_img = base64.b64decode(image_data)
                    face_encoding = face_engine.encode_face_from_image(decoded_img)
                    if face_encoding is not None:
                        if hasattr(face_encoding, 'tolist'):
                            face_encoding = face_encoding.tolist()
                        all_encodings.append(face_encoding)
                        successful_images += 1
                except Exception as e:
                    print(f"Error in batch image extraction: {e}")

        # Fallback to pre-computed descriptors if Dlib extraction failed for all images
        if successful_images == 0 and descriptors:
            print("Falling back to frontend pre-computed descriptors for batch registration")
            for desc in descriptors:
                if isinstance(desc, list) and len(desc) == 128:
                    all_encodings.append(desc)
                    successful_images += 1
        
        if successful_images == 0:
            return jsonify({'error': 'Không thể trích xuất khuôn mặt từ bất kỳ ảnh nào'}), 400
        
        # Save all encodings to database
        try:
            user.face_encodings = json.dumps(all_encodings)
            user.face_registered_at = datetime.utcnow()
            user.updated_at = datetime.utcnow()
            
            # Save to FaceEmbedding table
            from app.models.face_embedding import FaceEmbedding
            # Clear old records first
            FaceEmbedding.query.filter_by(user_id=user.id).delete()
            # Add new records
            for enc in all_encodings:
                fe = FaceEmbedding(user_id=user.id, embedding=json.dumps(enc))
                db.session.add(fe)
                
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
            face_engine.clear_temp_encodings(user_id)
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

@face_bp.route('/anti-spoof', methods=['POST'])
@jwt_required()
def anti_spoof():
    try:
        data = request.get_json()
        if not data or not data.get('image_data'):
            return jsonify({'error': 'Thiếu dữ liệu ảnh'}), 400

        image_data = data.get('image_data')
        if ',' in image_data:
            image_data = base64.b64decode(image_data.split(',')[-1])
        else:
            image_data = base64.b64decode(image_data)

        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'error': 'Không thể giải mã ảnh'}), 400

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Laplacian variance (blur detection)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # 2. Histogram analysis (check for flat/bimodal distribution)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten()
        hist_std = float(np.std(hist))
        hist_mean = float(np.mean(hist))

        # 3. Edge detection (Canny)
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = float(np.count_nonzero(edges) / edges.size)

        # 4. Texture complexity via local binary pattern approximation
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
        texture_score = float(np.mean(gradient_mag))

        # Scoring
        is_real = (
            laplacian_var > 15 and
            hist_std > 200 and
            edge_ratio > 0.01 and
            texture_score > 5
        )

        score = min(1.0, max(0.0,
            0.3 * min(1.0, laplacian_var / 100) +
            0.25 * min(1.0, hist_std / 500) +
            0.25 * min(1.0, edge_ratio / 0.05) +
            0.2 * min(1.0, texture_score / 20)
        ))

        return jsonify({
            'isReal': is_real,
            'score': round(score, 4),
            'laplacian_var': round(laplacian_var, 2),
            'hist_std': round(hist_std, 2),
            'edge_ratio': round(edge_ratio, 6),
            'texture_score': round(texture_score, 2),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500