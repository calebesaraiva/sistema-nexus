import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; email: string };
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new AppError(401, 'Você precisa estar autenticado.');
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.ativo) throw new AppError(401, 'Usuário sem acesso ativo.');
  req.user = { id: user.id, role: user.role, email: user.email };
  res.on('finish', () => {
    if (req.path.includes('/audit-logs')) return;
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `${req.method} ${req.originalUrl}`,
        entity: 'HttpRequest',
        entityId: Array.isArray(req.params?.id) ? req.params.id[0] : req.params?.id,
        metadata: { statusCode: res.statusCode },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    }).catch((error) => console.error('[Nexus Audit]', error));
  });
  next();
}

export function permit(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new AppError(403, 'Sem permissão para executar esta ação.');
    next();
  };
}
