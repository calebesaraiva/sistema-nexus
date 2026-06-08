import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { createContractWithCharges } from '../services/contractService';
import { audit } from '../services/auditService';
import { paramId } from '../utils/params';

export async function listContracts(_req: Request, res: Response) {
  return ok(res, await prisma.contract.findMany({ include: { client: true, package: true, charges: true }, orderBy: { criadoEm: 'desc' } }));
}

export async function createContract(req: Request, res: Response) {
  const contract = await createContractWithCharges(req.body);
  const isBarter = contract?.tipoRecebimento === 'permuta' || contract?.tipoRecebimento === 'misto';
  await audit(req, isBarter ? 'Contrato criado com permuta' : 'Criação de contrato', 'Contract', contract?.id, {
    charges: contract?.charges.length,
    tipoRecebimento: contract?.tipoRecebimento,
    valorPermuta: contract?.valorPermuta,
    descricaoPermuta: contract?.descricaoPermuta
  });
  return ok(res, contract, 'Contrato cadastrado com sucesso. Cobranças geradas automaticamente.');
}

export async function updateContractStatus(req: Request, res: Response) {
  const contract = await prisma.contract.update({ where: { id: paramId(req.params.id) }, data: { status: req.body.status } });
  await audit(req, 'Alteração de contrato', 'Contract', contract.id);
  return ok(res, contract, 'Status do contrato atualizado');
}
