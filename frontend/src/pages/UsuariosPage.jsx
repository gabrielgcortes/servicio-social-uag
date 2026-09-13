import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import * as carrerasApi from '../api/carreras.js';
import * as usuariosApi from '../api/usuarios.js';

const ROLES = ['USUARIO', 'DIRECTOR', 'ADMIN'];

const schema = yup.object({
  nombre: yup.string().required('El nombre es obligatorio'),
  email: yup.string().email('Email inválido').required('El email es obligatorio'),
  password: yup.string().min(10, 'Mínimo 10 caracteres').required('La contraseña es obligatoria'),
  rol: yup.string().oneOf(ROLES).required(),
  carrera_id: yup
    .number()
    .nullable()
    .transform((value, original) => (original === '' ? null : value))
    .when('rol', {
      is: (rol) => rol !== 'ADMIN',
      then: (s) => s.required('USUARIO y DIRECTOR requieren una carrera'),
    }),
});

function UsuarioFormDialog({ open, onClose, onSubmit, carreras }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { nombre: '', email: '', password: '', rol: 'USUARIO', carrera_id: '' },
  });
  const rol = watch('rol');

  const submit = handleSubmit(async (values) => {
    await onSubmit({ ...values, carrera_id: values.carrera_id || null });
    reset();
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo usuario</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            {...register('nombre')}
            error={Boolean(errors.nombre)}
            helperText={errors.nombre?.message}
          />
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
          <TextField
            label="Contraseña"
            type="password"
            {...register('password')}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <TextField label="Rol" select defaultValue="USUARIO" {...register('rol')}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          {rol !== 'ADMIN' && (
            <TextField
              label="Carrera"
              select
              defaultValue=""
              {...register('carrera_id')}
              error={Boolean(errors.carrera_id)}
              helperText={errors.carrera_id?.message}
            >
              {carreras.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.clave} - {c.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={isSubmitting}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.listUsuarios(),
  });
  const { data: carreras = [] } = useQuery({
    queryKey: ['carreras'],
    queryFn: carrerasApi.listCarreras,
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] });
  const crear = useMutation({ mutationFn: usuariosApi.createUsuario, onSuccess: invalidar });
  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => usuariosApi.updateUsuario(id, payload),
    onSuccess: invalidar,
  });
  const desactivar = useMutation({
    mutationFn: usuariosApi.deactivateUsuario,
    onSuccess: invalidar,
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  const cambiarRol = (usuario, rol) => actualizar.mutate({ id: usuario.id, payload: { rol } });

  if (isLoading) return <Typography>Cargando…</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Usuarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nuevo usuario
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Carrera</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.nombre}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={usuario.rol}
                    onChange={(e) => cambiarRol(usuario, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>{carreras.find((c) => c.id === usuario.carrera_id)?.clave ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={usuario.activo ? 'Activo' : 'Inactivo'}
                    color={usuario.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => desactivar.mutate(usuario.id)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <UsuarioFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={(values) => crear.mutateAsync(values)}
        carreras={carreras}
      />
    </Box>
  );
}
