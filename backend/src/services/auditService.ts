import { Request } from 'express';
import { prisma } from '../prisma';

export async function audit(req: Request, action: string, entity: string, entityId?: string, metadata?: object) {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action,
      entity,
      entityId,
      metadata: metadata || {},
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
}
