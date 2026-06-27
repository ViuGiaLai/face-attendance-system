import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { subjectsAPI } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiBook } from 'react-icons/fi';

const SubjectManagement = () => {
  const { dark } = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', credits: 3, department: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const inputBg = dark ? '#374151' : '#f9fafb';

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await subjectsAPI.getAll();
      setSubjects(res.data.subjects);
    } catch (err) {
      setError('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', code: '', credits: 3, department: '', description: '' });
    setShowForm(true);
    setError('');
  };

  const openEdit = (subj) => {
    setEditing(subj);
    setFormData({
      name: subj.name,
      code: subj.code,
      credits: subj.credits,
      department: subj.department || '',
      description: subj.description || '',
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
        await subjectsAPI.update(editing.id, formData);
        setSuccess('Cập nhật môn học thành công');
      } else {
        await subjectsAPI.create(formData);
        setSuccess('Tạo môn học thành công');
      }
      setShowForm(false);
      setEditing(null);
      fetchSubjects();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa môn học này?')) return;
    try {
      await subjectsAPI.delete(id);
      setSuccess('Xóa môn học thành công');
      fetchSubjects();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const filtered = subjects.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
    background: inputBg, color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Quản lý môn học</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 4 }}>{subjects.length} môn học</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
          border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <FiPlus size={16} /> Thêm môn học
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#451a1a' : '#fef2f2', color: dark ? '#fca5a5' : '#dc2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#14532d' : '#f0fdf4', color: dark ? '#bbf7d0' : '#16a34a', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: bgCard, borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: textColor, margin: 0 }}>{editing ? 'Sửa môn học' : 'Thêm môn học mới'}</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: mutedColor, cursor: 'pointer', fontSize: 18 }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Tên môn học *</label>
                <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: Lập trình Python" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Mã môn học *</label>
                <input style={inputStyle} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required placeholder="VD: PYTHON101" />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Số tín chỉ</label>
                  <input type="number" min={1} max={10} style={inputStyle} value={formData.credits} onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) || 3 })} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Khoa</label>
                  <input style={inputStyle} value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="VD: Công nghệ thông tin" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Mô tả</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả ngắn về môn học..." />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {editing ? 'Cập nhật' : 'Tạo môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: mutedColor }} />
        <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Tìm kiếm môn học..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: mutedColor }}>Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: mutedColor }}>
          <FiBook size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Chưa có môn học nào</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(subj => (
            <div key={subj.id} style={{
              background: bgCard, borderRadius: 12, padding: '14px 20px',
              border: `1px solid ${borderColor}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, margin: 0 }}>{subj.name}</h3>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: dark ? '#374151' : '#f3f4f6', color: mutedColor, fontWeight: 600 }}>{subj.code}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#eef2ff', color: '#6366f1', fontWeight: 600 }}>{subj.credits} TC</span>
                  </div>
                  <div style={{ fontSize: 13, color: mutedColor }}>
                    {subj.department && <span>{subj.department}</span>}
                    {subj.description && <span> — {subj.description.slice(0, 80)}{subj.description.length > 80 ? '...' : ''}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(subj)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiEdit2 size={13} /> Sửa
                  </button>
                  <button onClick={() => handleDelete(subj.id)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiTrash2 size={13} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
