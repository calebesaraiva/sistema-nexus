import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';

const brl = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export async function listTemplates(_req: Request, res: Response) {
  return ok(res, await prisma.messageTemplate.findMany({ where: { ativo: true } }));
}

export async function generateMessage(req: Request, res: Response) {
  const [client, charge, template] = await Promise.all([
    prisma.client.findUnique({ where: { id: req.body.clientId } }),
    req.body.chargeId ? prisma.charge.findUnique({ where: { id: req.body.chargeId }, include: { contract: true } }) : null,
    prisma.messageTemplate.findUnique({ where: { id: req.body.templateId } })
  ]);
  if (!client || !template) throw new AppError(404, 'Cliente ou template não encontrado.');
  const mensagem = template.conteudo
    .replaceAll('{{cliente}}', client.nomeEmpresa)
    .replaceAll('{{valor}}', brl(charge?.valor))
    .replaceAll('{{vencimento}}', charge?.dataVencimento ? charge.dataVencimento.toLocaleDateString('pt-BR') : '')
    .replaceAll('{{contrato}}', charge?.contract?.titulo || '');
  const log = await prisma.messageLog.create({ data: { clientId: client.id, chargeId: charge?.id, templateId: template.id, canal: 'whatsapp', mensagem } });
  return ok(res, log, 'Mensagem gerada');
}

export async function sendMessage(req: Request, res: Response) {
  const log = await prisma.messageLog.create({ data: { ...req.body, status: 'enviada', enviadoEm: new Date() } });
  return ok(res, log, 'Mensagem enviada');
}
