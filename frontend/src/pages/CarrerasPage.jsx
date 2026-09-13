import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Chip,
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
import CarreraFormDialog from '../features/carreras/CarreraFormDialog.jsx';
import {
  useCarreras,
  useCreateCarrera,
  useDeactivateCarrera,
  useUpdateCarrera,
} from '../hooks/useCarreras.js';

export default function CarrerasPage() {
  const { data: carreras = [], isLoading } = useCarreras();
  const createCarrera = useCreateCarrera();
  const updateCarrera = useUpdateCarrera();
  const deactivateCarrera = useDeactivateCarrera();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carreraEditando, setCarreraEditando] = useState(null);
  const navigate = useNavigate();

  const abrirCrear = () => {
    setCarreraEditando(null);
    setDialogOpen(true);
  };

  const abrirEditar = (carrera) => {
    setCarreraEditando(carrera);
    setDialogOpen(true);
  };

  const guardar = async (values) => {
    if (carreraEditando) {
      await updateCarrera.mutateAsync({ id: carreraEditando.id, payload: values });
    } else {
      await createCarrera.mutateAsync(values);
    }
  };

  if (isLoading) return <Typography>Cargando…</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Carreras</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}>
          Nueva carrera
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Clave</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Máx. créditos/semestre</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carreras.map((carrera) => (
              <TableRow key={carrera.id} hover>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/carreras/${carrera.id}`)}
                >
                  {carrera.clave}
                </TableCell>
                <TableCell
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/carreras/${carrera.id}`)}
                >
                  {carrera.nombre}
                </TableCell>
                <TableCell>{carrera.max_creditos_semestre}</TableCell>
                <TableCell>
                  <Chip
                    label={carrera.activa ? 'Activa' : 'Inactiva'}
                    color={carrera.activa ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => abrirEditar(carrera)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => deactivateCarrera.mutate(carrera.id)}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CarreraFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={guardar}
        carrera={carreraEditando}
      />
    </Box>
  );
}
