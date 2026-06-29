# Copyright (c) 2026 Viu
# Licensed under the MIT License.

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # CORS
    CORS(app)
    
    # JWT
    jwt = JWTManager(app)
    
    # Database
    from app.models import db
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Root route
    @app.route('/')
    def home():
        return jsonify({'message': 'Viu API is running'}), 200

    # Blueprints
    from app.routes.auth import auth_bp
    from app.routes.attendance import attendance_bp
    from app.routes.face_recog import face_bp
    from app.routes.users import users_bp
    from app.routes.classes import classes_bp
    from app.routes.subjects import subjects_bp
    from app.routes.schedules import schedules_bp
    from app.routes.audit import audit_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(face_bp, url_prefix='/api/face')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')
    app.register_blueprint(subjects_bp, url_prefix='/api/subjects')
    app.register_blueprint(schedules_bp, url_prefix='/api/schedules')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app