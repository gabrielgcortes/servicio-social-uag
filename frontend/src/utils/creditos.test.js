import { describe, expect, it } from 'vitest';
import { calcularCreditos, creditosDeElemento, creditosSonEnteros } from './creditos.js';

describe('calcularCreditos', () => {
  it('reproduce los ejemplos del enunciado', () => {
    expect(calcularCreditos(48, 48)).toBe(6);
    expect(calcularCreditos(48, 64)).toBe(7);
    expect(calcularCreditos(64, 80)).toBe(9);
    expect(calcularCreditos(32, 64)).toBe(6);
  });
});

describe('creditosSonEnteros', () => {
  it('detecta valores no enteros', () => {
    expect(creditosSonEnteros(48, 48)).toBe(true);
    expect(creditosSonEnteros(48, 50)).toBe(false);
  });
});

describe('creditosDeElemento', () => {
  it('usa los créditos de la materia si el elemento es de tipo MATERIA', () => {
    const elemento = { tipo: 'MATERIA', materia: { creditos: 6 } };
    expect(creditosDeElemento(elemento)).toBe(6);
  });

  it('usa los créditos propios si el elemento es un espacio optativo', () => {
    const elemento = { tipo: 'ESPACIO_OPTATIVO', creditos: 6 };
    expect(creditosDeElemento(elemento)).toBe(6);
  });
});
