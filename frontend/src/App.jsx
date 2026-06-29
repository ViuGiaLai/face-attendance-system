/**
 * Copyright (c) 2026 Viu
 * Licensed under the MIT License.
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FaceModelProvider } from './context/FaceModelContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Lazy load components for better performance
const Navbar = React.lazy(() => import('./components/Navbar'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const AttendanceHistory = React.lazy(() => import('./pages/AttendanceHistory'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const ClassManagement = React.lazy(() => import('./pages/ClassManagement'));
const SubjectManagement = React.lazy(() => import('./pages/SubjectManagement'));
const ScheduleManagement = React.lazy(() => import('./pages/ScheduleManagement'));

// Loading component
const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280', fontSize: 16 }}>
    Đang tải...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const { dark } = useTheme();

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Suspense fallback={<Loading />}>
        {user && <Navbar />}
        <div className={`app-content${!user ? ' app-content-full' : ''}`}>
          <div className="app-main">
            <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/" /> : <Register />
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <AttendanceHistory />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/classes" element={
            <ProtectedRoute>
              <ClassManagement />
            </ProtectedRoute>
          } />
          <Route path="/subjects" element={
            <ProtectedRoute>
              <SubjectManagement />
            </ProtectedRoute>
          } />
          <Route path="/schedules" element={
            <ProtectedRoute>
              <ScheduleManagement />
            </ProtectedRoute>
          } />
          {/* Catch-all route */}
          <Route path="*" element={
            <Navigate to="/" replace />
          } />
            </Routes>
          </div>
          <footer className={`footer ${dark ? 'footer-dark' : ''}`}>
            <span>© 2026 Viu. All rights reserved.</span>
            <span className="footer-separator">|</span>
            <span>Built by Viu</span>
          </footer>
        </div>
      </Suspense>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FaceModelProvider>
          <AppContent />
        </FaceModelProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;