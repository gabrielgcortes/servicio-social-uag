import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as elementosApi from '../api/elementos.js';

function useInvalidateMapa(carreraId) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['mapa', carreraId] });
}

export function useCrearElementoMateria(carreraId) {
  const invalidar = useInvalidateMapa(carreraId);
  return useMutation({
    mutationFn: ({ semestreId, materiaId }) =>
      elementosApi.createElementoMateria(semestreId, materiaId),
    onSuccess: invalidar,
  });
}

export function useCrearEspacioOptativo(carreraId) {
  const invalidar = useInvalidateMapa(carreraId);
  return useMutation({
    mutationFn: ({ semestreId, payload }) =>
      elementosApi.createEspacioOptativo(semestreId, payload),
    onSuccess: invalidar,
  });
}

export function useActualizarEspacioOptativo(carreraId) {
  const invalidar = useInvalidateMapa(carreraId);
  return useMutation({
    mutationFn: ({ elementoId, payload }) =>
      elementosApi.updateEspacioOptativo(elementoId, payload),
    onSuccess: invalidar,
  });
}

export function useEliminarElemento(carreraId) {
  const invalidar = useInvalidateMapa(carreraId);
  return useMutation({
    mutationFn: (elementoId) => elementosApi.deleteElemento(elementoId),
    onSuccess: invalidar,
  });
}
