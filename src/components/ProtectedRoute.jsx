// =============================================================================
// components/ProtectedRoute.jsx — Auth gate for routes (Phase 2)
// -----------------------------------------------------------------------------
// While auth is still resolving we render a quiet loader (prevents a flash of
// the login screen for already-signed-in users). Once resolved, unauthenticated
// visitors are redirected to /auth; authenticated ones see the children.
// =============================================================================

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 font-serif text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
