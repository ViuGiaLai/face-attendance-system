from flask import Flask
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
    
    # Blueprints
    from app.routes.auth import auth_bp
    from app.routes.attendance import attendance_bp
    from app.routes.face_recog import face_bp
    from app.routes.users import users_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(face_bp, url_prefix='/api/face')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app