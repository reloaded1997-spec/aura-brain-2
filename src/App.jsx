// =============================================================================
// App.jsx — Routing (Phase 2)
// -----------------------------------------------------------------------------
//   /        -> DashboardPage, wrapped in <ProtectedRoute> (auth required)
//   /auth    -> AuthPage (login / gated signup). If already signed in, bounce
//               to the dashboard so the login screen never shows to a member.
//   *        -> redirect unknown paths home.
//
// BrowserRouter + AuthProvider are mounted one level up in main.jsx.
// =============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import JournalPage from './pages/JournalPage';
import NetworkPage from './pages/NetworkPage';

// Keep authenticated users out of the auth screen.
function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 font-serif text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <AuthPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <JournalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/network"
        element={
          <ProtectedRoute>
            <NetworkPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
