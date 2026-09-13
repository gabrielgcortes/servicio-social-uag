import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import RoleGate from '../auth/RoleGate.jsx';

const DRAWER_WIDTH = 260;

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { principal, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const ir = (ruta) => {
    setOpen(false);
    navigate(ruta);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Mapa Curricular
          </Typography>
          {principal && (
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
              {principal.nombre}
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: DRAWER_WIDTH }} role="presentation">
          <Toolbar />
          <List>
            <RoleGate allow={['ADMIN']}>
              <>
                <ListItemButton onClick={() => ir('/carreras')}>
                  <ListItemIcon>
                    <SchoolIcon />
                  </ListItemIcon>
                  <ListItemText primary="Carreras" />
                </ListItemButton>
                <ListItemButton onClick={() => ir('/usuarios')}>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Usuarios" />
                </ListItemButton>
              </>
            </RoleGate>
            <RoleGate allow={['USUARIO', 'DIRECTOR']}>
              <ListItemButton onClick={() => ir(`/carreras/${principal?.carrera_id}`)}>
                <ListItemIcon>
                  <SchoolIcon />
                </ListItemIcon>
                <ListItemText primary="Mi carrera" />
              </ListItemButton>
            </RoleGate>
          </List>
          <Divider />
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
