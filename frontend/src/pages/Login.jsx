import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiMail, FiLock, FiLogIn, FiAlertCircle, FiCamera,
  FiShield, FiCheckCircle
} from 'react-icons/fi';
import './auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

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
            <h2>Chào mừng bạn quay trở lại</h2>
            <p>Hệ thống điểm danh sử dụng công nghệ nhận diện khuôn mặt giúp quản lý thời gian thực, chính xác và bảo mật.</p>
          </div>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Nhận diện khuôn mặt AI</h4>
                <p>Công nghệ face recognition chính xác cao</p>
              </div>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Điểm danh tự động</h4>
                <p>Check-in / check-out nhanh chóng, chính xác</p>
              </div>
            </div>
            <div className="auth-brand-feature">
              <div className="auth-brand-feature-icon"><FiCamera size={16} /></div>
              <div className="auth-brand-feature-text">
                <h4>Quản lý tập trung</h4>
                <p>Dashboard thống kê và xuất báo cáo chi tiết</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-header">
            <h2>Đăng nhập</h2>
            <p>Nhập thông tin tài khoản để tiếp tục</p>
          </div>

          {error && (
            <div className="auth-message error">
              <FiAlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-input-label">Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiMail size={17} /></span>
                <input className="auth-input" type="email" name="email" placeholder="example@email.com"
                  value={formData.email} onChange={handleChange} required disabled={loading} autoFocus />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon"><FiLock size={17} /></span>
                <input className="auth-input" type="password" name="password" placeholder="••••••••"
                  value={formData.password} onChange={handleChange} required disabled={loading} />
              </div>
            </div>
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? <><div className="auth-button-spinner" /> Đang đăng nhập...</>
                : <><FiLogIn size={17} /> Đăng nhập</>}
            </button>
          </form>

          <div className="auth-form-footer">
            <p>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
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

export default Login;
