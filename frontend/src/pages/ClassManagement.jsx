import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { classesAPI, usersAPI } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiX, FiSearch, FiBookOpen } from 'react-icons/fi';

const ClassManagement = () => {
  const { dark } = useTheme();
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', department: '', teacher_id: '', room: '', schedule_description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const inputBg = dark ? '#374151' : '#f9fafb';

  const fetchClasses = useCallback(async () => {
    try {
      const res = await classesAPI.getAll();
      setClasses(res.data.classes);
    } catch (err) {
      setError('Không thể tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data.users);
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchUsers();
  }, [fetchClasses, fetchUsers]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', code: '', department: '', teacher_id: '', room: '', schedule_description: '' });
    setShowForm(true);
    setError('');
  };

  const openEdit = (cls) => {
    setEditing(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      department: cls.department || '',
      teacher_id: cls.teacher_id || '',
      room: cls.room || '',
      schedule_description: cls.schedule_description || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await classesAPI.update(editing.id, formData);
        setSuccess('Cập nhật lớp thành công');
      } else {
        await classesAPI.create(formData);
        setSuccess('Tạo lớp thành công');
      }
      setShowForm(false);
      setEditing(null);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa lớp này?')) return;
    try {
      await classesAPI.delete(id);
      setSuccess('Xóa lớp thành công');
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const viewStudents = async (cls) => {
    try {
      const res = await classesAPI.getStudents(cls.id);
      setStudents(res.data.students);
      setSelectedClass(cls);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const addStudent = async () => {
    if (!selectedStudent) return;
    try {
      await classesAPI.addStudent(selectedClass.id, selectedStudent);
      setSuccess('Thêm sinh viên thành công');
      setSelectedStudent('');
      setShowStudentForm(false);
      const res = await classesAPI.getStudents(selectedClass.id);
      setStudents(res.data.students);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const removeStudent = async (userId) => {
    if (!window.confirm('Xóa sinh viên khỏi lớp?')) return;
    try {
      await classesAPI.removeStudent(selectedClass.id, userId);
      setSuccess('Xóa sinh viên thành công');
      const res = await classesAPI.getStudents(selectedClass.id);
      setStudents(res.data.students);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const filtered = classes.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const teachers = users.filter(u => u.role === 'teacher');

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
    background: inputBg, color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Quản lý lớp học</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 4 }}>{classes.length} lớp</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
          border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <FiPlus size={16} /> Thêm lớp
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#451a1a' : '#fef2f2', color: dark ? '#fca5a5' : '#dc2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#14532d' : '#f0fdf4', color: dark ? '#bbf7d0' : '#16a34a', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: bgCard, borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: textColor, margin: 0 }}>{editing ? 'Sửa lớp' : 'Thêm lớp mới'}</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: mutedColor, cursor: 'pointer', fontSize: 18 }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Tên lớp *</label>
                <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: Công nghệ thông tin K46" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Mã lớp *</label>
                <input style={inputStyle} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required placeholder="VD: CNTT46" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Khoa</label>
                <input style={inputStyle} value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="VD: Công nghệ thông tin" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Giáo viên</label>
                <select style={inputStyle} value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}>
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Phòng học</label>
                <input style={inputStyle} value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} placeholder="VD: A101" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Mô tả lịch học</label>
                <input style={inputStyle} value={formData.schedule_description} onChange={e => setFormData({ ...formData, schedule_description: e.target.value })} placeholder="VD: Sáng thứ 2, 4, 6" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {editing ? 'Cập nhật' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: mutedColor }} />
        <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Tìm kiếm lớp..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: mutedColor }}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: mutedColor }}>
          <FiBookOpen size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Chưa có lớp học nào</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(cls => (
            <div key={cls.id} style={{
              background: bgCard, borderRadius: 12, padding: '16px 20px',
              border: `1px solid ${borderColor}`, transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, margin: 0 }}>{cls.name}</h3>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: dark ? '#374151' : '#f3f4f6', color: mutedColor, fontWeight: 600 }}>{cls.code}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: mutedColor }}>
                    {cls.department && <span>{cls.department}</span>}
                    {cls.teacher_name && <span>GV: {cls.teacher_name}</span>}
                    {cls.room && <span>Phòng: {cls.room}</span>}
                    <span>{cls.student_count} sinh viên</span>
                  </div>
                  {cls.schedule_description && <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>{cls.schedule_description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => viewStudents(cls)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: '#667eea', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiUsers size={13} /> DS
                  </button>
                  <button onClick={() => openEdit(cls)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiEdit2 size={13} /> Sửa
                  </button>
                  <button onClick={() => handleDelete(cls.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiTrash2 size={13} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedClass && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: bgCard, borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: textColor, margin: 0 }}>{selectedClass.name} - Sinh viên</h2>
              <button onClick={() => { setSelectedClass(null); setStudents([]); }} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: mutedColor, cursor: 'pointer', fontSize: 18 }}><FiX /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              {showStudentForm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={{ ...inputStyle, flex: 1 }} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                    <option value="">-- Chọn sinh viên --</option>
                    {users.filter(u => u.role === 'student' && !students.find(s => s.user_id === u.id)).map(u =>
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    )}
                  </select>
                  <button onClick={addStudent} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#667eea', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Thêm</button>
                  <button onClick={() => { setShowStudentForm(false); setSelectedStudent(''); }} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 13, cursor: 'pointer' }}><FiX size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setShowStudentForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: '#667eea', fontSize: 13, cursor: 'pointer' }}>
                  <FiPlus size={14} /> Thêm sinh viên
                </button>
              )}
            </div>
            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: mutedColor, fontSize: 14 }}>Chưa có sinh viên nào</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {students.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: dark ? '#111827' : '#f9fafb' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{s.student_name}</div>
                      <div style={{ fontSize: 12, color: mutedColor }}>{s.student_email}</div>
                    </div>
                    <button onClick={() => removeStudent(s.user_id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
