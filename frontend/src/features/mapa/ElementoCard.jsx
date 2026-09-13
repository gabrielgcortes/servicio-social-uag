import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Card, CardContent, IconButton, Stack, Typography } from '@mui/material';

export default function ElementoCard({ elemento, editable, onEditar, onEliminar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: elemento.id,
    disabled: !editable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const esEspacioOptativo = elemento.tipo === 'ESPACIO_OPTATIVO';
  const nombre = esEspacioOptativo ? elemento.nombre : elemento.materia?.nombre;
  const clave = esEspacioOptativo ? null : elemento.materia?.clave;
  const creditos = esEspacioOptativo ? elemento.creditos : elemento.materia?.creditos;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      variant="outlined"
      sx={{
        mb: 1,
        borderStyle: esEspacioOptativo ? 'dashed' : 'solid',
        backgroundColor: esEspacioOptativo ? 'action.hover' : 'background.paper',
        cursor: editable ? 'grab' : 'default',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.25}>
            {clave && (
              <Typography variant="caption" color="text.secondary">
                {clave}
              </Typography>
            )}
            <Typography variant="body2">{nombre}</Typography>
            <Typography variant="caption" color="text.secondary">
              {creditos} créditos
            </Typography>
          </Stack>
          {editable && (
            <Stack direction="row">
              {esEspacioOptativo && (
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onEditar(elemento)}
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onEliminar(elemento)}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
