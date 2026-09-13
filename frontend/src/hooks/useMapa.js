import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMapa } from '../api/carreras.js';

export function useMapa(carreraId) {
  return useQuery({
    queryKey: ['mapa', carreraId],
    queryFn: () => getMapa(carreraId),
    enabled: Boolean(carreraId),
  });
}

export function useInvalidateMapa(carreraId) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['mapa', carreraId] });
}
