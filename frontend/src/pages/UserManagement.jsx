import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, faceAPI } from '../services/api';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Use useCallback to prevent unnecessary re-renders
  const fetchUsers = useCallback(async () => {
    try {
      // console.log('🔄 Fetching users data...');
      const response = await usersAPI.getAll();
      // console.log('✅ Users data received:', response.data.users);
      
      // // Debug logging for each user's face registration status
      // response.data.users.forEach(user => {
      //   console.log(`👤 ${user.name}: is_face_registered=${user.is_face_registered}, has_face_image=${user.has_face_image}`);
      // });
      
      setUsers(response.data.users);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and set up polling
  useEffect(() => {
    fetchUsers();
    
    // Set up polling every 5 seconds
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchUsers();
    alert('✅ Đã làm mới dữ liệu người dùng');
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    try {
      await usersAPI.update(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        is_active: editingUser.is_active
      });
      
      setEditingUser(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Có lỗi xảy ra khi cập nhật người dùng');
    }
  };

  const handleFaceRegistration = async (imageData) => {
    if (!editingUser) return;

    try {
      await faceAPI.register({
        image_data: imageData,
        user_id: editingUser.id
      });
      
      setShowFaceRegistration(false);
      fetchUsers(); // Refresh to show updated face encoding status
      alert('Đăng ký khuôn mặt thành công!');
    } catch (error) {
      console.error('Error registering face:', error);
      alert(error.response?.data?.error || 'Có lỗi xảy ra khi đăng ký khuôn mặt');
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="container">
        <div className="card">
          <h2>Không có quyền truy cập</h2>
          <p>Bạn không có quyền truy cập trang quản lý người dùng.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="container">
      <h1>Quản lý người dùng</h1>

      {showFaceRegistration && editingUser && (
        <div className="card">
          <h3>Đăng ký khuôn mặt cho: {editingUser.name}</h3>
          <WebcamCapture 
            onCapture={handleFaceRegistration}
            mode="register"
          />
          <button 
            onClick={() => setShowFaceRegistration(false)}
            className="btn btn-danger"
            style={{ marginTop: '10px' }}
          >
            Hủy
          </button>
        </div>
      )}

      {editingUser && !showFaceRegistration && (
        <div className="card">
          <h3>Chỉnh sửa người dùng</h3>
          <div className="form-group">
            <label className="form-label">Tên</label>
            <input
              type="text"
              value={editingUser.name}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select
              value={editingUser.role}
              onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              className="form-input"
            >
              <option value="student">Học sinh/Sinh viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={editingUser.is_active}
                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Tài khoản đang hoạt động
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveUser} className="btn btn-primary">
              Lưu
            </button>
            <button 
              onClick={() => setShowFaceRegistration(true)} 
              className="btn btn-success"
            >
              Đăng ký khuôn mặt
            </button>
            <button 
              onClick={() => setEditingUser(null)} 
              className="btn btn-danger"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Danh sách người dùng ({users.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
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
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.role === 'student' ? 'Học sinh' : 
                     user.role === 'teacher' ? 'Giáo viên' : 'Quản trị viên'}
                  </td>
                  <td>
                    {user.is_face_registered || user.has_face_image ? (
                      <span style={{ color: 'green' }}>✓ Đã đăng ký</span>
                    ) : (
                      <span style={{ color: 'red' }}>✗ Chưa đăng ký</span>
                    )}
                  </td>
                  <td>
                    {user.is_active ? (
                      <span style={{ color: 'green' }}>Đang hoạt động</span>
                    ) : (
                      <span style={{ color: 'red' }}>Đã khóa</span>
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="btn btn-primary btn-sm"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;