import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(6) });
export const verifyEmailSchema = z.object({ email: z.string().email(), code: z.string().length(6) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ email: z.string().email(), code: z.string().length(6), senha: z.string().min(8) });
export const userSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'])
});
export const changeRoleSchema = z.object({ role: z.enum(['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE']) });
export const adminResetPasswordSchema = z.object({ senha: z.string().min(8) });
export const clientSchema = z.object({
  nomeEmpresa: z.string().min(2),
  nomeResponsavel: z.string().min(2),
  cpfCnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  endereco: z.string().optional(),
  segmento: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'prospecto', 'inadimplente']).default('prospecto'),
  observacoes: z.string().optional()
});
export const contractSchema = z.object({
  clientId: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  titulo: z.string().min(3),
  descricao: z.string().optional(),
  dataInicio: z.string(),
  validadeMeses: z.coerce.number().int().min(1).max(120),
  diaPagamentoMensal: z.coerce.number().int().min(1).max(28),
  valorMensal: z.coerce.number().nonnegative(),
  valorTotalContrato: z.coerce.number().nonnegative(),
  valorImplantacao: z.coerce.number().nonnegative().default(0),
  entrada: z.coerce.number().nonnegative().default(0),
  implantacaoParcelada: z.boolean().default(false),
  quantidadeParcelasImplantacao: z.coerce.number().int().min(1).optional(),
  observacoes: z.string().optional()
});
export const chargeSchema = z.object({
  clientId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  tipo: z.enum(['mensalidade', 'implantacao', 'avulsa']),
  descricao: z.string().min(2),
  valor: z.coerce.number().nonnegative(),
  dataVencimento: z.string(),
  observacoes: z.string().optional()
});
export const paymentSchema = z.object({
  chargeId: z.string().uuid(),
  valorPago: z.coerce.number().positive(),
  metodoPagamento: z.enum(['pix', 'boleto', 'cartao', 'dinheiro', 'transferencia', 'outro']),
  observacoes: z.string().optional()
});
export const messageGenerateSchema = z.object({ clientId: z.string().uuid(), chargeId: z.string().uuid().optional(), templateId: z.string().uuid() });
export const messageSendSchema = z.object({ clientId: z.string().uuid(), chargeId: z.string().uuid().optional(), templateId: z.string().uuid().optional(), canal: z.enum(['whatsapp', 'email', 'manual']), mensagem: z.string().min(2) });
export const productSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  precoBase: z.coerce.number().nonnegative().default(0),
  ativo: z.boolean().default(true)
});
export const packageSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  valorMensal: z.coerce.number().nonnegative().default(0),
  valorImplantacao: z.coerce.number().nonnegative().default(0),
  ativo: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).default([])
});
export const projectSchema = z.object({
  clientId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  titulo: z.string().min(2),
  descricao: z.string().optional(),
  status: z.enum(['planejado', 'em_andamento', 'aguardando_cliente', 'concluido', 'pausado', 'cancelado']).default('planejado'),
  dataInicio: z.string().optional(),
  dataPrazo: z.string().optional()
});
export const taskStageSchema = z.object({ nome: z.string().min(2), setor: z.string().min(2), ordem: z.coerce.number().int().default(0), ativo: z.boolean().default(true) });
export const projectTaskSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  responsavelId: z.string().uuid().optional(),
  titulo: z.string().min(2),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  prazo: z.string().optional()
});
export const taskMoveSchema = z.object({ stageId: z.string().uuid(), status: z.string().optional() });
export const taskRejectSchema = z.object({ motivoRecusa: z.string().min(3) });
