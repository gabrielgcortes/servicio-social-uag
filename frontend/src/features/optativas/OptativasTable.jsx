import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useAuth } from '../../auth/AuthContext.jsx';
import * as carrerasApi from '../../api/carreras.js';
import * as materiasApi from '../../api/materias.js';
import MateriaFormDialog from '../mapa/MateriaFormDialog.jsx';

export default function OptativasTable({ carreraId }) {
  const { principal } = useAuth();
  const editable = principal?.rol === 'ADMIN' || principal?.rol === 'DIRECTOR';
  const queryClient = useQueryClient();

  const { data: optativas = [], isLoading } = useQuery({
    queryKey: ['optativas', carreraId],
    queryFn: () => carrerasApi.listOptativas(carreraId),
    enabled: Boolean(carreraId),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['optativas', carreraId] });

  const crear = useMutation({
    mutationFn: (payload) => carrerasApi.createOptativa(carreraId, payload),
    onSuccess: invalidar,
  });
  const actualizar = useMutation({
    mutationFn: ({ id, payload }) => materiasApi.updateMateria(id, payload),
    onSuccess: invalidar,
  });
  const eliminar = useMutation({
    mutationFn: (id) => materiasApi.deleteMateria(id),
    onSuccess: invalidar,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [materiaEditando, setMateriaEditando] = useState(null);

  const abrirCrear = () => {
    setMateriaEditando(null);
    setDialogOpen(true);
  };
  const abrirEditar = (materia) => {
    setMateriaEditando(materia);
    setDialogOpen(true);
  };

  const guardar = async (values) => {
    if (materiaEditando) {
      await actualizar.mutateAsync({ id: materiaEditando.id, payload: values });
    } else {
      await crear.mutateAsync(values);
    }
  };

  if (isLoading) return <Typography>Cargando…</Typography>;

  return (
    <Box>
      {editable && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}>
            Nueva optativa
          </Button>
        </Box>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Clave</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Horas docente</TableCell>
              <TableCell>Horas independientes</TableCell>
              <TableCell>Créditos</TableCell>
              <TableCell>Modalidad</TableCell>
              <TableCell>Seriación</TableCell>
              {editable && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {optativas.map((materia) => (
              <TableRow key={materia.id}>
                <TableCell>{materia.clave}</TableCell>
                <TableCell>{materia.nombre}</TableCell>
                <TableCell>{materia.horas_docente}</TableCell>
                <TableCell>{materia.horas_independientes}</TableCell>
                <TableCell>{materia.creditos}</TableCell>
                <TableCell>{materia.modalidad ?? '—'}</TableCell>
                <TableCell>
                  {optativas.find((m) => m.id === materia.seriacion_materia_id)?.clave ?? '—'}
                </TableCell>
                {editable && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => abrirEditar(materia)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => eliminar.mutate(materia.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <MateriaFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={guardar}
        materia={materiaEditando}
        tipo="OPTATIVA"
        materiasParaSeriacion={optativas}
      />
    </Box>
  );
}
