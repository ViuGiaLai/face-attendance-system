import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiGrid, FiCamera, FiClock, FiUsers,
  FiLogOut, FiShield, FiUser,
  FiSun, FiMoon, FiMenu, FiX,
  FiBook, FiBookOpen, FiCalendar,
  FiChevronDown, FiHome,
} from 'react-icons/fi';

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

const Dropdown = ({ label, icon: Icon, items, dark, textColor, mutedColor, hoverBg, isActive, onNavigate }) => {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const anyActive = items.some(it => isActive(it.to));

  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 14px', borderRadius: 10,
        fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
        color: anyActive ? '#667eea' : mutedColor,
        background: anyActive ? (dark ? '#2d2d5e' : '#f0f4ff') : 'transparent',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}>
        <Icon size={14} />
        <span>{label}</span>
        <FiChevronDown size={12} style={{
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: dark ? '#1f2937' : 'white',
          border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
          borderRadius: 12, padding: 4, minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
        }}>
          {items.map(item => {
            const active = isActive(item.to);
            return (
              <Link key={item.to} to={item.to} onClick={() => { setOpen(false); onNavigate?.(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  color: active ? '#667eea' : textColor,
                  background: active ? (dark ? '#2d2d5e' : '#f0f4ff') : 'transparent',
                  transition: 'all 0.1s',
                }}>
                <item.icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpand, setMobileExpand] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const roleBadge = user?.role === 'admin' ? { label: 'Admin', color: '#f59e0b', icon: FiShield }
    : user?.role === 'teacher' ? { label: 'GV', color: '#3b82f6', icon: FiUser }
    : { label: 'HS', color: '#8b5cf6', icon: FiUser };

  const canManage = user?.role === 'admin' || user?.role === 'teacher';

  const attendanceItems = [
    { to: '/attendance', label: 'Điểm danh', icon: FiCamera },
    { to: '/history', label: 'Lịch sử', icon: FiClock },
  ];

  const manageItems = [
    { to: '/users', label: 'Người dùng', icon: FiUsers },
    { to: '/classes', label: 'Lớp học', icon: FiBookOpen },
    { to: '/subjects', label: 'Môn học', icon: FiBook },
    { to: '/schedules', label: 'TKB', icon: FiCalendar },
  ];

  const bgColor = dark ? '#1f2937' : 'white';
  const borderColor = dark ? '#374151' : '#f3f4f6';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const hoverBg = dark ? '#374151' : '#f9fafb';

  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 14px', borderRadius: 10,
    fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
    color: active ? '#667eea' : mutedColor,
    background: active ? (dark ? '#2d2d5e' : '#f0f4ff') : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <>
      <nav style={{
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        position: 'sticky', top: 0, zIndex: 100,
        transition: 'background 0.2s',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 16px', display: 'flex',
          alignItems: 'center', height: 60, gap: 4,
        }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            textDecoration: 'none', flexShrink: 0, marginRight: 8,
          }}>
            <img src="/logo_face.ico" alt="FaceAttendance" style={{ width: 30, height: 30, borderRadius: 8 }} />
            <span style={{
              fontSize: 14, fontWeight: 800, color: textColor,
              letterSpacing: '-0.3px', display: 'none',
            }} className="nav-logo-text">FaceAttendance</span>
          </Link>

          {/* Desktop nav links */}
          <div style={{
            display: 'flex', gap: 2, flex: 1, justifyContent: 'center',
          }} className="nav-desktop-links">
            <Link to="/" style={linkStyle(isActive('/'))}>
              <FiHome size={14} />
              <span>Trang chủ</span>
            </Link>
            <Dropdown label="Điểm danh" icon={FiCamera} items={attendanceItems}
              dark={dark} textColor={textColor} mutedColor={mutedColor} hoverBg={hoverBg} isActive={isActive} />
            {canManage && (
              <Dropdown label="Quản lý" icon={FiGrid} items={manageItems}
                dark={dark} textColor={textColor} mutedColor={mutedColor} hoverBg={hoverBg} isActive={isActive} />
            )}
          </div>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>

            {/* Dark mode toggle */}
            <button onClick={toggle} style={{
              width: 36, height: 36, border: 'none', borderRadius: 10,
              background: 'transparent', color: mutedColor, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }} title={dark ? 'Sáng' : 'Tối'}>
              {dark ? <FiSun /> : <FiMoon />}
            </button>

            {/* User badge - desktop */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="nav-user-badge">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 8px 3px 3px', borderRadius: 8,
                  background: dark ? '#374151' : '#f9fafb',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: roleBadge.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <roleBadge.icon size={10} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: textColor, lineHeight: 1.1 }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 9, color: mutedColor, fontWeight: 500, lineHeight: 1 }}>
                      {roleBadge.label}
                    </div>
                  </div>
                </div>

                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '5px 8px', border: 'none', borderRadius: 8,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  color: mutedColor, background: 'transparent',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedColor; }}>
                  <FiLogOut size={12} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(true)} style={{
              width: 36, height: 36, border: 'none', borderRadius: 10,
              background: 'transparent', color: textColor, cursor: 'pointer',
              display: 'none', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }} className="nav-mobile-hamburger">
              <FiMenu />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 200, display: 'flex',
        }}>
          <div onClick={() => setMobileOpen(false)} style={{
            flex: 1, background: 'rgba(0,0,0,0.4)',
          }} />
          <div style={{
            width: '75%', maxWidth: 320,
            background: bgColor, height: '100%',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo_face.ico" alt="FaceAttendance" style={{ width: 36, height: 36, borderRadius: 10 }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: textColor }}>FaceAttendance</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{
                width: 36, height: 36, border: 'none', borderRadius: 10,
                background: hoverBg, color: textColor, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                <FiX />
              </button>
            </div>

            {user && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12,
                background: hoverBg, marginBottom: 20,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: roleBadge.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <roleBadge.icon size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: textColor }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: mutedColor }}>{user.email} • {roleBadge.label}</div>
                </div>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} style={{
                  padding: '8px 12px', border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  color: '#ef4444', background: dark ? '#451a1a' : '#fef2f2',
                }}>
                  <FiLogOut size={14} />
                </button>
              </div>
            )}

            {/* Mobile nav links with expandable sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <Link to="/" onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  fontSize: 15, fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive('/') ? '#667eea' : textColor,
                  background: isActive('/') ? (dark ? '#2d2d5e' : '#f0f4ff') : 'transparent',
                }}>
                <FiHome size={18} />
                <span>Trang chủ</span>
              </Link>

              <MobileGroup title="Điểm danh" icon={FiCamera} items={attendanceItems}
                isOpen={mobileExpand === 'attendance'} onToggle={() => setMobileExpand(mobileExpand === 'attendance' ? null : 'attendance')}
                dark={dark} textColor={textColor} hoverBg={hoverBg} isActive={isActive} onNavigate={() => setMobileOpen(false)} />

              {canManage && (
                <MobileGroup title="Quản lý" icon={FiGrid} items={manageItems}
                  isOpen={mobileExpand === 'manage'} onToggle={() => setMobileExpand(mobileExpand === 'manage' ? null : 'manage')}
                  dark={dark} textColor={textColor} hoverBg={hoverBg} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: 10,
              background: hoverBg, marginTop: 16,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>
                {dark ? 'Chế độ tối' : 'Chế độ sáng'}
              </span>
              <button onClick={toggle} style={{
                width: 40, height: 28, border: 'none', borderRadius: 14,
                cursor: 'pointer', position: 'relative',
                background: dark ? '#667eea' : '#d1d5db',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'white', position: 'absolute', top: 3,
                  left: dark ? 17 : 2, transition: 'left 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                }}>
                  {dark ? <FiMoon /> : <FiSun />}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-user-badge { display: none !important; }
          .nav-mobile-hamburger { display: flex !important; }
          .nav-logo-text { display: inline !important; }
        }
      `}</style>
    </>
  );
};

const MobileGroup = ({ title, icon: Icon, items, isOpen, onToggle, dark, textColor, hoverBg, isActive, onNavigate }) => (
  <div>
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      fontSize: 15, fontWeight: 600, width: '100%',
      border: 'none', cursor: 'pointer', background: 'transparent',
      color: textColor,
    }}>
      <Icon size={18} />
      <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
      <FiChevronDown size={14} style={{
        transition: 'transform 0.2s',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }} />
    </button>
    {isOpen && (
      <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(item => {
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={onNavigate}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: active ? '#667eea' : textColor,
                background: active ? (dark ? '#2d2d5e' : '#f0f4ff') : 'transparent',
              }}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    )}
  </div>
);

export default Navbar;
