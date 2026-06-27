import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usersAPI, faceAPI } from '../services/api';
import WebcamCapture from '../components/WebcamCapture';
import {
  FiUser, FiShield, FiCamera, FiEdit2, FiSave, FiX,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiTrash2, FiUsers,
  FiSearch, FiSmartphone, FiBook, FiHash
} from 'react-icons/fi';

const UserManagement = () => {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const inputBg = dark ? '#374151' : '#f9fafb';

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const response = await usersAPI.getAll(params);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (u) => {
    setEditingUser({ ...u });
    setShowFaceRegistration(false);
  };

  const handleSaveUser = async () => {
    try {
      await usersAPI.update(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        is_active: editingUser.is_active,
        student_code: editingUser.student_code,
        phone: editingUser.phone,
        department: editingUser.department,
        status: editingUser.status,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi cập nhật');
    }
  };

  const handleFaceRegistration = async (imageData) => {
    if (!editingUser) return;
    try {
      await faceAPI.register({ image_data: imageData, user_id: editingUser.id });
      setShowFaceRegistration(false);
      fetchUsers();
      alert('Đăng ký khuôn mặt thành công!');
    } catch (error) {
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi đăng ký khuôn mặt');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'teacher': return 'role-teacher';
      default: return 'role-student';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'teacher': return 'Giáo viên';
      default: return 'Học sinh';
    }
  };

  const getStatusStyle = (status) => {
    const map = {
      active: { bg: dark ? '#14532d' : '#f0fdf4', color: dark ? '#bbf7d0' : '#16a34a' },
      inactive: { bg: dark ? '#451a1a' : '#fef2f2', color: dark ? '#fca5a5' : '#dc2626' },
      graduated: { bg: dark ? '#1e3a5f' : '#eff6ff', color: dark ? '#93c5fd' : '#2563eb' },
      suspended: { bg: dark ? '#451a1a' : '#fef2f2', color: dark ? '#fca5a5' : '#dc2626' },
    };
    return map[status] || map.active;
  };

  const getStatusLabel = (status) => {
    const map = {
      active: 'Đang học',
      inactive: 'Nghỉ học',
      graduated: 'Đã tốt nghiệp',
      suspended: 'Bị đình chỉ',
    };
    return map[status] || status;
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
    background: inputBg, color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  if (user.role !== 'admin') {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: bgCard, borderRadius: 12, padding: '2rem', textAlign: 'center', border: `1px solid ${borderColor}` }}>
          <FiShield size={48} style={{ color: mutedColor, marginBottom: 12 }} />
          <h2 style={{ color: textColor, marginBottom: 8 }}>Không có quyền truy cập</h2>
          <p style={{ color: mutedColor }}>Bạn không có quyền truy cập trang quản lý người dùng.</p>
        </div>
      </div>
    );
  }

  const tableHeadStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' };
  const tableCellStyle = { padding: '10px 12px', fontSize: 13, color: textColor, borderBottom: `1px solid ${borderColor}` };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Quản lý người dùng</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 2 }}>{users.length} người dùng</p>
        </div>
        <button onClick={fetchUsers} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 13, cursor: 'pointer' }}>
          <FiRefreshCw size={13} /> Làm mới
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <FiSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: mutedColor }} />
          <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Tìm kiếm tên, email, mã số..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width: 'auto', minWidth: 140 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="student">Học sinh</option>
          <option value="teacher">Giáo viên</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </div>

      {editingUser && (
        <div style={{ background: bgCard, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${borderColor}`, borderLeft: '4px solid #667eea' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {showFaceRegistration ? <FiCamera size={16} /> : <FiEdit2 size={16} />}
              {showFaceRegistration ? `Đăng ký khuôn mặt: ${editingUser.name}` : 'Chỉnh sửa người dùng'}
            </h3>
            <button onClick={() => { setEditingUser(null); setShowFaceRegistration(false); }} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiX size={13} /> Đóng
            </button>
          </div>
          {showFaceRegistration ? (
            <WebcamCapture onCapture={handleFaceRegistration} mode="register" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Tên</label>
                <input style={inputStyle} value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Email</label>
                <input style={inputStyle} value={editingUser.email} disabled />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Mã số SV/NV</label>
                <input style={inputStyle} value={editingUser.student_code || ''} onChange={e => setEditingUser({ ...editingUser, student_code: e.target.value })} placeholder="VD: 20210001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Số điện thoại</label>
                <input style={inputStyle} value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} placeholder="VD: 0912345678" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Khoa/Phòng ban</label>
                <input style={inputStyle} value={editingUser.department || ''} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} placeholder="VD: Công nghệ thông tin" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Vai trò</label>
                <select style={inputStyle} value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                  <option value="student">Học sinh / Sinh viên</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>Trạng thái</label>
                <select style={inputStyle} value={editingUser.status || 'active'} onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}>
                  <option value="active">Đang học</option>
                  <option value="inactive">Nghỉ học</option>
                  <option value="graduated">Đã tốt nghiệp</option>
                  <option value="suspended">Bị đình chỉ</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '10px 0', fontSize: 13, color: textColor }}>
                  <input type="checkbox" checked={editingUser.is_active} onChange={e => setEditingUser({ ...editingUser, is_active: e.target.checked })} style={{ width: 16, height: 16 }} />
                  Đang hoạt động
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button onClick={handleSaveUser} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiSave size={14} /> Lưu
                </button>
                <button onClick={() => setShowFaceRegistration(true)} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiCamera size={14} /> Đăng ký khuôn mặt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: mutedColor }}>Đang tải...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: mutedColor }}>
          <FiUsers size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Không tìm thấy người dùng</p>
        </div>
      ) : (
        <div style={{ background: bgCard, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Tên</th>
                  <th style={tableHeadStyle}>Email</th>
                  <th style={tableHeadStyle}>Mã số</th>
                  <th style={tableHeadStyle}>SĐT</th>
                  <th style={tableHeadStyle}>Khoa</th>
                  <th style={tableHeadStyle}>Vai trò</th>
                  <th style={tableHeadStyle}>Khuôn mặt</th>
                  <th style={tableHeadStyle}>Trạng thái</th>
                  <th style={tableHeadStyle}>Ngày tạo</th>
                  <th style={tableHeadStyle}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? '#111827' : '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{u.name}</td>
                    <td style={{ ...tableCellStyle, color: mutedColor }}>{u.email}</td>
                    <td style={tableCellStyle}><span style={{ fontSize: 12, color: mutedColor }}>{u.student_code || '—'}</span></td>
                    <td style={tableCellStyle}><span style={{ fontSize: 12, color: mutedColor }}>{u.phone || '—'}</span></td>
                    <td style={tableCellStyle}><span style={{ fontSize: 12, color: mutedColor }}>{u.department || '—'}</span></td>
                    <td style={tableCellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? '#374151' : '#f3f4f6', color: mutedColor }}>
                        {u.role === 'admin' ? <FiShield size={11} /> : u.role === 'teacher' ? <FiUser size={11} /> : <FiUser size={11} />}
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: (u.is_face_registered || u.has_face_image) ? (dark ? '#1e3a5f' : '#eff6ff') : (dark ? '#451a1a' : '#fef2f2'), color: (u.is_face_registered || u.has_face_image) ? (dark ? '#93c5fd' : '#2563eb') : (dark ? '#fca5a5' : '#dc2626') }}>
                        {(u.is_face_registered || u.has_face_image) ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
                        {(u.is_face_registered || u.has_face_image) ? 'Đã đăng ký' : 'Chưa ĐK'}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: getStatusStyle(u.status || 'active').bg, color: getStatusStyle(u.status || 'active').color }}>
                        {getStatusLabel(u.status || 'active')}
                      </span>
                    </td>
                    <td style={{ ...tableCellStyle, fontSize: 12, color: mutedColor }}>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    <td style={tableCellStyle}>
                      <button onClick={() => handleEditUser(u)} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${borderColor}`, background: 'transparent', color: '#667eea', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiEdit2 size={11} /> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
