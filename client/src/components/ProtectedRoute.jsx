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
        minHeight: '70vh',
        color: 'var(--color-text-muted)'
      }}>
        <div 
          className="spinner" 
          style={{ 
            width: '32px', 
            height: '32px', 
            borderTopColor: 'var(--color-primary)', 
            marginBottom: '1rem' 
          }} 
        />
        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Verifying authentication...</p>
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
