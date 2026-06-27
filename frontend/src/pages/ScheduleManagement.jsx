import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { schedulesAPI, classesAPI, subjectsAPI } from '../services/api';
import { FiPlus, FiTrash2, FiX, FiCalendar } from 'react-icons/fi';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const ScheduleManagement = () => {
  const { dark } = useTheme();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ class_id: '', subject_id: '', day_of_week: 0, start_time: '07:00', end_time: '08:30', room: '' });
  const [filterDay, setFilterDay] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const inputBg = dark ? '#374151' : '#f9fafb';

  const fetchAll = useCallback(async () => {
    try {
      const [schRes, clsRes, subjRes] = await Promise.all([
        schedulesAPI.getAll(filterDay ? { day_of_week: filterDay } : {}),
        classesAPI.getAll(),
        subjectsAPI.getAll(),
      ]);
      setSchedules(schRes.data.schedules);
      setClasses(clsRes.data.classes);
      setSubjects(subjRes.data.subjects);
    } catch (err) {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [filterDay]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setFormData({ class_id: '', subject_id: '', day_of_week: 0, start_time: '07:00', end_time: '08:30', room: '' });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await schedulesAPI.create(formData);
      setSuccess('Tạo lịch học thành công');
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa lịch học này?')) return;
    try {
      await schedulesAPI.delete(id);
      setSuccess('Xóa lịch học thành công');
      fetchAll();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const groupedByDay = {};
  schedules.forEach(s => {
    if (!groupedByDay[s.day_of_week]) groupedByDay[s.day_of_week] = [];
    groupedByDay[s.day_of_week].push(s);
  });

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
    background: inputBg, color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Thời khóa biểu</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 4 }}>{schedules.length} lịch học</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
          border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <FiPlus size={16} /> Thêm lịch học
        </button>
      </div>

      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#451a1a' : '#fef2f2', color: dark ? '#fca5a5' : '#dc2626', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: dark ? '#14532d' : '#f0fdf4', color: dark ? '#bbf7d0' : '#16a34a', marginBottom: 16, fontSize: 13 }}>{success}</div>}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: bgCard, borderRadius: 16, padding: 28, width: '90%', maxWidth: 500, border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: textColor, margin: 0 }}>Thêm lịch học</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: mutedColor, cursor: 'pointer', fontSize: 18 }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Lớp *</label>
                <select style={inputStyle} value={formData.class_id} onChange={e => setFormData({ ...formData, class_id: e.target.value })} required>
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Môn học *</label>
                <select style={inputStyle} value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} required>
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Thứ *</label>
                <select style={inputStyle} value={formData.day_of_week} onChange={e => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Giờ bắt đầu</label>
                  <input type="time" style={inputStyle} value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Giờ kết thúc</label>
                  <input type="time" style={inputStyle} value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>Phòng</label>
                <input style={inputStyle} value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} placeholder="VD: A101" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 14, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Tạo lịch học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterDay('')} style={{
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${borderColor}`,
          background: !filterDay ? '#667eea' : 'transparent',
          color: !filterDay ? 'white' : mutedColor, fontSize: 13, cursor: 'pointer', fontWeight: 600,
        }}>Tất cả</button>
        {DAYS.map((d, i) => (
          <button key={i} onClick={() => setFilterDay(i.toString())} style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${borderColor}`,
            background: filterDay === i.toString() ? '#667eea' : 'transparent',
            color: filterDay === i.toString() ? 'white' : mutedColor, fontSize: 13, cursor: 'pointer', fontWeight: 600,
          }}>{d}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: mutedColor }}>Đang tải...</div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: mutedColor }}>
          <FiCalendar size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Chưa có lịch học nào</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groupedByDay).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([day, items]) => (
            <div key={day}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: textColor, marginBottom: 8 }}>
                {DAYS[parseInt(day)]}
                <span style={{ fontWeight: 400, color: mutedColor, marginLeft: 8, fontSize: 13 }}>({items.length} lịch)</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(sch => (
                  <div key={sch.id} style={{
                    background: bgCard, borderRadius: 12, padding: '12px 16px',
                    border: `1px solid ${borderColor}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 10,
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2,
                        }}>
                          {sch.start_time.slice(0, 5)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{sch.subject_name}</div>
                          <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>
                            {sch.class_name} ({sch.class_code})
                            {sch.room && <span> — {sch.room}</span>}
                          </div>
                          <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                            {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(sch.id)} style={{
                        padding: '6px 10px', borderRadius: 8, border: `1px solid ${borderColor}`,
                        background: 'transparent', color: '#ef4444', fontSize: 13, cursor: 'pointer',
                      }}><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
