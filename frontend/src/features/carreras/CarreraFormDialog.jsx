import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

const schema = yup.object({
  clave: yup.string().required('La clave es obligatoria').max(20),
  nombre: yup.string().required('El nombre es obligatorio'),
  descripcion: yup.string().nullable(),
  max_creditos_semestre: yup
    .number()
    .typeError('Debe ser un número')
    .positive('Debe ser mayor a 0')
    .required('El máximo de créditos es obligatorio'),
});

const valoresIniciales = { clave: '', nombre: '', descripcion: '', max_creditos_semestre: 50 };

export default function CarreraFormDialog({ open, onClose, onSubmit, carrera }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: valoresIniciales });

  useEffect(() => {
    if (open) {
      reset(
        carrera
          ? {
              clave: carrera.clave,
              nombre: carrera.nombre,
              descripcion: carrera.descripcion ?? '',
              max_creditos_semestre: carrera.max_creditos_semestre,
            }
          : valoresIniciales,
      );
    }
  }, [open, carrera, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{carrera ? 'Editar carrera' : 'Nueva carrera'}</DialogTitle>
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
          <TextField label="Descripción" multiline minRows={2} {...register('descripcion')} />
          <TextField
            label="Máximo de créditos por semestre"
            type="number"
            {...register('max_creditos_semestre')}
            error={Boolean(errors.max_creditos_semestre)}
            helperText={errors.max_creditos_semestre?.message}
          />
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
