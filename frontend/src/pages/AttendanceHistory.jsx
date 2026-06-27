import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { attendanceAPI, usersAPI, classesAPI } from '../services/api';
import {
  FiFilter, FiDownload, FiSearch, FiCheckCircle, FiXCircle,
  FiUser, FiCalendar, FiRefreshCw, FiBookOpen
} from 'react-icons/fi';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const bgCard = dark ? '#1f2937' : 'white';
  const textColor = dark ? '#f3f4f6' : '#1f2937';
  const mutedColor = dark ? '#9ca3af' : '#6b7280';
  const borderColor = dark ? '#374151' : '#e5e7eb';
  const inputBg = dark ? '#374151' : '#f9fafb';

  useEffect(() => {
    const init = async () => {
      if (user.role === 'admin' || user.role === 'teacher') {
        await Promise.all([fetchUsers(), fetchClasses()]);
      }
      await fetchAttendance();
      setInitialLoading(false);
    };
    init();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ active_only: true });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedUser) params.user_id = selectedUser;
      if (selectedClass) params.class_id = selectedClass;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await attendanceAPI.history(params);
      setAttendance(response.data.attendance);
      setFetchError('');
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setFetchError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchAttendance();
  };

  const exportToCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Tên', 'Email', 'Mã số', 'Lớp', 'Ngày', 'Thời gian', 'Trạng thái', 'Độ tin cậy'];
    const csvData = attendance.map(record => {
      const date = new Date(record.date + 'T00:00:00').toLocaleDateString('vi-VN');
      const time = record.time ? new Date('2000-01-01T' + record.time).toLocaleTimeString('vi-VN') : '';
      return [
        record.user_name, '', '', record.class_name || '',
        date, time,
        record.status === 'present' ? 'Có mặt' : 'Vắng',
        record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'
      ];
    });
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const BOM = '\uFEFF';
    let html = '<table><thead><tr>';
    html += '<th>Tên</th><th>Ngày</th><th>Thời gian</th><th>Lớp</th><th>Trạng thái</th><th>Độ tin cậy</th>';
    html += '</tr></thead><tbody>';
    attendance.forEach(record => {
      const date = new Date(record.date + 'T00:00:00').toLocaleDateString('vi-VN');
      const time = record.time ? new Date('2000-01-01T' + record.time).toLocaleTimeString('vi-VN') : '';
      html += '<tr>';
      html += `<td>${record.user_name}</td>`;
      html += `<td>${date}</td>`;
      html += `<td>${time}</td>`;
      html += `<td>${record.class_name || ''}</td>`;
      html += `<td>${record.status === 'present' ? 'Có mặt' : 'Vắng'}</td>`;
      html += `<td>${record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    const blob = new Blob([BOM + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_history_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
    background: inputBg, color: textColor, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: 0 }}>Lịch sử điểm danh</h1>
          <p style={{ color: mutedColor, fontSize: 14, marginTop: 2 }}>Tra cứu và xuất báo cáo điểm danh</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportToCSV} disabled={attendance.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 12, fontWeight: 600, cursor: attendance.length === 0 ? 'not-allowed' : 'pointer', opacity: attendance.length === 0 ? 0.5 : 1 }}>
            <FiDownload size={13} /> CSV
          </button>
          <button onClick={exportToExcel} disabled={attendance.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: 12, fontWeight: 600, cursor: attendance.length === 0 ? 'not-allowed' : 'pointer', opacity: attendance.length === 0 ? 0.5 : 1 }}>
            <FiDownload size={13} /> Excel
          </button>
          <button onClick={() => { attendanceAPI.clearCache(); fetchAttendance(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontSize: 12, cursor: 'pointer' }}>
            <FiRefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      <div style={{ background: bgCard, borderRadius: 12, padding: 20, marginBottom: 20, border: `1px solid ${borderColor}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiFilter size={14} /> Bộ lọc
        </h3>
        <form onSubmit={handleFilter}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: mutedColor, marginBottom: 4 }}>Người dùng</label>
                  <select style={inputStyle} value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                    <option value="">Tất cả</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: mutedColor, marginBottom: 4 }}>Lớp</label>
                  <select style={inputStyle} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    <option value="">Tất cả lớp</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </>
            )}
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: mutedColor, marginBottom: 4 }}>Từ ngày</label>
              <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: mutedColor, marginBottom: 4 }}>Đến ngày</label>
              <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
              {loading ? <><FiRefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...</> : <><FiSearch size={13} /> Tra cứu</>}
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: bgCard, borderRadius: 12, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiCalendar size={14} /> Kết quả
          </h3>
          <span style={{ fontSize: 12, color: mutedColor, fontWeight: 500 }}>{attendance.length} bản ghi</span>
        </div>
        {fetchError && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#dc2626', fontSize: 13 }}>{fetchError}</div>
        )}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: mutedColor }}>
            <FiRefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <p>Đang tải...</p>
          </div>
        )}
        {!loading && initialLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: mutedColor }}>Đang tải...</div>
        ) : !loading && attendance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: mutedColor }}>
            <FiCalendar size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p>Không có dữ liệu điểm danh</p>
          </div>
        ) : !loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Tên</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Lớp</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Ngày</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Thời gian</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Trạng thái</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>Độ tin cậy</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? '#111827' : '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{record.user_name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>{record.class_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{record.time ? new Date('2000-01-01T' + record.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: record.status === 'present' ? (dark ? '#14532d' : '#f0fdf4') : (dark ? '#451a1a' : '#fef2f2'), color: record.status === 'present' ? (dark ? '#bbf7d0' : '#16a34a') : (dark ? '#fca5a5' : '#dc2626') }}>
                        {record.status === 'present' ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
                        {record.status === 'present' ? 'Có mặt' : 'Vắng'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>{record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
