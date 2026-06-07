import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { fail } from '../utils/apiResponse';

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) return fail(res, error.statusCode, error.message, error.errors);
  if (error instanceof ZodError) return fail(res, 400, 'Dados inválidos', error.issues);
  console.error('[Nexus Error]', error);
  return fail(res, 500, 'Erro interno. Tente novamente em instantes.');
}
