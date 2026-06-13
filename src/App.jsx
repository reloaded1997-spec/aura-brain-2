// =============================================================================
// App.jsx — Routing
// -----------------------------------------------------------------------------
//   /        -> DashboardPage (auth required)
//   /auth    -> AuthPage (login / gated signup)
//   /circle  -> NetworkPage (relationship circles — was /network)
//   /rhythms -> RhythmsPage (habits & tasks — was /acquaintances)
//   /network        -> redirect to /circle  (PWA bookmark compatibility)
//   /acquaintances  -> redirect to /rhythms (PWA bookmark compatibility)
//   *        -> redirect unknown paths home.
//
// BrowserRouter + AuthProvider are mounted one level up in main.jsx.
// =============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileCompletionModal from './components/ProfileCompletionModal';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import JournalPage from './pages/JournalPage';
import NetworkPage from './pages/NetworkPage';
import SearchPage from './pages/SearchPage';
import RhythmsPage from './pages/AcquaintancesPage';
import AcquaintanceDetailPage from './pages/AcquaintanceDetailPage';
import { isProfileComplete } from './utils/identity';

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

// Prompt signed-in members whose account doc is missing name/birthday.
function ProfileCompletionGate() {
  const { user, profileLoading, userDoc } = useAuth();
  if (!user || profileLoading) return null;
  if (isProfileComplete(userDoc)) return null;
  return <ProfileCompletionModal />;
}

export default function App() {
  return (
    <>
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

      {/* Circle tab — relationship circles (was /network) */}
      <Route path="/network" element={<Navigate to="/circle" replace />} />
      <Route
        path="/circle"
        element={
          <ProtectedRoute>
            <NetworkPage />
          </ProtectedRoute>
        }
      />

      {/* Rhythms & Tasks tab — habits (was /acquaintances) */}
      <Route path="/acquaintances" element={<Navigate to="/rhythms" replace />} />
      <Route
        path="/rhythms"
        element={
          <ProtectedRoute>
            <RhythmsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/acquaintance/:id"
        element={
          <ProtectedRoute>
            <AcquaintanceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      <ProfileCompletionGate />
    </>
  );
}
