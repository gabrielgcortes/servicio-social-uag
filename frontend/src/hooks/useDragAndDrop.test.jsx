import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDragAndDrop } from './useDragAndDrop.js';
import * as elementosApi from '../api/elementos.js';

vi.mock('../api/elementos.js');

function crearWrapper(queryClient) {
  // eslint-disable-next-line react/prop-types, react/display-name
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDragAndDrop', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.resetAllMocks();
  });

  it('restaura el snapshot si el backend rechaza el reordenado', async () => {
    const mapaInicial = {
      carrera: { max_creditos_semestre: 50 },
      semestres: [{ id: 1, numero: 1, elementos: [{ id: 10 }, { id: 20 }], totales: {} }],
      violations: [],
    };
    queryClient.setQueryData(['mapa', 1], mapaInicial);
    elementosApi.reordenarElementos.mockRejectedValue(new Error('422'));

    const { result } = renderHook(() => useDragAndDrop(1), { wrapper: crearWrapper(queryClient) });

    await expect(result.current.reordenar(1, [20, 10])).rejects.toThrow();

    const mapaFinal = queryClient.getQueryData(['mapa', 1]);
    expect(mapaFinal.semestres[0].elementos.map((e) => e.id)).toEqual([10, 20]);
  });

  it('aplica el reordenado de forma optimista cuando el backend responde bien', async () => {
    const mapaInicial = {
      carrera: { max_creditos_semestre: 50 },
      semestres: [{ id: 1, numero: 1, elementos: [{ id: 10 }, { id: 20 }], totales: {} }],
      violations: [],
    };
    queryClient.setQueryData(['mapa', 1], mapaInicial);
    elementosApi.reordenarElementos.mockResolvedValue([]);

    const { result } = renderHook(() => useDragAndDrop(1), { wrapper: crearWrapper(queryClient) });
    await result.current.reordenar(1, [20, 10]);

    const mapaOptimista = queryClient.getQueryData(['mapa', 1]);
    expect(mapaOptimista.semestres[0].elementos.map((e) => e.id)).toEqual([20, 10]);
  });
});
