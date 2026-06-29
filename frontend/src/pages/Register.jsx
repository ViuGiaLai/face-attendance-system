import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import {
  FiUser, FiMail, FiLock, FiAlertCircle, FiCheckCircle,
  FiCamera, FiUserPlus, FiShield, FiUsers, FiSmartphone, FiHash, FiBook,
  FiEye, FiEyeOff, FiZap, FiLayout, FiHeart
} from 'react-icons/fi';
import './auth.css';

const Register = () => {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('registerForm');
    return saved ? JSON.parse(saved) : {
      name: '', email: '', password: '', confirmPassword: '', role: 'student',
      student_code: '', phone: '', department: ''
    };
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!success) sessionStorage.setItem('registerForm', JSON.stringify(formData));
  }, [formData, success]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email không đúng định dạng';
    if (formData.phone && !/^(0|\+84)[3-9][0-9]{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }
    if (formData.student_code && !/^[A-Za-z0-9_-]{3,20}$/.test(formData.student_code)) {
      newErrors.student_code = 'Mã số không hợp lệ (3-20 ký tự, chữ/số/-/_)';
    }
    if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (formData.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});
    setSuccess('');

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        name: formData.name, email: formData.email,
        password: formData.password, role: formData.role,
        student_code: formData.student_code,
        phone: formData.phone,
        department: formData.department,
      });
      sessionStorage.removeItem('registerForm');
      setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const field = err.response?.data?.field;
      if (field) {
        setErrors(prev => ({ ...prev, [field]: err.response.data.error }));
      } else {
        setError(err.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
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

  const features = [
    { icon: <FiZap size={16} />, title: 'Đăng ký nhanh chóng', desc: 'Chỉ mất 30 giây để tạo tài khoản' },
    { icon: <FiLayout size={16} />, title: 'Giao diện thân thiện', desc: 'Thiết kế hiện đại, dễ sử dụng' },
    { icon: <FiHeart size={16} />, title: 'Hoàn toàn miễn phí', desc: 'Dùng thử tất cả tính năng 30 ngày' },
  ];

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const inputBg = dark ? '#374151' : '#f9fafb';

  const InputField = ({ icon, type, name, placeholder, label, required, autoComplete, hasError, errorMsg, rightIcon, onRightClick }) => (
    <div className="auth-input-group">
      <label className="auth-input-label" style={{ color: textColor }}>{label}{required && ' *'}</label>
      <div className="auth-input-wrapper" style={{ borderColor: hasError ? '#ef4444' : dark ? '#4b5563' : '#d1d5db' }}>
        <span className="auth-input-icon" style={{ color: mutedColor }}>{icon}</span>
        <input className="auth-input" style={{
          background: inputBg, color: textColor,
          paddingRight: rightIcon ? 40 : 38,
        }}
          type={type} name={name} placeholder={placeholder}
          value={formData[name]} onChange={handleChange}
          required={required} disabled={loading} autoComplete={autoComplete} />
        {rightIcon && (
          <button type="button" className="auth-input-toggle" onClick={onRightClick} tabIndex={-1}>
            {rightIcon}
          </button>
        )}
      </div>
      {hasError && <div className="auth-field-error">{errorMsg}</div>}
    </div>
  );

  return (
    <div className="auth-page" style={{ background: dark ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : undefined }}>
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src="/logo_face.ico" alt="FaceAttendance" className="auth-brand-logo-icon" style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div>
              <div className="auth-brand-title">FaceAttendance</div>
              <div className="auth-brand-subtitle">Hệ thống điểm danh thông minh</div>
            </div>
          </div>
          <div className="auth-brand-hero">
            <h2>Bắt đầu ngay hôm nay</h2>
            <p>Tạo tài khoản và trải nghiệm hệ thống điểm danh nhận diện khuôn mặt hiện đại.</p>
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
            <h2 style={{ color: textColor }}>Tạo tài khoản mới</h2>
            <p style={{ color: mutedColor }}>Điền thông tin bên dưới để đăng ký</p>
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

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <InputField icon={<FiUser size={17} />} type="text" name="name" placeholder="Nguyễn Văn A"
                label="Họ và tên" required autoComplete="name"
                hasError={!!errors.name} errorMsg={errors.name} />
              <InputField icon={<FiMail size={17} />} type="email" name="email" placeholder="example@email.com"
                label="Email" required autoComplete="email"
                hasError={!!errors.email} errorMsg={errors.email} />
              <div className="auth-input-group">
                <label className="auth-input-label" style={{ color: textColor }}>Vai trò</label>
                <div className="auth-input-wrapper" style={{ borderColor: dark ? '#4b5563' : '#d1d5db' }}>
                  <span className="auth-input-icon" style={{ color: mutedColor }}>{getRoleIcon(formData.role)}</span>
                  <select className="auth-select" name="role" value={formData.role}
                    onChange={handleChange} disabled={loading}
                    style={{
                      background: inputBg, color: textColor, cursor: 'pointer',
                    }}>
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <InputField icon={<FiSmartphone size={17} />} type="tel" name="phone" placeholder="0912345678"
                label="Số điện thoại" autoComplete="tel"
                hasError={!!errors.phone} errorMsg={errors.phone} />
              <InputField icon={<FiHash size={17} />} type="text" name="student_code" placeholder="20210001"
                label="Mã số SV/NV" autoComplete="off"
                hasError={!!errors.student_code} errorMsg={errors.student_code} />
              <InputField icon={<FiBook size={17} />} type="text" name="department" placeholder="Công nghệ thông tin"
                label="Khoa / Phòng ban" autoComplete="organization"
                hasError={false} errorMsg="" />
            </div>

            <div style={{ borderTop: `1px solid ${loading ? 'transparent' : dark ? '#374151' : '#e5e7eb'}`, margin: '8px 0', paddingTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <InputField icon={<FiLock size={17} />} type={showPassword ? 'text' : 'password'}
                  name="password" placeholder="Ít nhất 6 ký tự" label="Mật khẩu" required autoComplete="new-password"
                  hasError={!!errors.password} errorMsg={errors.password}
                  rightIcon={showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  onRightClick={() => setShowPassword(!showPassword)} />
                <InputField icon={<FiLock size={17} />} type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword" placeholder="Nhập lại mật khẩu" label="Xác nhận mật khẩu" required autoComplete="new-password"
                  hasError={!!errors.confirmPassword} errorMsg={errors.confirmPassword}
                  rightIcon={showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  onRightClick={() => setShowConfirm(!showConfirm)} />
              </div>
            </div>

            <button className="auth-button" type="submit" disabled={loading}
              style={{ marginTop: 8 }}>
              {loading ? <><div className="auth-button-spinner" /> Đang đăng ký...</>
                : <><FiUserPlus size={17} /> Đăng ký tài khoản</>}
            </button>
          </form>

          <div className="auth-form-footer">
            <p style={{ color: mutedColor }}>Đã có tài khoản? <Link to="/login" style={{ color: '#667eea' }}>Đăng nhập</Link></p>
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

export default Register;
