"""
Seed script: Insert sample data for users, classes, subjects, schedules.
Run: py seed_data.py
"""
from app import create_app
from app.models import db
from app.models.class_model import Class, Subject, Schedule, ClassStudent
from app.models.user import User
from werkzeug.security import generate_password_hash
from datetime import time

app = create_app()

def enroll_students():
    students = User.query.filter_by(role='student').all()
    first_class = Class.query.first()
    if students and first_class:
        for student in students:
            existing = ClassStudent.query.filter_by(class_id=first_class.id, user_id=student.id).first()
            if not existing:
                enrollment = ClassStudent(class_id=first_class.id, user_id=student.id)
                db.session.add(enrollment)
                print(f'  + Ghi danh: {student.name} vào lớp {first_class.name}')

with app.app_context():
    # --- Users ---
    seed_users = [
        {'name': 'Admin Viu', 'email': 'admin@test.com', 'password': '123456', 'role': 'admin',
         'student_code': 'ADMIN001', 'phone': '0909123000', 'department': 'Quản trị'},
        {'name': 'Nguyễn Văn An', 'email': 'teacher@test.com', 'password': '123456', 'role': 'teacher',
         'student_code': 'GV001', 'phone': '0909123001', 'department': 'Công nghệ thông tin'},
        {'name': 'Trần Thị Bình', 'email': 'teacher2@test.com', 'password': '123456', 'role': 'teacher',
         'student_code': 'GV002', 'phone': '0909123002', 'department': 'Toán - Tin'},
        {'name': 'Lê Văn Cường', 'email': 'student@test.com', 'password': '123456', 'role': 'student',
         'student_code': '20210001', 'phone': '0912345001', 'department': 'Công nghệ thông tin'},
        {'name': 'Phạm Thị Dung', 'email': 'student2@test.com', 'password': '123456', 'role': 'student',
         'student_code': '20210002', 'phone': '0912345002', 'department': 'Công nghệ thông tin'},
        {'name': 'Hoàng Văn Em', 'email': 'student3@test.com', 'password': '123456', 'role': 'student',
         'student_code': '20210003', 'phone': '0912345003', 'department': 'Công nghệ thông tin'},
        {'name': 'Đỗ Thị Phương', 'email': 'student4@test.com', 'password': '123456', 'role': 'student',
         'student_code': '20210004', 'phone': '0912345004', 'department': 'Toán - Tin'},
        {'name': 'Vũ Minh Hoàng', 'email': 'student5@test.com', 'password': '123456', 'role': 'student',
         'student_code': '20210005', 'phone': '0912345005', 'department': 'Công nghệ thông tin'},
    ]
    created_any = False
    for user_data in seed_users:
        existing = User.query.filter_by(email=user_data['email']).first()
        if not existing:
            user = User(
                email=user_data['email'],
                password_hash=generate_password_hash(user_data['password']),
                name=user_data['name'],
                role=user_data['role'],
                student_code=user_data['student_code'],
                phone=user_data['phone'],
                department=user_data['department'],
            )
            db.session.add(user)
            print(f'  + User: {user_data["name"]} ({user_data["email"]}) - {user_data["role"]}')
            created_any = True
    if created_any:
        db.session.commit()
        print('Hoàn tất tạo người dùng mẫu.')
    else:
        print('Tất cả người dùng mẫu đã tồn tại.')

    # --- Classes, Subjects, Schedules ---
    existing_classes = Class.query.count()
    if existing_classes > 0:
        print(f'Đã có {existing_classes} lớp trong DB. Bỏ qua seed lớp/môn/lịch.')
        # Still enroll students if not already enrolled
        enroll_students()
    else:
        classes_data = [
            {'name': 'Công nghệ thông tin K46', 'code': 'CNTT46', 'department': 'Công nghệ thông tin', 'room': 'A101'},
            {'name': 'Khoa học máy tính K46', 'code': 'KHMT46', 'department': 'Công nghệ thông tin', 'room': 'A102'},
            {'name': 'Kỹ thuật phần mềm K46', 'code': 'KTPM46', 'department': 'Công nghệ thông tin', 'room': 'A103'},
            {'name': 'Toán tin K46', 'code': 'TIN46', 'department': 'Toán - Tin', 'room': 'B201'},
            {'name': 'Hệ thống thông tin K46', 'code': 'HTTT46', 'department': 'Công nghệ thông tin', 'room': 'A201'},
        ]

        teacher = User.query.filter_by(role='teacher').first()
        teacher_id = teacher.id if teacher else None

        created_classes = []
        for cd in classes_data:
            cls = Class(
                name=cd['name'], code=cd['code'], department=cd['department'],
                teacher_id=teacher_id, room=cd['room'],
                schedule_description='Sáng thứ 2, 4, 6' if cd['code'] != 'TIN46' else 'Chiều thứ 3, 5, 7',
            )
            db.session.add(cls)
            created_classes.append(cls)
            print(f'  + Lớp: {cd["name"]} ({cd["code"]})')

        subjects_data = [
            {'name': 'Lập trình Python', 'code': 'PYTHON101', 'credits': 3, 'department': 'Công nghệ thông tin',
             'description': 'Nhập môn lập trình Python, cú pháp cơ bản, hàm, class, thư viện'},
            {'name': 'Cấu trúc dữ liệu & Giải thuật', 'code': 'CTDLGT', 'credits': 4, 'department': 'Công nghệ thông tin',
             'description': 'Các cấu trúc dữ liệu cơ bản và giải thuật sắp xếp, tìm kiếm'},
            {'name': 'Cơ sở dữ liệu', 'code': 'CSDL', 'credits': 3, 'department': 'Công nghệ thông tin',
             'description': 'Mô hình quan hệ, SQL, thiết kế CSDL'},
            {'name': 'Trí tuệ nhân tạo', 'code': 'AI101', 'credits': 3, 'department': 'Công nghệ thông tin',
             'description': 'Các phương pháp AI, machine learning cơ bản'},
            {'name': 'Nhập môn công nghệ phần mềm', 'code': 'CNPM', 'credits': 3, 'department': 'Công nghệ thông tin',
             'description': 'Quy trình phát triển phần mềm, UML, agile'},
        ]

        created_subjects = []
        for sd in subjects_data:
            subj = Subject(name=sd['name'], code=sd['code'], credits=sd['credits'],
                           department=sd['department'], description=sd['description'])
            db.session.add(subj)
            created_subjects.append(subj)
            print(f'  + Môn: {sd["name"]} ({sd["code"]}) - {sd["credits"]} TC')

        db.session.flush()

        schedule_data = [
            {'class_idx': 0, 'subject_idx': 0, 'day': 0, 'start': '07:00', 'end': '09:30', 'room': 'A101'},
            {'class_idx': 0, 'subject_idx': 1, 'day': 2, 'start': '07:00', 'end': '09:30', 'room': 'A101'},
            {'class_idx': 0, 'subject_idx': 2, 'day': 4, 'start': '09:45', 'end': '11:15', 'room': 'A101'},
            {'class_idx': 1, 'subject_idx': 0, 'day': 0, 'start': '13:00', 'end': '15:30', 'room': 'A102'},
            {'class_idx': 1, 'subject_idx': 3, 'day': 2, 'start': '13:00', 'end': '15:30', 'room': 'A102'},
            {'class_idx': 2, 'subject_idx': 4, 'day': 1, 'start': '07:00', 'end': '09:30', 'room': 'A103'},
            {'class_idx': 2, 'subject_idx': 0, 'day': 3, 'start': '07:00', 'end': '09:30', 'room': 'A103'},
            {'class_idx': 3, 'subject_idx': 2, 'day': 1, 'start': '13:00', 'end': '15:30', 'room': 'B201'},
            {'class_idx': 3, 'subject_idx': 3, 'day': 4, 'start': '13:00', 'end': '15:30', 'room': 'B201'},
            {'class_idx': 4, 'subject_idx': 1, 'day': 0, 'start': '07:00', 'end': '09:30', 'room': 'A201'},
            {'class_idx': 4, 'subject_idx': 4, 'day': 3, 'start': '09:45', 'end': '11:15', 'room': 'A201'},
        ]

        days_map = {0: 'Thứ 2', 1: 'Thứ 3', 2: 'Thứ 4', 3: 'Thứ 5', 4: 'Thứ 6', 5: 'Thứ 7', 6: 'CN'}
        for sd in schedule_data:
            schedule = Schedule(
                class_id=created_classes[sd['class_idx']].id,
                subject_id=created_subjects[sd['subject_idx']].id,
                day_of_week=sd['day'],
                start_time=time(*map(int, sd['start'].split(':'))),
                end_time=time(*map(int, sd['end'].split(':'))),
                room=sd['room'],
            )
            db.session.add(schedule)
            print(f'  + Lịch: {days_map[sd["day"]]} {sd["start"]}-{sd["end"]} | {created_classes[sd["class_idx"]].name} - {created_subjects[sd["subject_idx"]].name}')

        enroll_students()
        db.session.commit()
        print('\nHoàn tất seed dữ liệu!')
