import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const destino = location.state?.from?.pathname ?? '/';
      navigate(destino, { replace: true });
    } catch {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Paper sx={{ p: 4, width: 360 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" gutterBottom>
          Mapa Curricular
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </Paper>
    </Box>
  );
}
