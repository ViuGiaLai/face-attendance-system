from app import create_app
from app.models import db
from app.models.user import User

def add_face_image_column():
    app = create_app()
    with app.app_context():
        # Check if the column already exists
        inspector = db.inspect(db.engine)
        columns = [column['name'] for column in inspector.get_columns('users')]
        
        if 'face_image' not in columns:
            # Add the new column
            db.engine.execute('ALTER TABLE users ADD COLUMN face_image BYTEA')
            print("Successfully added face_image column to users table")
        else:
            print("face_image column already exists in users table")

if __name__ == '__main__':
    add_face_image_column()
