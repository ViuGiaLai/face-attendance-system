import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiCamera, FiClock, FiUsers, FiLogOut, FiShield, FiUser
} from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Trang chủ', icon: FiGrid },
    { to: '/attendance', label: 'Điểm danh', icon: FiCamera },
    { to: '/history', label: 'Lịch sử', icon: FiClock },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/users', label: 'Người dùng', icon: FiUsers });
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const roleBadge = user?.role === 'admin' ? { label: 'Admin', color: '#f59e0b', icon: FiShield }
    : user?.role === 'teacher' ? { label: 'GV', color: '#3b82f6', icon: FiUser }
    : { label: 'HS', color: '#8b5cf6', icon: FiUser };

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #f3f4f6',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 60,
        gap: 8,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none', flexShrink: 0,
        }}>
          <div style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FiCamera size={13} color="white" />
          </div>
          <span style={{
            fontSize: 14, fontWeight: 800, color: '#1f2937',
            letterSpacing: '-0.3px',
          }}>FaceAttendance</span>
        </Link>

        {/* Nav links - desktop shows inline, mobile scrolls */}
        <div style={{
          display: 'flex', gap: 2,
          flex: 1, justifyContent: 'center',
          overflowX: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}>
          {navItems.map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
              color: isActive(item.to) ? '#667eea' : '#6b7280',
              background: isActive(item.to) ? '#f0f4ff' : 'transparent',
            }}>
              <item.icon size={13} />
              <span style={{ display: 'inline' }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User + Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px 3px 3px', borderRadius: 8,
              background: '#f9fafb',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: roleBadge.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <roleBadge.icon size={10} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1f2937', lineHeight: 1.1 }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500, lineHeight: 1 }}>
                  {roleBadge.label}
                </div>
              </div>
            </div>

            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '5px 8px', border: 'none', borderRadius: 8,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              color: '#6b7280', background: 'transparent',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}>
              <FiLogOut size={12} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
