import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const RoleGuard = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return children;
};
