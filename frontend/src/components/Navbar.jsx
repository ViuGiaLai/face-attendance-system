import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="navbar-brand">
            Hệ thống điểm danh khuôn mặt
          </Link>
          
          {user && (
            <ul className="navbar-nav">
              <li><Link to="/">Trang chủ</Link></li>
              <li><Link to="/attendance">Điểm danh</Link></li>
              <li><Link to="/history">Lịch sử</Link></li>
              {user.role === 'admin' && (
                <li><Link to="/users">Quản lý người dùng</Link></li>
              )}
              <li>
                <span style={{ color: 'white', marginRight: '10px' }}>
                  Xin chào, {user.name}
                </span>
                <button onClick={handleLogout} className="btn btn-danger btn-sm">
                  Đăng xuất
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;