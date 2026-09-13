import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CarrerasPage from './pages/CarrerasPage.jsx';
import CarreraPage from './pages/CarreraPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import HomeRedirect from './pages/HomeRedirect.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'carreras', element: <CarrerasPage /> },
          { path: 'carreras/:carreraId', element: <CarreraPage /> },
          { path: 'usuarios', element: <UsuariosPage /> },
          { path: 'forbidden', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export default router;
