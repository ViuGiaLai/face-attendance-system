from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from datetime import datetime

from app.models import db
from app.models.user import User
from app.models.audit_log import AuditLog

audit_bp = Blueprint('audit', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Yêu cầu quyền quản trị viên'}), 403
        return f(*args, **kwargs)
    return decorated_function

def log_audit(user_id, action, resource, resource_id=None, details=None, ip_address=None):
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Audit log error: {str(e)}")

@audit_bp.route('', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        action = request.args.get('action')
        resource = request.args.get('resource')
        user_id = request.args.get('user_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = AuditLog.query

        if action:
            query = query.filter(AuditLog.action == action)
        if resource:
            query = query.filter(AuditLog.resource == resource)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if start_date:
            query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))

        query = query.order_by(AuditLog.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'logs': [log.to_dict() for log in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/actions', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_actions():
    try:
        actions = db.session.query(AuditLog.action).distinct().all()
        resources = db.session.query(AuditLog.resource).distinct().all()
        return jsonify({
            'actions': [a[0] for a in actions],
            'resources': [r[0] for r in resources],
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
