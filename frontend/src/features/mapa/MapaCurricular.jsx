import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, CircularProgress, Snackbar, Stack } from '@mui/material';
import { useAuth } from '../../auth/AuthContext.jsx';
import * as materiasApi from '../../api/materias.js';
import { useMapa } from '../../hooks/useMapa.js';
import { useDragAndDrop } from '../../hooks/useDragAndDrop.js';
import {
  useActualizarEspacioOptativo,
  useCrearElementoMateria,
  useCrearEspacioOptativo,
  useEliminarElemento,
} from '../../hooks/useElementos.js';
import AgregarElementoDialog from './AgregarElementoDialog.jsx';
import EspacioOptativoDialog from './EspacioOptativoDialog.jsx';
import MateriaFormDialog from './MateriaFormDialog.jsx';
import SemestreColumn from './SemestreColumn.jsx';
import ValidacionesPanel from './ValidacionesPanel.jsx';

export default function MapaCurricular({ carreraId }) {
  const { principal } = useAuth();
  const { data: mapa, isLoading, isError } = useMapa(carreraId);
  const { data: obligatorias = [] } = useQuery({
    queryKey: ['materias', carreraId, 'OBLIGATORIA'],
    queryFn: () => materiasApi.listMaterias(carreraId, { tipo: 'OBLIGATORIA' }),
    enabled: Boolean(carreraId),
  });

  const editable = principal?.rol === 'ADMIN' || principal?.rol === 'DIRECTOR';

  const { reordenar, mover } = useDragAndDrop(carreraId);
  const crearElementoMateria = useCrearElementoMateria(carreraId);
  const crearEspacioOptativo = useCrearEspacioOptativo(carreraId);
  const actualizarEspacioOptativo = useActualizarEspacioOptativo(carreraId);
  const eliminarElemento = useEliminarElemento(carreraId);

  const [semestreParaAgregar, setSemestreParaAgregar] = useState(null);
  const [espacioDialog, setEspacioDialog] = useState({
    open: false,
    semestreId: null,
    elemento: null,
  });
  const [nuevaMateriaSemestreId, setNuevaMateriaSemestreId] = useState(null);
  const [error, setError] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const elementosColocadosIds = useMemo(
    () =>
      new Set(
        (mapa?.semestres ?? [])
          .flatMap((s) => s.elementos)
          .filter((e) => e.tipo === 'MATERIA')
          .map((e) => e.materia_id),
      ),
    [mapa],
  );
  const materiasDisponibles = obligatorias.filter((m) => !elementosColocadosIds.has(m.id));

  const encontrarSemestreDeElemento = (elementoId) =>
    mapa?.semestres.find((s) => s.elementos.some((e) => e.id === elementoId));

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || !editable) return;

    const semestreOrigen = encontrarSemestreDeElemento(active.id);
    if (!semestreOrigen) return;
    const elemento = semestreOrigen.elementos.find((e) => e.id === active.id);

    let semestreDestinoId;
    let overEsElemento = false;
    if (typeof over.id === 'string' && over.id.startsWith('semestre-')) {
      semestreDestinoId = Number(over.id.replace('semestre-', ''));
    } else {
      overEsElemento = true;
      semestreDestinoId = encontrarSemestreDeElemento(over.id)?.id;
    }
    if (!semestreDestinoId) return;

    try {
      if (semestreDestinoId === semestreOrigen.id) {
        if (!overEsElemento || active.id === over.id) return;
        const ids = semestreOrigen.elementos.map((e) => e.id);
        const nuevoOrden = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
        await reordenar(semestreOrigen.id, nuevoOrden);
      } else {
        const semestreDestino = mapa.semestres.find((s) => s.id === semestreDestinoId);
        const posicion = overEsElemento
          ? semestreDestino.elementos.findIndex((e) => e.id === over.id)
          : semestreDestino.elementos.length;
        await mover(elemento, semestreOrigen.id, semestreDestinoId, posicion);
      }
    } catch (err) {
      const mensaje = err.response?.data?.violations?.[0]?.message ?? err.response?.data?.detail;
      setError(mensaje ?? 'No se pudo mover el elemento');
    }
  };

  if (isLoading) return <CircularProgress />;
  if (isError || !mapa) return <Alert severity="error">No se pudo cargar el mapa curricular.</Alert>;

  return (
    <Box>
      <ValidacionesPanel violations={mapa.violations} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
          {mapa.semestres.map((semestre) => (
            <SemestreColumn
              key={semestre.id}
              semestre={semestre}
              maxCreditos={mapa.carrera.max_creditos_semestre}
              editable={editable}
              onAgregar={() => setSemestreParaAgregar(semestre)}
              onEditarEspacio={(elemento) =>
                setEspacioDialog({ open: true, semestreId: semestre.id, elemento })
              }
              onEliminarElemento={(elemento) => eliminarElemento.mutate(elemento.id)}
            />
          ))}
        </Stack>
      </DndContext>

      <AgregarElementoDialog
        open={Boolean(semestreParaAgregar)}
        onClose={() => setSemestreParaAgregar(null)}
        materiasDisponibles={materiasDisponibles}
        onAgregarMateria={(materiaId) =>
          crearElementoMateria.mutateAsync({ semestreId: semestreParaAgregar.id, materiaId })
        }
        onAbrirEspacioOptativo={() =>
          setEspacioDialog({ open: true, semestreId: semestreParaAgregar.id, elemento: null })
        }
        onCrearNuevaMateria={() => setNuevaMateriaSemestreId(semestreParaAgregar.id)}
      />

      <EspacioOptativoDialog
        open={espacioDialog.open}
        elemento={espacioDialog.elemento}
        onClose={() => setEspacioDialog({ open: false, semestreId: null, elemento: null })}
        onSubmit={async (values) => {
          if (espacioDialog.elemento) {
            await actualizarEspacioOptativo.mutateAsync({
              elementoId: espacioDialog.elemento.id,
              payload: values,
            });
          } else {
            await crearEspacioOptativo.mutateAsync({
              semestreId: espacioDialog.semestreId,
              payload: values,
            });
          }
        }}
      />

      <MateriaFormDialog
        open={Boolean(nuevaMateriaSemestreId)}
        tipo="OBLIGATORIA"
        materiasParaSeriacion={obligatorias}
        onClose={() => setNuevaMateriaSemestreId(null)}
        onSubmit={async (values) => {
          const materia = await materiasApi.createMateria(carreraId, values);
          await crearElementoMateria.mutateAsync({
            semestreId: nuevaMateriaSemestreId,
            materiaId: materia.materia?.id ?? materia.id,
          });
        }}
      />

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        message={error}
      />
    </Box>
  );
}
