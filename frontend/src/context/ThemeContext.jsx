import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ThemeContext = createContext(null);

const DARK_CSS = `
.app-content { background: #111827 !important; }
.app-content h1 { color: #f9fafb !important; }
.app-content p { color: #d1d5db !important; }
.page-header-main h1 { color: #f9fafb !important; }
.page-header-main p { color: #9ca3af !important; }
.stat-card { background: #1f2937 !important; border-color: #374151 !important; }
.stat-info h3 { color: #f9fafb !important; }
.stat-info p { color: #9ca3af !important; }
.content-card { background: #1f2937 !important; border-color: #374151 !important; }
.content-card a { color: #a5b4fc !important; }
.content-card-header { border-bottom-color: #374151 !important; }
.content-card-header h3 { color: #e5e7eb !important; }
.data-table thead th { background: #111827 !important; color: #9ca3af !important; border-bottom-color: #374151 !important; }
.data-table tbody td { color: #d1d5db !important; border-bottom-color: #1f2937 !important; }
.data-table tbody tr:hover { background: #111827 !important; }
.data-table .cell-name { color: #f9fafb !important; }
.data-table .cell-email { color: #9ca3af !important; }
.filter-input { background: #374151 !important; border-color: #4b5563 !important; color: #f9fafb !important; }
.filter-input:focus { background: #374151 !important; border-color: #818cf8 !important; }
.mode-tabs-modern { background: #374151 !important; }
.mode-tab { color: #9ca3af !important; }
.mode-tab.active { background: #1f2937 !important; color: #f9fafb !important; }
.mode-tab:hover:not(.active) { color: #d1d5db !important; }
.btn-modern.outline { background: #374151 !important; color: #e5e7eb !important; border-color: #4b5563 !important; }
.btn-modern.outline:hover { background: #4b5563 !important; }
.alert-modern.error { background: #451a1a !important; border-color: #7f1d1d !important; color: #fca5a5 !important; }
.alert-modern.success { background: #14532d !important; border-color: #166534 !important; color: #bbf7d0 !important; }
.action-buttons, .image-gallery, .preview-section { background: #1f2937 !important; border-color: #374151 !important; color: #f9fafb !important; }
.upload-label { background: #374151 !important; border-color: #4b5563 !important; color: #d1d5db !important; }
.upload-label:hover { background: #4b5563 !important; border-color: #3b82f6 !important; color: #3b82f6 !important; }
.gallery-image { border-color: #4b5563 !important; background: #374151 !important; }
.preview-image { border-color: #4b5563 !important; background: #374151 !important; }
.user-form, .tabs-container { background: #1f2937 !important; border-color: #374151 !important; }
.form-label { color: #f9fafb !important; }
.form-input { background: #374151 !important; border-color: #4b5563 !important; color: #f9fafb !important; }
.form-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.2) !important; }
.user-info-card { background: linear-gradient(135deg, #1e3a8a, #1e40af) !important; border-color: #3730a3 !important; }
.user-info-text, .user-instruction { color: #dbeafe !important; }
.step-instruction { background: linear-gradient(135deg, #78350f, #92400e) !important; border-color: #d97706 !important; }
.step-title { color: #fef3c7 !important; }
.step-description { color: #fbbf24 !important; }
.guide-section { background: rgba(55,65,81,0.7) !important; }
.guide-item { color: #d1d5db !important; }
.auth-container { background: #1f2937 !important; }
.auth-form-header h2 { color: #f9fafb !important; }
.auth-form-header p { color: #9ca3af !important; }
.auth-input-label { color: #d1d5db !important; }
.auth-input { background: #374151 !important; border-color: #4b5563 !important; color: #f9fafb !important; }
.auth-input:focus { background: #374151 !important; border-color: #818cf8 !important; }
.auth-select { background: #374151 !important; border-color: #4b5563 !important; color: #f9fafb !important; }
.auth-select:focus { background: #374151 !important; border-color: #818cf8 !important; }
.auth-message.error { background: #451a1a !important; border-color: #7f1d1d !important; color: #fca5a5 !important; }
.auth-message.success { background: #14532d !important; border-color: #166534 !important; color: #bbf7d0 !important; }
.auth-form-footer p { color: #9ca3af !important; }
.auth-form-footer a { color: #818cf8 !important; }
.auth-form-footer a:hover { color: #a5b4fc !important; }
.auth-security-badge { color: #6b7280 !important; }
.auth-form-footer { border-top-color: #374151 !important; }
.auth-field-error { color: #fca5a5 !important; }
.auth-input-toggle { color: #9ca3af !important; }
`;

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const styleRef = useRef(null);

  useEffect(() => {
    if (dark) {
      if (!styleRef.current) {
        styleRef.current = document.createElement('style');
        styleRef.current.id = 'theme-dark-override';
        styleRef.current.textContent = DARK_CSS;
        document.head.appendChild(styleRef.current);
      }
    } else {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = dark ? '#111827' : '#f0f2f5';
    document.body.style.background = dark ? '#111827' : '#f0f2f5';
    document.body.style.color = dark ? '#f3f4f6' : '#1f2937';
    document.body.style.minHeight = '100vh';
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
