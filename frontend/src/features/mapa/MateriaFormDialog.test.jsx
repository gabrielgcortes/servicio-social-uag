import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MateriaFormDialog from './MateriaFormDialog.jsx';

describe('MateriaFormDialog', () => {
  it('muestra los créditos calculados en vivo al escribir las horas', () => {
    render(
      <MateriaFormDialog
        open
        onClose={() => {}}
        onSubmit={vi.fn()}
        materia={null}
        tipo="OBLIGATORIA"
        materiasParaSeriacion={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Horas con docente'), { target: { value: '48' } });
    fireEvent.change(screen.getByLabelText('Horas independientes'), { target: { value: '64' } });

    expect(screen.getByText(/Créditos calculados: 7/)).toBeInTheDocument();
  });

  it('advierte cuando los créditos no son un valor entero', () => {
    render(
      <MateriaFormDialog
        open
        onClose={() => {}}
        onSubmit={vi.fn()}
        materia={null}
        tipo="OBLIGATORIA"
        materiasParaSeriacion={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Horas con docente'), { target: { value: '48' } });
    fireEvent.change(screen.getByLabelText('Horas independientes'), { target: { value: '50' } });

    expect(screen.getByText(/no es un valor entero/)).toBeInTheDocument();
  });
});
