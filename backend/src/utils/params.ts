import { AppError } from './errors';

export function paramId(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) throw new AppError(400, 'Identificador inválido.');
  return value;
}
