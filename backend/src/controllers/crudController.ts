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
  const client = await prisma.client.findFirst({ where: { id: paramId(req.params.id), deletedAt: null }, include: { contracts: { include: { documents: true, charges: true, services: true } }, charges: true, notes: true, documents: true } });
  if (!client) throw new AppError(404, 'Cliente não encontrado.');
  return ok(res, client);
}

export async function createClient(req: Request, res: Response) {
  const client = await prisma.client.create({ data: { ...req.body, contratoAssinadoEm: req.body.contratoAssinadoEm ? new Date(`${req.body.contratoAssinadoEm}T00:00:00`) : undefined } });
  await audit(req, 'Criação de cliente', 'Client', client.id);
  return ok(res, client, 'Cliente criado com sucesso');
}

export async function updateClient(req: Request, res: Response) {
  const client = await prisma.client.update({ where: { id: paramId(req.params.id) }, data: { ...req.body, contratoAssinadoEm: req.body.contratoAssinadoEm ? new Date(`${req.body.contratoAssinadoEm}T00:00:00`) : null } });
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

export async function createCharge(req: Request, res: Response) {
  const client = await prisma.client.findFirst({ where: { id: req.body.clientId, deletedAt: null } });
  if (!client) throw new AppError(404, 'Cliente não encontrado.');
  const charge = await prisma.charge.create({
    data: {
      ...req.body,
      dataVencimento: new Date(`${req.body.dataVencimento}T00:00:00`),
      status: req.body.tipo === 'permuta' ? 'pendente' : undefined
    },
    include: { client: true, contract: true }
  });
  await audit(req, 'Criação de cobrança', 'Charge', charge.id, { tipo: charge.tipo, valor: charge.valor });
  return ok(res, charge, 'Cobrança criada com sucesso');
}

export async function payCharge(req: Request, res: Response) {
  const charge = await prisma.charge.findUnique({ where: { id: paramId(req.params.id) } });
  if (!charge) throw new AppError(404, 'Cobrança não encontrada.');
  if (charge.tipo === 'permuta') throw new AppError(400, 'Permuta não deve ser marcada como pagamento em dinheiro. Use a ação de compensação.');
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
  await refreshFinancialStatuses();
  return ok(res, paid, 'Pagamento confirmado');
}

export async function compensateBarter(req: Request, res: Response) {
  const charge = await prisma.charge.findUnique({ where: { id: paramId(req.params.id) }, include: { contract: true } });
  if (!charge) throw new AppError(404, 'Lançamento não encontrado.');
  if (charge.tipo !== 'permuta') throw new AppError(400, 'Esta ação é exclusiva para lançamentos de permuta.');
  const status = req.body.status || 'compensada';
  if (!['pendente', 'compensada', 'parcial', 'cancelado'].includes(status)) throw new AppError(400, 'Status de permuta inválido.');
  const updated = await prisma.$transaction(async (tx) => {
    const barter = await tx.charge.update({
      where: { id: charge.id },
      data: { status, dataPagamento: status === 'compensada' ? new Date() : charge.dataPagamento, observacoes: req.body.observacoes ?? charge.observacoes }
    });
    if (charge.contractId) {
      await tx.contract.update({ where: { id: charge.contractId }, data: { statusPermuta: barter.status } });
    }
    return barter;
  });
  await audit(req, 'Permuta marcada como compensada', 'Charge', charge.id, { status: updated.status });
  await refreshFinancialStatuses();
  return ok(res, updated, 'Permuta compensada com sucesso');
}

export async function listPayments(_req: Request, res: Response) {
  return ok(res, await prisma.payment.findMany({ include: { client: true, charge: true }, orderBy: { dataPagamento: 'desc' } }));
}

async function refreshFinancialStatuses() {
  const today = new Date();
  await prisma.charge.updateMany({ where: { status: 'pendente', dataVencimento: { lt: today } }, data: { status: 'vencido' } });
  const overdueClients = await prisma.charge.findMany({ where: { status: 'vencido' }, select: { clientId: true }, distinct: ['clientId'] });
  const overdueClientIds = overdueClients.map((item) => item.clientId);
  if (overdueClientIds.length) await prisma.client.updateMany({ where: { id: { in: overdueClientIds }, deletedAt: null }, data: { status: 'inadimplente' } });
  await prisma.client.updateMany({ where: { status: 'inadimplente', deletedAt: null, charges: { none: { status: 'vencido' } } }, data: { status: 'ativo' } });
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
  await refreshFinancialStatuses();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const next30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
  const last12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [charges, allCharges, clientsActive, contractsActive, activeContracts, barterContracts, mixedContracts, payments, contractsEndingSoon] = await Promise.all([
    prisma.charge.findMany({ where: { dataVencimento: { gte: monthStart, lte: monthEnd } }, include: { client: true, contract: true } }),
    prisma.charge.findMany({ include: { client: true, contract: true } }),
    prisma.client.count({ where: { status: 'ativo', deletedAt: null } }),
    prisma.contract.count({ where: { status: 'ativo' } }),
    prisma.contract.findMany({ where: { status: 'ativo' }, include: { client: true, documents: true } }),
    prisma.contract.findMany({ where: { status: 'ativo', tipoRecebimento: 'permuta' }, include: { client: true } }),
    prisma.contract.findMany({ where: { status: 'ativo', tipoRecebimento: 'misto' }, include: { client: true } }),
    prisma.payment.findMany({ where: { dataPagamento: { gte: last12Start } }, include: { charge: true, client: true }, orderBy: { dataPagamento: 'asc' } }),
    prisma.contract.findMany({ where: { status: 'ativo', dataFim: { gte: now, lte: next30 } }, include: { client: true, documents: true } })
  ]);
  const cashCharges = charges.filter((c) => c.tipo !== 'permuta');
  const cashAllCharges = allCharges.filter((c) => c.tipo !== 'permuta');
  const barterCharges = allCharges.filter((c) => c.tipo === 'permuta');
  const sum = (items: typeof charges, status?: string) => items.filter((c) => !status || c.status === status).reduce((a, c) => a + Number(c.valor), 0);
  const paidThisMonth = cashAllCharges.filter((c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento >= monthStart && c.dataPagamento <= monthEnd);
  const monthPending = cashCharges.filter((c) => c.status === 'pendente' && c.dataVencimento >= now);
  const monthOverdue = cashAllCharges.filter((c) => c.status === 'vencido');
  const setupAll = cashAllCharges.filter((c) => c.tipo === 'implantacao');
  const setupMonth = cashCharges.filter((c) => c.tipo === 'implantacao');
  const monthlyCharges = cashCharges.filter((c) => c.tipo === 'mensalidade');
  const activeBarterValue = barterContracts.reduce((a, c) => a + Number(c.valorPermuta), 0) + mixedContracts.reduce((a, c) => a + Number(c.valorPermuta), 0);
  const monthBarter = charges.filter((c) => c.tipo === 'permuta');
  const barterCompensated = sum(barterCharges, 'compensada');
  const barterPending = sum(barterCharges.filter((c) => c.status === 'pendente' || c.status === 'parcial'));
  const mrrAtual = activeContracts.filter((contract) => contract.tipoRecebimento !== 'permuta').reduce((a, c) => a + Number(c.valorMensal), 0);
  const clientsWithContract = new Set(activeContracts.map((contract) => contract.clientId)).size;
  const receitaPrevistaMes = sum(cashCharges.filter((c) => c.status !== 'cancelado'));
  const receitaRecebidaMes = paidThisMonth.reduce((a, c) => a + Number(c.valor), 0);
  const totalVencido = sum(monthOverdue);
  const monthNames = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, mes: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), start: date, end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59) };
  });
  const revenueLast12 = monthNames.map((month) => ({
    mes: month.mes,
    recebido: payments.filter((payment) => payment.dataPagamento >= month.start && payment.dataPagamento <= month.end && payment.charge?.tipo !== 'permuta').reduce((a, payment) => a + Number(payment.valorPago), 0)
  }));
  const mrrEvolution = monthNames.map((month) => ({
    mes: month.mes,
    mrr: activeContracts.filter((contract) => contract.dataInicio <= month.end && contract.dataFim >= month.start && contract.tipoRecebimento !== 'permuta').reduce((a, contract) => a + Number(contract.valorMensal), 0)
  }));
  return ok(res, {
    receitaPrevistaMes,
    receitaRecebidaMes,
    totalPendente: sum(monthPending),
    totalVencido,
    totalImplantacaoReceber: sum(setupAll.filter((c) => c.status === 'pendente' || c.status === 'vencido')),
    totalImplantacaoRecebido: sum(setupAll, 'pago'),
    saldoImplantacao: sum(setupAll.filter((c) => c.status === 'pendente' || c.status === 'vencido')),
    implantacaoVencida: sum(setupAll.filter((c) => c.status === 'vencido')),
    mensalidadePrevistaMes: sum(monthlyCharges.filter((c) => c.status !== 'cancelado')),
    mensalidadeRecebidaMes: sum(monthlyCharges.filter((c) => c.status === 'pago' && c.dataPagamento && c.dataPagamento >= monthStart && c.dataPagamento <= monthEnd)),
    mensalidadePendenteMes: sum(monthlyCharges.filter((c) => c.status === 'pendente')),
    mrrAtual,
    ticketMedioMensal: clientsWithContract ? mrrAtual / clientsWithContract : 0,
    percentualInadimplencia: receitaPrevistaMes ? (totalVencido / receitaPrevistaMes) * 100 : 0,
    taxaRecebimentoMes: receitaPrevistaMes ? (receitaRecebidaMes / receitaPrevistaMes) * 100 : 0,
    valorPermutasAtivas: activeBarterValue,
    valorPermutasMes: sum(monthBarter),
    valorPermutasPendentes: barterPending,
    valorPermutasCompensadas: barterCompensated,
    contratosPermuta: barterContracts.length,
    contratosMistos: mixedContracts.length,
    clientesPermuta: [...barterContracts, ...mixedContracts].map((contract) => contract.client),
    totalEconomicoGeral: sum(cashCharges) + sum(monthBarter),
    clientesAtivos: clientsActive,
    contratosAtivos: contractsActive,
    proximosVencimentos: cashCharges.slice(0, 8),
    clientesInadimplentes: await prisma.client.findMany({ where: { status: 'inadimplente', deletedAt: null } }),
    receitaPorMes: revenueLast12,
    evolucaoMrr: mrrEvolution,
    implantacaoResumo: [
      { nome: 'Recebido', valor: sum(setupMonth, 'pago') },
      { nome: 'Pendente', valor: sum(setupMonth.filter((c) => c.status === 'pendente' || c.status === 'vencido')) }
    ],
    mensalidadeResumo: [
      { nome: 'Recebido', valor: sum(monthlyCharges, 'pago') },
      { nome: 'Pendente', valor: sum(monthlyCharges.filter((c) => c.status === 'pendente' || c.status === 'vencido')) }
    ],
    cobrancasPorStatus: ['pendente', 'pago', 'vencido', 'cancelado'].map((status) => ({ status, total: sum(cashCharges, status) })),
    permutasPorStatus: ['pendente', 'compensada', 'parcial', 'cancelado'].map((status) => ({ status, total: sum(barterCharges, status) })),
    implantacaoAReceber: setupAll.filter((c) => c.status === 'pendente' || c.status === 'vencido').slice(0, 8),
    parcelasImplantacaoAtrasadas: setupAll.filter((c) => c.status === 'vencido').slice(0, 8),
    contratosProximosVencimento: contractsEndingSoon,
    contratosSemPdf: activeContracts.filter((contract) => !('documents' in contract) || !contract.documents?.length).slice(0, 8)
  });
}

export async function auditLogs(_req: Request, res: Response) {
  return ok(res, await prisma.auditLog.findMany({ include: { user: { select: selectUser } }, orderBy: { createdAt: 'desc' } }));
}
