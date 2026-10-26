import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { MentorDashboardPage } from './pages/MentorDashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Navigate to="/dashboard" replace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <MentorDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AlertsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <AppLayout>
                <GroupListPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <GroupDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
