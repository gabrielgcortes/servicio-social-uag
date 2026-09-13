import { createTheme } from '@mui/material/styles';

// Tema base; se puede ajustar con la identidad visual de la universidad más adelante.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0' },
    secondary: { main: '#ef6c00' },
  },
  shape: { borderRadius: 8 },
});

export default theme;
