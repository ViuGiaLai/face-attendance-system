import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiMail, FiLock, FiLogIn, FiAlertCircle, FiCamera,
  FiShield, FiCheckCircle, FiEye, FiEyeOff,
  FiZap, FiClock, FiBarChart2
} from 'react-icons/fi';
import './auth.css';

const Login = () => {
  const { dark } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Email không đúng định dạng';
    if (!formData.password) errs.password = 'Vui lòng nhập mật khẩu';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.field) {
        setErrors(prev => ({ ...prev, [data.field]: data.error }));
      } else {
        setServerError(data?.error || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <FiCamera size={16} />, title: 'Nhận diện khuôn mặt AI', desc: 'Face recognition chính xác cao' },
    { icon: <FiClock size={16} />, title: 'Điểm danh tự động', desc: 'Check-in / check-out nhanh chóng' },
    { icon: <FiBarChart2 size={16} />, title: 'Quản lý tập trung', desc: 'Dashboard thống kê, xuất báo cáo' },
  ];

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const inputBg = dark ? '#374151' : '#f9fafb';

  return (
    <div className="auth-page" style={{ background: dark ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : undefined }}>
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
            <p>Điểm danh sử dụng công nghệ nhận diện khuôn mặt giúp quản lý thời gian thực, chính xác và bảo mật.</p>
          </div>
          <div className="auth-brand-features">
            {features.map((f, i) => (
              <div key={i} className="auth-brand-feature">
                <div className="auth-brand-feature-icon" style={{ color: '#a5b4fc' }}>{f.icon}</div>
                <div className="auth-brand-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-form-section" style={{ background: bgCard }}>
          <div className="auth-form-header">
            <h2 style={{ color: textColor }}>Đăng nhập</h2>
            <p style={{ color: mutedColor }}>Nhập thông tin tài khoản để tiếp tục</p>
          </div>

          {serverError && (
            <div className="auth-message error">
              <FiAlertCircle size={15} />
              <span>{serverError}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <label className="auth-input-label" style={{ color: textColor }}>Email</label>
              <div className="auth-input-wrapper" style={{ borderColor: errors.email ? '#ef4444' : dark ? '#4b5563' : '#d1d5db' }}>
                <span className="auth-input-icon"><FiMail size={17} /></span>
                <input className="auth-input" type="email" name="email" placeholder="example@email.com"
                  value={formData.email} onChange={handleChange} disabled={loading} autoFocus
                  style={{ background: inputBg, color: textColor }} />
              </div>
              {errors.email && <span className="auth-field-error">{errors.email}</span>}
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label" style={{ color: textColor }}>Mật khẩu</label>
              <div className="auth-input-wrapper" style={{ borderColor: errors.password ? '#ef4444' : dark ? '#4b5563' : '#d1d5db' }}>
                <span className="auth-input-icon"><FiLock size={17} /></span>
                <input className="auth-input" type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={formData.password} onChange={handleChange} disabled={loading}
                  style={{ background: inputBg, color: textColor }} />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.password && <span className="auth-field-error">{errors.password}</span>}
            </div>

            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? <><div className="auth-button-spinner" /> Đang đăng nhập...</>
                : <><FiLogIn size={17} /> Đăng nhập</>}
            </button>
          </form>

          <div className="auth-form-footer">
            <p style={{ color: mutedColor }}>Chưa có tài khoản? <Link to="/register" style={{ color: '#667eea' }}>Đăng ký ngay</Link></p>
            <div className="auth-security-badge" style={{ color: mutedColor }}>
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