import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, faceAPI } from '../services/api';
import WebcamCapture from '../components/WebcamCapture';
import {
  FiUser, FiShield, FiCamera, FiEdit2, FiSave, FiX,
  FiCheckCircle, FiXCircle, FiRefreshCw, FiTrash2, FiUsers
} from 'react-icons/fi';
import '../App.css';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
        is_active: editingUser.is_active
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Có lỗi xảy ra khi cập nhật người dùng');
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

  if (user.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="content-card">
          <div className="content-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <FiShield size={48} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
            <h2 style={{ color: '#374151', marginBottom: '0.5rem' }}>Không có quyền truy cập</h2>
            <p style={{ color: '#6b7280' }}>Bạn không có quyền truy cập trang quản lý người dùng.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="auth-button-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header-main">
        <div>
          <h1>Quản lý người dùng</h1>
          <p>Quản lý tài khoản và đăng ký khuôn mặt</p>
        </div>
        <div className="page-actions">
          <button className="btn-modern outline small" onClick={fetchUsers}>
            <FiRefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      {editingUser && (
        <div className="content-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="content-card-header">
            <h3>
              {showFaceRegistration ? <FiCamera size={16} /> : <FiEdit2 size={16} />}
              {showFaceRegistration ? `Đăng ký khuôn mặt: ${editingUser.name}` : 'Chỉnh sửa người dùng'}
            </h3>
            <button className="btn-modern danger small" onClick={() => { setEditingUser(null); setShowFaceRegistration(false); }}>
              <FiX size={13} /> Đóng
            </button>
          </div>
          <div className="content-card-body">
            {showFaceRegistration ? (
              <div>
                <WebcamCapture onCapture={handleFaceRegistration} mode="register" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
                <div className="filter-group">
                  <label>Tên</label>
                  <input
                    className="filter-input"
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="filter-group">
                  <label>Vai trò</label>
                  <select
                    className="filter-input"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="student">Học sinh / Sinh viên</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingUser.is_active}
                      onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    Tài khoản đang hoạt động
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn-modern primary small" onClick={handleSaveUser}>
                    <FiSave size={13} /> Lưu
                  </button>
                  <button className="btn-modern success small" onClick={() => setShowFaceRegistration(true)}>
                    <FiCamera size={13} /> Đăng ký khuôn mặt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiUsers size={16} /> Danh sách người dùng</h3>
          <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 500 }}>
            {users.length} người dùng
          </span>
        </div>
        <div className="content-card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Khuôn mặt</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-name">{u.name}</td>
                    <td className="cell-email">{u.email}</td>
                    <td>
                      <span className={`status-badge ${getRoleBadge(u.role)}`}>
                        {u.role === 'admin' ? <FiShield size={11} /> : <FiUser size={11} />}
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.is_face_registered || u.has_face_image ? 'face-registered' : 'face-unregistered'}`}>
                        {u.is_face_registered || u.has_face_image ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
                        {u.is_face_registered || u.has_face_image ? 'Đã đăng ký' : 'Chưa đăng ký'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button className="btn-modern primary small" onClick={() => handleEditUser(u)}>
                        <FiEdit2 size={12} /> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
