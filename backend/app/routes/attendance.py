import csv
import io
import csv
import io
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db
from app.models.attendance import AttendanceLog
from app.models.user import User
from app.models.class_model import Class, Schedule
from datetime import datetime, date, timedelta
from sqlalchemy import and_, func

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/log', methods=['POST'])
@jwt_required()
def log_attendance():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        status = data.get('status', 'present')
        class_id = data.get('class_id')

        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        today = date.today()
        existing_log = AttendanceLog.query.filter_by(user_id=user_id, date=today).first()
        if existing_log:
            return jsonify({'error': 'Attendance already logged for today'}), 400

        if class_id:
            cls = Class.query.get(class_id)
            if not cls:
                return jsonify({'error': 'Class not found'}), 404

        now = datetime.now()
        attendance = AttendanceLog(
            user_id=user_id,
            date=today,
            time=now.time(),
            status=status,
            confidence=data.get('confidence'),
            class_id=class_id
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
        class_id = request.args.get('class_id')

        query = AttendanceLog.query

        if user_id:
            query = query.filter_by(user_id=user_id)
        if class_id:
            query = query.filter_by(class_id=class_id)
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date <= end_date)

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
        class_id = request.args.get('class_id')

        query = AttendanceLog.query.filter_by(date=today)
        if class_id:
            query = query.filter_by(class_id=class_id)

        attendance_logs = query.all()

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
        class_id = request.args.get('class_id')

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
        if class_id:
            query = query.filter_by(class_id=class_id)

        logs = query.all()

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

@attendance_bp.route('/schedule', methods=['GET'])
@jwt_required()
def get_today_schedule():
    try:
        today = date.today()
        day_of_week = today.weekday()

        schedules = Schedule.query.filter_by(day_of_week=day_of_week).order_by(Schedule.start_time).all()

        if not schedules:
            return jsonify({'schedules': [], 'date': today.isoformat(), 'day_of_week': day_of_week}), 200

        class_ids = [s.class_id for s in schedules if s.class_id]
        if not class_ids:
            return jsonify({'schedules': [s.to_dict() for s in schedules], 'date': today.isoformat(), 'day_of_week': day_of_week}), 200

        from app.models.class_model import ClassStudent

        # Batch load enrollments
        enrollments = ClassStudent.query.filter(ClassStudent.class_id.in_(class_ids)).all()
        enrollment_map = {}
        for e in enrollments:
            enrollment_map.setdefault(e.class_id, []).append(e)

        # Batch load today's attendance counts per class
        counts = db.session.query(
            AttendanceLog.class_id, func.count(AttendanceLog.id)
        ).filter(
            AttendanceLog.date == today,
            AttendanceLog.class_id.in_(class_ids),
            AttendanceLog.status == 'present'
        ).group_by(AttendanceLog.class_id).all()
        count_map = {c[0]: c[1] for c in counts}

        result = []
        for s in schedules:
            item = s.to_dict()
            class_enrollments = enrollment_map.get(s.class_id, [])
            item['students'] = [{'id': e.user_id, 'name': e.student.name} for e in class_enrollments if e.student]
            item['student_count'] = len(class_enrollments)
            item['attended_today'] = count_map.get(s.class_id, 0)
            result.append(item)

        return jsonify({'schedules': result, 'date': today.isoformat(), 'day_of_week': day_of_week}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/class-stats', methods=['GET'])
@jwt_required()
def get_class_stats():
    try:
        class_id = request.args.get('class_id')
        days = int(request.args.get('days', 30))

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'error': 'Class not found'}), 404

        from app.models.class_model import ClassStudent
        total_students = ClassStudent.query.filter_by(class_id=class_id).count()

        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        logs = AttendanceLog.query.filter(
            AttendanceLog.class_id == class_id,
            AttendanceLog.date >= start_date,
            AttendanceLog.date <= end_date
        ).all()

        present_count = len([l for l in logs if l.status == 'present'])
        unique_students_with_attendance = len(set(l.user_id for l in logs))

        return jsonify({
            'class': cls.to_dict(),
            'stats': {
                'total_students': total_students,
                'unique_present': unique_students_with_attendance,
                'total_logs': len(logs),
                'present_logs': present_count,
                'period_days': days,
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@attendance_bp.route('/weekly-stats', methods=['GET'])
@jwt_required()
def get_weekly_stats():
    try:
        user_id = request.args.get('user_id')
        class_id = request.args.get('class_id')
        today_dt = date.today()
        week_dates = [(today_dt - timedelta(days=i)) for i in range(6, -1, -1)]

        result = []
        for d in week_dates:
            query = AttendanceLog.query.filter(
                AttendanceLog.date == d,
                AttendanceLog.status == 'present'
            )
            if user_id:
                query = query.filter_by(user_id=user_id)
            if class_id:
                query = query.filter_by(class_id=class_id)

            count = query.count()
            result.append({
                'date': d.isoformat(),
                'day': DAI[d.weekday()],
                'count': count,
            })

        return jsonify({'weekly': result}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

DAI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']

@attendance_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_attendance_csv():
    try:
        user_id = request.args.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        class_id = request.args.get('class_id')

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Yêu cầu quyền quản trị viên hoặc giáo viên'}), 403

        query = AttendanceLog.query.join(User, AttendanceLog.user_id == User.id)

        if user_id:
            query = query.filter(AttendanceLog.user_id == user_id)
        if class_id:
            query = query.filter(AttendanceLog.class_id == class_id)
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(AttendanceLog.date <= end)

        logs = query.order_by(AttendanceLog.date.desc()).add_entity(User).all()

        output = io.StringIO()
        output.write('\ufeff')
        writer = csv.writer(output)
        writer.writerow(['Tên', 'Email', 'Mã số', 'Lớp', 'Ngày', 'Thời gian', 'Trạng thái', 'Độ tin cậy'])
        for log, user_obj in logs:
            user_name = user_obj.name if user_obj else 'N/A'
            user_email = user_obj.email if user_obj else 'N/A'
            user_code = user_obj.student_code if user_obj and user_obj.student_code else 'N/A'
            class_name = log.class_ref.name if log.class_ref else ''
            writer.writerow([
                user_name, user_email, user_code, class_name,
                log.date.isoformat(), log.time.isoformat(),
                'Có mặt' if log.status == 'present' else 'Vắng',
                f'{log.confidence:.1%}' if log.confidence else 'N/A'
            ])

        csv_bytes = output.getvalue().encode('utf-8-sig')
        output.close()

        from flask import Response
        return Response(
            csv_bytes,
            mimetype='text/csv; charset=utf-8',
            headers={
                'Content-Disposition': f'attachment; filename=attendance_{date.today().isoformat()}.csv',
                'Content-Type': 'text/csv; charset=utf-8'
            }
        ), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500