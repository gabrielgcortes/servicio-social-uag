import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as carrerasApi from '../api/carreras.js';

export function useCarreras() {
  return useQuery({ queryKey: ['carreras'], queryFn: carrerasApi.listCarreras });
}

export function useCarrera(carreraId) {
  return useQuery({
    queryKey: ['carrera', carreraId],
    queryFn: () => carrerasApi.getCarrera(carreraId),
    enabled: Boolean(carreraId),
  });
}

export function useCreateCarrera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: carrerasApi.createCarrera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carreras'] }),
  });
}

export function useUpdateCarrera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => carrerasApi.updateCarrera(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['carreras'] });
      queryClient.invalidateQueries({ queryKey: ['carrera', variables.id] });
    },
  });
}

export function useDeactivateCarrera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: carrerasApi.deactivateCarrera,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carreras'] }),
  });
}
