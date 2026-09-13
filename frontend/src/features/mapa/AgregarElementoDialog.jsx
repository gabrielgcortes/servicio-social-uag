import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

export default function AgregarElementoDialog({
  open,
  onClose,
  materiasDisponibles,
  onAgregarMateria,
  onAbrirEspacioOptativo,
  onCrearNuevaMateria,
}) {
  const [modo, setModo] = useState('materia');
  const [materiaId, setMateriaId] = useState('');

  const cerrar = () => {
    setModo('materia');
    setMateriaId('');
    onClose();
  };

  const handleContinuar = async () => {
    if (modo === 'materia') {
      if (!materiaId) return;
      await onAgregarMateria(Number(materiaId));
      cerrar();
    } else if (modo === 'nueva') {
      cerrar();
      onCrearNuevaMateria();
    } else {
      cerrar();
      onAbrirEspacioOptativo();
    }
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="xs">
      <DialogTitle>Agregar al semestre</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            value={modo}
            exclusive
            onChange={(_e, v) => v && setModo(v)}
            size="small"
            fullWidth
          >
            <ToggleButton value="materia">Materia existente</ToggleButton>
            <ToggleButton value="nueva">Materia nueva</ToggleButton>
            <ToggleButton value="espacio">Espacio optativo</ToggleButton>
          </ToggleButtonGroup>
          {modo === 'materia' && (
            <TextField
              select
              label="Materia"
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
            >
              {materiasDisponibles.length === 0 && (
                <MenuItem value="" disabled>
                  No hay materias obligatorias disponibles
                </MenuItem>
              )}
              {materiasDisponibles.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.clave} - {m.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleContinuar}
          disabled={modo === 'materia' && !materiaId}
        >
          {modo === 'materia' ? 'Agregar' : 'Continuar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
