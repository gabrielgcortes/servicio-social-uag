import { useAuth } from './AuthContext.jsx';

// Solo mejora de UX: el backend siempre revalida los permisos reales (§12 del plan).
export default function RoleGate({ allow, children }) {
  const { principal } = useAuth();
  if (!principal || !allow.includes(principal.rol)) {
    return null;
  }
  return children;
}
