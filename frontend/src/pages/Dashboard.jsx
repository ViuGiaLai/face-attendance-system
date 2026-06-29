import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { attendanceAPI, classesAPI } from '../services/api';
import {
  FiUser, FiCalendar, FiCheckCircle, FiXCircle,
  FiTrendingUp, FiClock, FiRefreshCw, FiCamera,
  FiBarChart2, FiUsers, FiArrowRight, FiZap,
} from 'react-icons/fi';

const DAI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const MAX_BAR = 20;

const Dashboard = () => {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const hoverBg = dark ? '#374151' : '#f9fafb';

  const fetchDashboardData = useCallback(async () => {
    try {
      const params = user.role === 'student' ? { user_id: user.id } : {};
      const [todayResponse, statsResponse, weeklyResponse] = await Promise.all([
        attendanceAPI.today({}),
        attendanceAPI.stats({ days: 30, ...params }),
        attendanceAPI.weekly(params),
      ]);
      setTodayAttendance(todayResponse.data.attendance);
      setStats(statsResponse.data);

      if (user.role !== 'student') {
        const [classesRes, scheduleRes] = await Promise.all([
          classesAPI.getAll(),
          attendanceAPI.schedule(),
        ]);
        setClasses(classesRes.data.classes);
        setSchedules(scheduleRes.data.schedules || []);
      }

      const weeklyData = weeklyResponse.data.weekly || [];
      const maxCount = Math.max(1, ...weeklyData.map(w => w.count));
      setWeekly({ data: weeklyData, maxCount });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.role, user.id]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const roleLabels = {
    student: 'Học sinh / Sinh viên',
    teacher: 'Giáo viên',
    admin: 'Quản trị viên'
  };

  const statCard = (icon, value, label, color) => (
    <div style={{
      background: bgCard, borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: textColor, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: mutedColor, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ color: mutedColor }}>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Tổng quan</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 2 }}>Xin chào, {user.name} · {roleLabels[user.role]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/attendance" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${borderColor}`, background: bgCard,
            color: textColor, fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>
            <FiZap size={13} /> Điểm danh
          </Link>
          <button onClick={fetchDashboardData} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${borderColor}`, background: 'transparent',
            color: mutedColor, fontSize: 13, cursor: 'pointer',
          }}>
            <FiRefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {statCard(<FiCheckCircle />, stats.stats.present_days, 'Số ngày có mặt', '#16a34a')}
          {statCard(<FiXCircle />, stats.stats.absent_days, 'Số ngày vắng', '#dc2626')}
          {statCard(<FiTrendingUp />, `${stats.stats.attendance_rate}%`, 'Tỷ lệ điểm danh', '#6366f1')}
          {statCard(<FiClock />, stats.stats.total_days || '—', 'Tổng số ngày học', '#f59e0b')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Weekly Chart */}
        {weekly && (
          <div style={{ background: bgCard, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: textColor, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiBarChart2 size={14} /> Điểm danh 7 ngày qua
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, gap: 4 }}>
              {weekly.data.map((day, i) => {
                const height = (day.count / weekly.maxCount) * 100;
                const isToday = i === weekly.data.length - 1;
                return (
                  <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textColor }}>{day.count}</span>
                    <div style={{
                      width: '100%', maxWidth: 40, height: `${Math.max(4, height)}%`,
                      borderRadius: '6px 6px 0 0',
                      background: isToday ? 'linear-gradient(180deg, #667eea, #764ba2)' : (dark ? '#4b5563' : '#d1d5db'),
                      transition: 'height 0.3s',
                      minHeight: 4,
                    }} />
                    <span style={{ fontSize: 10, color: mutedColor, fontWeight: isToday ? 700 : 400 }}>{day.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Class Attendance Breakdown */}
        {classes.length > 0 && (
          <div style={{ background: bgCard, borderRadius: 12, padding: 20, border: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: textColor, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiUsers size={14} /> Lớp học
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {classes.slice(0, 5).map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                }}>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: textColor }}>
                    {c.name}
                  </div>
                  <div style={{
                    width: 80, height: 6, borderRadius: 3,
                    background: dark ? '#374151' : '#e5e7eb', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${Math.random() * 60 + 30}%`,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: mutedColor, minWidth: 30, textAlign: 'right' }}>
                    {c.code}
                  </span>
                </div>
              ))}
              {classes.length > 5 && (
                <Link to="/classes" style={{
                  fontSize: 12, color: '#667eea', fontWeight: 600, textAlign: 'center',
                  textDecoration: 'none', padding: 6,
                }}>
                  Xem tất cả ({classes.length} lớp) <FiArrowRight size={11} style={{ verticalAlign: 'middle' }} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      {schedules.length > 0 && (
        <div style={{ background: bgCard, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiCalendar size={14} /> Lịch học hôm nay
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedules.map((sch) => {
              const pct = sch.student_count > 0 ? (sch.attended_today / sch.student_count) * 100 : 0;
              return (
                <div key={sch.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, background: dark ? '#111827' : '#f9fafb',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {sch.start_time?.slice(0, 5)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{sch.subject_name}</div>
                    <div style={{ fontSize: 12, color: mutedColor }}>
                      {sch.class_name} · {sch.room || 'Chưa có phòng'} · {sch.start_time?.slice(0, 5)}-{sch.end_time?.slice(0, 5)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                    }}>
                      {sch.attended_today}/{sch.student_count}
                    </div>
                    <div style={{
                      width: 60, height: 4, borderRadius: 2,
                      background: dark ? '#374151' : '#e5e7eb', marginTop: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 2,
                        background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{
        background: bgCard, borderRadius: 12, padding: 20,
        marginBottom: 20, border: `1px solid ${borderColor}`,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiZap size={14} /> Thao tác nhanh
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { to: '/attendance', label: 'Điểm danh', icon: <FiCamera size={15} />, color: '#6366f1', desc: 'Nhận diện khuôn mặt' },
            ...(user.role !== 'student'
              ? [{ to: '/history', label: 'Lịch sử', icon: <FiClock size={15} />, color: '#f59e0b', desc: 'Tra cứu điểm danh' },
                 { to: '/classes', label: 'Lớp học', icon: <FiUsers size={15} />, color: '#16a34a', desc: 'Quản lý lớp' }]
              : []),
          ].map((action, i) => (
            <Link key={i} to={action.to} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 10,
              background: hoverBg, textDecoration: 'none',
              flex: '1 0 180px', minWidth: 180,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${action.color}20`, color: action.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{action.label}</div>
                <div style={{ fontSize: 11, color: mutedColor }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Attendance Records */}
      {user.role !== 'student' && (
        <div style={{ background: bgCard, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${borderColor}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCamera size={14} /> Điểm danh hôm nay
            </h3>
            <span style={{ fontSize: 12, color: mutedColor, fontWeight: 500 }}>{todayAttendance.length} bản ghi</span>
          </div>
          {todayAttendance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: mutedColor }}>
              <FiCamera size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p>Chưa có điểm danh nào hôm nay</p>
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, background: bgCard }}>Tên</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Lớp</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Giờ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Trạng thái</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Độ tin cậy</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((record) => (
                    <tr key={record.id} style={{ transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#111827' : '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{record.user_name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>{record.class_name || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{record.time ? new Date('2000-01-01T' + record.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: dark ? '#14532d' : '#f0fdf4', color: dark ? '#bbf7d0' : '#16a34a' }}>
                          <FiCheckCircle size={11} /> Có mặt
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>{record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>{record.time ? new Date('2000-01-01T' + record.time).toLocaleTimeString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Dashboard;