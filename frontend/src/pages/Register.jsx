import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import {
  FiUser, FiMail, FiLock, FiAlertCircle, FiCheckCircle,
  FiCamera, FiUserPlus, FiShield, FiUsers
} from 'react-icons/fi';
import './auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register({
        name: formData.name, email: formData.email,
        password: formData.password, role: formData.role
      });
      setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <FiShield size={17} />;
      case 'teacher': return <FiUsers size={17} />;
      default: return <FiUser size={17} />;
    }
  };

  const roleOptions = [
    { value: 'student', label: 'Học sinh / Sinh viên' },
    { value: 'teacher', label: 'Giáo viên' },
    { value: 'admin', label: 'Quản trị viên' }
  ];

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <div className="auth-brand-logo-icon"><FiCamera size={22} /></div>
            <div>
              <div className="auth-brand-title">FaceAttendance</div>
              <div className="auth-brand-subtitle">Hệ thống điểm danh thông minh</div>
            </div>
          </div>
          <div className="auth-brand-hero">
            <h2>Bắt đầu ngay hôm nay</h2>
            <p>Tạo tài khoản miễn phí và trải nghiệm hệ thống điểm danh nhận diện khuôn mặt hiện đại nhất.</p>
          </div>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Đăng ký nhanh chóng</h4>
                <p>Chỉ mất 30 giây để tạo tài khoản</p>
              </div>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Giao diện thân thiện</h4>
                <p>Dễ sử dụng cho mọi đối tượng</p>
              </div>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Hoàn toàn miễn phí</h4>
                <p>Dùng thử tất cả tính năng 30 ngày</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-header">
            <h2>Tạo tài khoản mới</h2>
            <p>Điền thông tin bên dưới để đăng ký</p>
          </div>

          {error && (
            <div className="auth-message error">
              <FiAlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="auth-message success">
              <FiCheckCircle size={15} />
              <span>{success}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-input-label">Họ và tên</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiUser size={17} /></span>
                <input className="auth-input" type="text" name="name" placeholder="Nguyễn Văn A"
                  value={formData.name} onChange={handleChange} required disabled={loading} autoFocus />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiMail size={17} /></span>
                <input className="auth-input" type="email" name="email" placeholder="example@email.com"
                  value={formData.email} onChange={handleChange} required disabled={loading} />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Vai trò</label>
              <div className="auth-input-wrapper auth-select-wrapper">
                <span className="auth-input-icon">{getRoleIcon(formData.role)}</span>
                <select className="auth-select" name="role" value={formData.role}
                  onChange={handleChange} disabled={loading}>
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiLock size={17} /></span>
                <input className="auth-input" type="password" name="password" placeholder="Ít nhất 6 ký tự"
                  value={formData.password} onChange={handleChange} required disabled={loading} />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Xác nhận mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiLock size={17} /></span>
                <input className="auth-input" type="password" name="confirmPassword" placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword} onChange={handleChange} required disabled={loading} />
              </div>
            </div>
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? <><div className="auth-button-spinner" /> Đang đăng ký...</>
                : <><FiUserPlus size={17} /> Đăng ký tài khoản</>}
            </button>
          </form>

          <div className="auth-form-footer">
            <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
            <div className="auth-security-badge">
              <FiShield size={11} /> Bảo mật SSL 256-bit
              <FiCheckCircle size={11} /> Dữ liệu được bảo vệ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
