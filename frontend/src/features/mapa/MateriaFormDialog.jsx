import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { calcularCreditos, creditosSonEnteros } from '../../utils/creditos.js';

const schema = yup.object({
  clave: yup.string().required('La clave es obligatoria').max(20),
  nombre: yup.string().required('El nombre es obligatorio'),
  horas_docente: yup.number().typeError('Debe ser un número').min(0).required(),
  horas_independientes: yup.number().typeError('Debe ser un número').min(0).required(),
  instalaciones: yup.string().nullable(),
  modalidad: yup.string().nullable(),
  seriacion_materia_id: yup.mixed().nullable(),
});

const valoresIniciales = {
  clave: '',
  nombre: '',
  horas_docente: 0,
  horas_independientes: 0,
  instalaciones: '',
  modalidad: '',
  seriacion_materia_id: '',
};

// Reutilizado tanto para el catálogo de obligatorias (desde el mapa) como
// para el catálogo de optativas (features/optativas/OptativasTable.jsx).
export default function MateriaFormDialog({
  open,
  onClose,
  onSubmit,
  materia,
  tipo,
  materiasParaSeriacion = [],
}) {
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
        materia
          ? {
              clave: materia.clave,
              nombre: materia.nombre,
              horas_docente: materia.horas_docente,
              horas_independientes: materia.horas_independientes,
              instalaciones: materia.instalaciones ?? '',
              modalidad: materia.modalidad ?? '',
              seriacion_materia_id: materia.seriacion_materia_id ?? '',
            }
          : valoresIniciales,
      );
    }
  }, [open, materia, reset]);

  const horasDocente = watch('horas_docente');
  const horasIndependientes = watch('horas_independientes');
  const creditosPreview = useMemo(
    () => calcularCreditos(horasDocente, horasIndependientes),
    [horasDocente, horasIndependientes],
  );
  const creditosNoEnteros = !creditosSonEnteros(horasDocente, horasIndependientes);
  const opcionesSeriacion = materiasParaSeriacion.filter((m) => m.id !== materia?.id);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      ...values,
      seriacion_materia_id: values.seriacion_materia_id || null,
      tipo,
    });
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{materia ? 'Editar materia' : 'Nueva materia'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Clave"
            {...register('clave')}
            error={Boolean(errors.clave)}
            helperText={errors.clave?.message}
          />
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
          <Typography variant="body2" color={creditosNoEnteros ? 'warning.main' : 'text.secondary'}>
            Créditos calculados: {creditosPreview}
            {creditosNoEnteros && ' (no es un valor entero)'}
          </Typography>
          <TextField label="Instalaciones" {...register('instalaciones')} />
          <TextField label="Modalidad" {...register('modalidad')} />
          <TextField
            label="Seriación (prerrequisito)"
            select
            defaultValue=""
            {...register('seriacion_materia_id')}
          >
            <MenuItem value="">Sin seriación</MenuItem>
            {opcionesSeriacion.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.clave} - {m.nombre}
              </MenuItem>
            ))}
          </TextField>
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
