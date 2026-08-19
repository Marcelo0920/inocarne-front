import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * jsdom no implementa el lienzo. El componente de firma ya contempla que no
 * exista contexto, así que se le da uno inerte para evitar el ruido en la
 * salida de las pruebas.
 */
HTMLCanvasElement.prototype.getContext = (() => null) as never;
HTMLCanvasElement.prototype.toBlob = ((callback: (blob: Blob | null) => void) => {
  callback(null);
}) as never;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
