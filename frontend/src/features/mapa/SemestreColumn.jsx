import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import ElementoCard from './ElementoCard.jsx';

export default function SemestreColumn({
  semestre,
  maxCreditos,
  editable,
  onAgregar,
  onEditarEspacio,
  onEliminarElemento,
}) {
  const { setNodeRef } = useDroppable({
    id: `semestre-${semestre.id}`,
    data: { semestreId: semestre.id },
  });
  const excedido = semestre.totales.total_creditos > maxCreditos;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 260,
        flexShrink: 0,
        p: 1.5,
        backgroundColor: excedido ? 'error.light' : 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Semestre {semestre.numero}</Typography>
        <Chip
          label={`${semestre.totales.total_creditos} cr.`}
          color={excedido ? 'error' : 'default'}
          size="small"
        />
      </Stack>
      <Box ref={setNodeRef} sx={{ minHeight: 80 }}>
        <SortableContext
          items={semestre.elementos.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {semestre.elementos.map((elemento) => (
            <ElementoCard
              key={elemento.id}
              elemento={elemento}
              editable={editable}
              onEditar={onEditarEspacio}
              onEliminar={onEliminarElemento}
            />
          ))}
        </SortableContext>
      </Box>
      {editable && (
        <IconButton size="small" onClick={() => onAgregar(semestre)}>
          <AddIcon fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
}
