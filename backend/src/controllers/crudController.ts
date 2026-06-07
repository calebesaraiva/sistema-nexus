import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';
import { audit } from '../services/auditService';
import { paramId } from '../utils/params';
import { addMinutes, generateCode, hashCode } from '../utils/security';
import { professionalApprovalEmail, sendMail } from '../services/mailService';

const selectUser = { id: true, nome: true, email: true, role: true, ativo: true, emailVerificado: true, ultimoLogin: true, criadoEm: true, atualizadoEm: true };

export async function listUsers(_req: Request, res: Response) {
  return ok(res, await prisma.user.findMany({ select: selectUser, orderBy: { criadoEm: 'desc' } }));
}

export async function getUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: paramId(req.params.id) }, select: selectUser });
  if (!user) throw new AppError(404, 'Usuário não encontrado.');
  return ok(res, user);
}

export async function createUser(req: Request, res: Response) {
  if (req.body.role === 'ADMIN_MASTER') {
    const masterCount = await prisma.user.count({ where: { role: 'ADMIN_MASTER' } });
    if (masterCount >= 2) throw new AppError(400, 'O sistema permite no máximo 2 usuários ADMIN_MASTER.');
  }
  const senhaHash = await bcrypt.hash(req.body.senha, 12);
  const code = generateCode();
  const user = await prisma.user.create({
    data: {
      ...req.body,
      senha: undefined,
      senhaHash,
      emailVerificado: false,
      emailVerificationCodeHash: await hashCode(code),
      emailVerificationExpiresAt: addMinutes(30)
    },
    select: selectUser
  });
  const mail = professionalApprovalEmail(user.nome, code);
  await sendMail({ to: user.email, ...mail });
  await audit(req, 'Criação de usuário', 'User', user.id);
  return ok(res, user, 'Usuário criado com sucesso. Código de confirmação enviado por e-mail.');
}

export async function changeUserRole(req: Request, res: Response) {
  if (req.body.role === 'ADMIN_MASTER') {
    const masterCount = await prisma.user.count({ where: { role: 'ADMIN_MASTER' } });
    const target = await prisma.user.findUnique({ where: { id: paramId(req.params.id) } });
    if (target?.role !== 'ADMIN_MASTER' && masterCount >= 2) throw new AppError(400, 'O sistema permite no máximo 2 usuários ADMIN_MASTER.');
  }
  const user = await prisma.user.update({ where: { id: paramId(req.params.id) }, data: { role: req.body.role }, select: selectUser });
  await audit(req, 'Alteração de permissão', 'User', user.id);
  return ok(res, user, 'Perfil do usuário atualizado');
}

export async function resetUserPassword(req: Request, res: Response) {
  const senhaHash = await bcrypt.hash(req.body.senha, 12);
  const user = await prisma.user.update({ where: { id: paramId(req.params.id) }, data: { senhaHash }, select: selectUser });
  await audit(req, 'Reset de senha por administrador', 'User', user.id);
  return ok(res, user, 'Senha temporária definida com sucesso');
}

export async function deleteUser(req: Request, res: Response) {
  const target = await prisma.user.findUnique({ where: { id: paramId(req.params.id) } });
  if (!target) throw new AppError(404, 'Usuário não encontrado.');
  if (target.role === 'ADMIN_MASTER') {
    const count = await prisma.user.count({ where: { role: 'ADMIN_MASTER', ativo: true } });
    if (count <= 1) throw new AppError(400, 'Não é permitido excluir o último ADMIN_MASTER.');
  }
  await prisma.user.delete({ where: { id: target.id } });
  await audit(req, 'Exclusão de usuário', 'User', target.id);
  return ok(res, null, 'Usuário excluído com sucesso');
}

export async function blockUser(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new AppError(404, 'Usuário não encontrado.');
  if (target.role === 'ADMIN_MASTER') {
    const count = await prisma.user.count({ where: { role: 'ADMIN_MASTER', ativo: true } });
    if (count <= 1) throw new AppError(400, 'Não é permitido bloquear o último ADMIN_MASTER.');
  }
  const user = await prisma.user.update({ where: { id }, data: { ativo: false }, select: selectUser });
  await audit(req, 'Bloqueio de usuário', 'User', user.id);
  return ok(res, user, 'Usuário bloqueado com sucesso');
}

export async function unblockUser(req: Request, res: Response) {
  return ok(res, await prisma.user.update({ where: { id: paramId(req.params.id) }, data: { ativo: true }, select: selectUser }), 'Usuário desbloqueado com sucesso');
}

export async function listClients(req: Request, res: Response) {
  const q = String(req.query.q || '');
  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      OR: q ? [
        { nomeEmpresa: { contains: q, mode: 'insensitive' } },
        { cpfCnpj: { contains: q, mode: 'insensitive' } },
        { telefone: { contains: q, mode: 'insensitive' } },
        { cidade: { contains: q, mode: 'insensitive' } }
      ] : undefined
    },
    orderBy: { criadoEm: 'desc' }
  });
  return ok(res, clients);
}

export async function getClient(req: Request, res: Response) {
  const client = await prisma.client.findFirst({ where: { id: paramId(req.params.id), deletedAt: null }, include: { contracts: true, charges: true, notes: true } });
  if (!client) throw new AppError(404, 'Cliente não encontrado.');
  return ok(res, client);
}

export async function createClient(req: Request, res: Response) {
  const client = await prisma.client.create({ data: req.body });
  await audit(req, 'Criação de cliente', 'Client', client.id);
  return ok(res, client, 'Cliente criado com sucesso');
}

export async function updateClient(req: Request, res: Response) {
  const client = await prisma.client.update({ where: { id: paramId(req.params.id) }, data: req.body });
  await audit(req, 'Edição de cliente', 'Client', client.id);
  return ok(res, client, 'Cliente editado com sucesso');
}

export async function deleteClient(req: Request, res: Response) {
  const client = await prisma.client.update({ where: { id: paramId(req.params.id) }, data: { deletedAt: new Date(), status: 'inativo' } });
  await audit(req, 'Exclusão de cliente', 'Client', client.id);
  return ok(res, client, 'Cliente excluído com segurança');
}

export async function listProducts(_req: Request, res: Response) {
  return ok(res, await prisma.product.findMany({ orderBy: { nome: 'asc' } }));
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: paramId(req.params.id) } });
  if (!product) throw new AppError(404, 'Produto não encontrado.');
  return ok(res, product);
}

export async function createProduct(req: Request, res: Response) {
  const product = await prisma.product.create({ data: req.body });
  await audit(req, 'Criação de produto', 'Product', product.id);
  return ok(res, product, 'Produto criado com sucesso');
}

export async function updateProduct(req: Request, res: Response) {
  const product = await prisma.product.update({ where: { id: paramId(req.params.id) }, data: req.body });
  await audit(req, 'Edição de produto', 'Product', product.id);
  return ok(res, product, 'Produto atualizado com sucesso');
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await prisma.product.update({ where: { id: paramId(req.params.id) }, data: { ativo: false } });
  await audit(req, 'Desativação de produto', 'Product', product.id);
  return ok(res, product, 'Produto desativado com sucesso');
}

export async function listPackages(_req: Request, res: Response) {
  return ok(res, await prisma.package.findMany({ include: { products: { include: { product: true } } }, orderBy: { nome: 'asc' } }));
}

export async function getPackage(req: Request, res: Response) {
  const pkg = await prisma.package.findUnique({ where: { id: paramId(req.params.id) }, include: { products: { include: { product: true } } } });
  if (!pkg) throw new AppError(404, 'Pacote não encontrado.');
  return ok(res, pkg);
}

export async function createPackage(req: Request, res: Response) {
  const { productIds, ...data } = req.body;
  const pkg = await prisma.package.create({
    data: { ...data, products: { create: productIds.map((productId: string) => ({ productId })) } },
    include: { products: { include: { product: true } } }
  });
  await audit(req, 'Criação de pacote', 'Package', pkg.id);
  return ok(res, pkg, 'Pacote criado com sucesso');
}

export async function updatePackage(req: Request, res: Response) {
  const { productIds, ...data } = req.body;
  const pkg = await prisma.$transaction(async (tx) => {
    await tx.packageService.deleteMany({ where: { packageId: paramId(req.params.id) } });
    return tx.package.update({
      where: { id: paramId(req.params.id) },
      data: { ...data, products: { create: productIds.map((productId: string) => ({ productId })) } },
      include: { products: { include: { product: true } } }
    });
  });
  await audit(req, 'Edição de pacote', 'Package', pkg.id);
  return ok(res, pkg, 'Pacote atualizado com sucesso');
}

export async function deletePackage(req: Request, res: Response) {
  const pkg = await prisma.package.update({ where: { id: paramId(req.params.id) }, data: { ativo: false } });
  await audit(req, 'Desativação de pacote', 'Package', pkg.id);
  return ok(res, pkg, 'Pacote desativado com sucesso');
}

export async function createProject(req: Request, res: Response) {
  const project = await prisma.project.create({
    data: {
      ...req.body,
      dataInicio: req.body.dataInicio ? new Date(req.body.dataInicio) : undefined,
      dataPrazo: req.body.dataPrazo ? new Date(req.body.dataPrazo) : undefined
    },
    include: { client: true, contract: true }
  });
  await audit(req, 'Criação de projeto', 'Project', project.id);
  return ok(res, project, 'Projeto criado com sucesso');
}

export async function listCharges(req: Request, res: Response) {
  return ok(res, await prisma.charge.findMany({ include: { client: true, contract: true }, orderBy: { dataVencimento: 'asc' } }));
}

export async function payCharge(req: Request, res: Response) {
  const charge = await prisma.charge.findUnique({ where: { id: paramId(req.params.id) } });
  if (!charge) throw new AppError(404, 'Cobrança não encontrada.');
  const paid = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        chargeId: charge.id,
        clientId: charge.clientId,
        valorPago: req.body.valorPago ?? charge.valor,
        metodoPagamento: req.body.metodoPagamento ?? 'pix',
        observacoes: req.body.observacoes
      }
    });
    const updated = await tx.charge.update({ where: { id: charge.id }, data: { status: 'pago', dataPagamento: new Date(), metodoPagamento: payment.metodoPagamento } });
    return { payment, charge: updated };
  });
  await audit(req, 'Confirmação de pagamento', 'Charge', charge.id);
  return ok(res, paid, 'Pagamento confirmado');
}

export async function listPayments(_req: Request, res: Response) {
  return ok(res, await prisma.payment.findMany({ include: { client: true, charge: true }, orderBy: { dataPagamento: 'desc' } }));
}

export async function listProjects(_req: Request, res: Response) {
  return ok(res, await prisma.project.findMany({ include: { client: true, contract: true, tasks: { include: { stage: true, responsavel: { select: selectUser } } } }, orderBy: { dataPrazo: 'asc' } }));
}

export async function updateProject(req: Request, res: Response) {
  const project = await prisma.project.update({
    where: { id: paramId(req.params.id) },
    data: {
      ...req.body,
      dataInicio: req.body.dataInicio ? new Date(req.body.dataInicio) : undefined,
      dataPrazo: req.body.dataPrazo ? new Date(req.body.dataPrazo) : undefined
    }
  });
  await audit(req, 'Edição de projeto', 'Project', project.id);
  return ok(res, project, 'Projeto atualizado com sucesso');
}

export async function deleteProject(req: Request, res: Response) {
  await prisma.project.delete({ where: { id: paramId(req.params.id) } });
  await audit(req, 'Exclusão de projeto', 'Project', paramId(req.params.id));
  return ok(res, null, 'Projeto excluído com sucesso');
}

export async function financialDashboard(_req: Request, res: Response) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [charges, clientsActive, contractsActive] = await Promise.all([
    prisma.charge.findMany({ where: { dataVencimento: { gte: monthStart, lte: monthEnd } }, include: { client: true, contract: true } }),
    prisma.client.count({ where: { status: 'ativo', deletedAt: null } }),
    prisma.contract.count({ where: { status: 'ativo' } })
  ]);
  const sum = (status?: string) => charges.filter((c) => !status || c.status === status).reduce((a, c) => a + Number(c.valor), 0);
  return ok(res, {
    receitaPrevistaMes: sum(),
    receitaRecebidaMes: sum('pago'),
    totalPendente: sum('pendente'),
    totalVencido: sum('vencido'),
    clientesAtivos: clientsActive,
    contratosAtivos: contractsActive,
    proximosVencimentos: charges.slice(0, 8),
    clientesInadimplentes: await prisma.client.findMany({ where: { status: 'inadimplente', deletedAt: null } }),
    receitaPorMes: [],
    cobrancasPorStatus: ['pendente', 'pago', 'vencido', 'cancelado'].map((status) => ({ status, total: sum(status) })),
    contratosProximosVencimento: await prisma.contract.findMany({ where: { status: 'ativo', dataFim: { lte: new Date(now.getFullYear(), now.getMonth() + 2, now.getDate()) } }, include: { client: true } })
  });
}

export async function auditLogs(_req: Request, res: Response) {
  return ok(res, await prisma.auditLog.findMany({ include: { user: { select: selectUser } }, orderBy: { createdAt: 'desc' } }));
}
