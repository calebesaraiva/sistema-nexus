import { Response } from 'express';

export function ok(res: Response, data: unknown, message = 'Operação realizada com sucesso') {
  return res.json({ success: true, data, message });
}

export function fail(res: Response, status: number, message: string, errors: unknown[] = []) {
  return res.status(status).json({ success: false, message, errors });
}
