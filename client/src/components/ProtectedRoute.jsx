import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flex: 1,
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #f8fafc)',
        color: 'var(--color-text-muted, #64748b)'
      }}>
        <div 
          className="spinner" 
          style={{ 
            width: '36px', 
            height: '36px', 
            borderWidth: '3px',
            borderTopColor: 'var(--color-primary, #16a34a)', 
            marginBottom: '1rem' 
          }} 
        />
        <p style={{ fontWeight: 600, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // If a learner tries to access admin routes, redirect to learner catalog
    if (user?.role === 'learner') {
      return <Navigate to="/learner/browse" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}
