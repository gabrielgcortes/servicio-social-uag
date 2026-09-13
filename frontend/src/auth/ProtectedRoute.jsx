import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute() {
  const { principal, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!principal) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
