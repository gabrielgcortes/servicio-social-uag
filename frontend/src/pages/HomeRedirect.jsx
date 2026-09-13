import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function HomeRedirect() {
  const { principal } = useAuth();
  if (principal?.rol === 'ADMIN') {
    return <Navigate to="/carreras" replace />;
  }
  if (principal?.carrera_id) {
    return <Navigate to={`/carreras/${principal.carrera_id}`} replace />;
  }
  return <Navigate to="/forbidden" replace />;
}
