from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import db
from app.models.attendance import AttendanceLog
from app.models.user import User
from datetime import datetime, date, timedelta
from sqlalchemy import and_

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/log', methods=['POST'])
@jwt_required()
def log_attendance():
    try:
        data = request.get_json()
        
        user_id = data.get('user_id')
        status = data.get('status', 'present')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if already logged today
        today = date.today()
        existing_log = AttendanceLog.query.filter_by(
            user_id=user_id, date=today
        ).first()
        
        if existing_log:
            return jsonify({'error': 'Attendance already logged for today'}), 400
        
        # Create attendance log
        now = datetime.now()
        attendance = AttendanceLog(
            user_id=user_id,
            date=today,
            time=now.time(),
            status=status,
            confidence=data.get('confidence')
        )
        
        db.session.add(attendance)
        db.session.commit()
        
        return jsonify({
            'message': 'Attendance logged successfully',
            'attendance': attendance.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/history', methods=['GET'])
@jwt_required()
def get_attendance_history():
    try:
        user_id = request.args.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = AttendanceLog.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date >= start_date)
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date <= end_date)
        
        # Order by date descending
        attendance_logs = query.order_by(AttendanceLog.date.desc()).all()
        
        return jsonify({
            'attendance': [log.to_dict() for log in attendance_logs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_attendance():
    try:
        today = date.today()
        attendance_logs = AttendanceLog.query.filter_by(date=today).all()
        
        return jsonify({
            'attendance': [log.to_dict() for log in attendance_logs],
            'date': today.isoformat(),
            'total_present': len([log for log in attendance_logs if log.status == 'present'])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_attendance_stats():
    try:
        user_id = request.args.get('user_id')
        days = int(request.args.get('days', 30))
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        query = AttendanceLog.query.filter(
            and_(
                AttendanceLog.date >= start_date,
                AttendanceLog.date <= end_date
            )
        )
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        logs = query.all()
        
        # Calculate stats
        total_days = days
        present_days = len([log for log in logs if log.status == 'present'])
        attendance_rate = (present_days / total_days) * 100 if total_days > 0 else 0
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_days': total_days
            },
            'stats': {
                'present_days': present_days,
                'absent_days': total_days - present_days,
                'attendance_rate': round(attendance_rate, 2)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500