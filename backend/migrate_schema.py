"""
Migration script: Add new columns to existing tables.
Run: py migrate_schema.py
"""
from app import create_app
from app.models import db

app = create_app()
with app.app_context():
    conn = db.engine.raw_connection()
    cursor = conn.cursor()

    try:
        # Add columns to users table
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='student_code'"
        )
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE users ADD COLUMN student_code VARCHAR(50) UNIQUE")
            cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(20)")
            cursor.execute("ALTER TABLE users ADD COLUMN department VARCHAR(200)")
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)")
            cursor.execute("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'")
            conn.commit()
            print('Added new columns to users table')
        else:
            print('Users columns already exist')

        # Add class_id to attendance_logs
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='attendance_logs' AND column_name='class_id'"
        )
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE attendance_logs ADD COLUMN class_id VARCHAR(36) REFERENCES classes(id)")
            conn.commit()
            print('Added class_id to attendance_logs')
        else:
            print('class_id already exists in attendance_logs')

        # Create audit_logs table
        cursor.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_name='audit_logs'"
        )
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE audit_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) REFERENCES users(id),
                    action VARCHAR(50) NOT NULL,
                    resource VARCHAR(50) NOT NULL,
                    resource_id VARCHAR(36),
                    details TEXT,
                    ip_address VARCHAR(45),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            conn.commit()
            print('Created audit_logs table')
        else:
            print('audit_logs table already exists')

        cursor.close()
        conn.close()
        print('Migration completed!')
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        print(f'Error: {e}')
