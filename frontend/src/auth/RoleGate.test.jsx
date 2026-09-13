import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoleGate from './RoleGate.jsx';
import { useAuth } from './AuthContext.jsx';

vi.mock('./AuthContext.jsx', () => ({ useAuth: vi.fn() }));

describe('RoleGate', () => {
  it('renderiza los hijos si el rol del principal está permitido', () => {
    useAuth.mockReturnValue({ principal: { rol: 'ADMIN' } });
    render(
      <RoleGate allow={['ADMIN']}>
        <span>Contenido</span>
      </RoleGate>,
    );
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('no renderiza nada si el rol no está permitido', () => {
    useAuth.mockReturnValue({ principal: { rol: 'USUARIO' } });
    render(
      <RoleGate allow={['ADMIN']}>
        <span>Contenido</span>
      </RoleGate>,
    );
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('no renderiza nada sin sesión iniciada', () => {
    useAuth.mockReturnValue({ principal: null });
    render(
      <RoleGate allow={['ADMIN']}>
        <span>Contenido</span>
      </RoleGate>,
    );
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });
});
