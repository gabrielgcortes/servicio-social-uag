import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { calcularCreditos } from '../../utils/creditos.js';

const schema = yup.object({
  nombre: yup.string().required('El nombre es obligatorio'),
  horas_docente: yup.number().typeError('Debe ser un número').min(0).required(),
  horas_independientes: yup.number().typeError('Debe ser un número').min(0).required(),
});

const valoresIniciales = { nombre: '', horas_docente: 0, horas_independientes: 0 };

export default function EspacioOptativoDialog({ open, onClose, onSubmit, elemento }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: valoresIniciales });

  useEffect(() => {
    if (open) {
      reset(
        elemento
          ? {
              nombre: elemento.nombre,
              horas_docente: elemento.horas_docente,
              horas_independientes: elemento.horas_independientes,
            }
          : valoresIniciales,
      );
    }
  }, [open, elemento, reset]);

  const horasDocente = watch('horas_docente');
  const horasIndependientes = watch('horas_independientes');
  const creditosPreview = useMemo(
    () => calcularCreditos(horasDocente, horasIndependientes),
    [horasDocente, horasIndependientes],
  );

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{elemento ? 'Editar espacio optativo' : 'Nuevo espacio optativo'}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Un espacio optativo representa un requisito del mapa (p. ej. &quot;Optativa de
          formación profesional 3&quot;), no una materia concreta del catálogo.
        </Alert>
        <Stack spacing={2}>
          <TextField
            label="Nombre"
            {...register('nombre')}
            error={Boolean(errors.nombre)}
            helperText={errors.nombre?.message}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Horas con docente"
              type="number"
              fullWidth
              {...register('horas_docente')}
              error={Boolean(errors.horas_docente)}
              helperText={errors.horas_docente?.message}
            />
            <TextField
              label="Horas independientes"
              type="number"
              fullWidth
              {...register('horas_independientes')}
              error={Boolean(errors.horas_independientes)}
              helperText={errors.horas_independientes?.message}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Créditos calculados: {creditosPreview}
          </Typography>
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
