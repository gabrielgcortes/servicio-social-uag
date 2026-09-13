import { useQueryClient } from '@tanstack/react-query';
import * as elementosApi from '../api/elementos.js';
import { creditosDeElemento } from '../utils/creditos.js';

// Actualización optimista sobre la caché ['mapa', carreraId]: si el backend
// rechaza el cambio (p. ej. por exceder el máximo de créditos), se restaura
// el snapshot previo y se relanza el error para que la UI muestre el motivo.
export function useDragAndDrop(carreraId) {
  const queryClient = useQueryClient();
  const queryKey = ['mapa', carreraId];

  const snapshot = () => queryClient.getQueryData(queryKey);
  const restore = (previo) => queryClient.setQueryData(queryKey, previo);

  async function reordenar(semestreId, elementoIdsNuevos) {
    const previo = snapshot();
    queryClient.setQueryData(queryKey, (mapa) => {
      if (!mapa) return mapa;
      return {
        ...mapa,
        semestres: mapa.semestres.map((semestre) => {
          if (semestre.id !== semestreId) return semestre;
          const porId = Object.fromEntries(semestre.elementos.map((e) => [e.id, e]));
          return { ...semestre, elementos: elementoIdsNuevos.map((id) => porId[id]) };
        }),
      };
    });

    try {
      await elementosApi.reordenarElementos(semestreId, elementoIdsNuevos);
    } catch (error) {
      restore(previo);
      throw error;
    } finally {
      queryClient.invalidateQueries({ queryKey });
    }
  }

  async function mover(elemento, semestreOrigenId, semestreDestinoId, posicion) {
    const previo = snapshot();
    queryClient.setQueryData(queryKey, (mapa) => {
      if (!mapa) return mapa;
      const creditos = creditosDeElemento(elemento);
      const semestres = mapa.semestres.map((semestre) => {
        if (semestre.id === semestreOrigenId) {
          return {
            ...semestre,
            elementos: semestre.elementos.filter((e) => e.id !== elemento.id),
            totales: {
              ...semestre.totales,
              total_creditos: semestre.totales.total_creditos - creditos,
              num_elementos: semestre.totales.num_elementos - 1,
            },
          };
        }
        if (semestre.id === semestreDestinoId) {
          const elementos = [...semestre.elementos];
          const pos = Math.max(0, Math.min(posicion, elementos.length));
          elementos.splice(pos, 0, { ...elemento, semestre_id: semestreDestinoId });
          return {
            ...semestre,
            elementos,
            totales: {
              ...semestre.totales,
              total_creditos: semestre.totales.total_creditos + creditos,
              num_elementos: semestre.totales.num_elementos + 1,
            },
          };
        }
        return semestre;
      });
      return { ...mapa, semestres };
    });

    try {
      await elementosApi.moverElemento(elemento.id, semestreDestinoId, posicion);
    } catch (error) {
      restore(previo);
      throw error;
    } finally {
      queryClient.invalidateQueries({ queryKey });
    }
  }

  return { reordenar, mover };
}
