import { prisma } from '../prisma';
import { addMonths, dueDateFrom } from '../utils/dates';
import { AppError } from '../utils/errors';

type ContractInput = {
  clientId: string;
  packageId?: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  validadeMeses: number;
  diaPagamentoMensal: number;
  valorMensal: number;
  valorTotalContrato: number;
  valorImplantacao: number;
  entrada: number;
  tipoRecebimento: 'dinheiro' | 'permuta' | 'misto';
  valorPermuta: number;
  descricaoPermuta?: string;
  parceiroPermuta?: string;
  observacoesPermuta?: string;
  prazoPermuta?: string;
  statusPermuta?: 'pendente' | 'compensada' | 'parcial' | 'cancelado';
  implantacaoParcelada: boolean;
  quantidadeParcelasImplantacao?: number;
  observacoes?: string;
};

export async function createContractWithCharges(input: ContractInput) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new AppError(404, 'Cliente não encontrado.');

  const start = new Date(`${input.dataInicio}T00:00:00`);
  const end = addMonths(start, input.validadeMeses);
  const packageWithProducts = input.packageId
    ? await prisma.package.findUnique({ where: { id: input.packageId }, include: { products: { include: { product: true } } } })
    : null;

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.create({
      data: {
        clientId: input.clientId,
        packageId: input.packageId,
        titulo: input.titulo,
        descricao: input.descricao,
        dataInicio: start,
        dataFim: end,
        validadeMeses: input.validadeMeses,
        diaPagamentoMensal: input.diaPagamentoMensal,
        valorMensal: input.valorMensal,
        valorTotalContrato: input.valorTotalContrato,
        valorImplantacao: input.valorImplantacao,
        entrada: input.entrada,
        tipoRecebimento: input.tipoRecebimento || 'dinheiro',
        valorPermuta: input.valorPermuta || 0,
        descricaoPermuta: input.descricaoPermuta,
        parceiroPermuta: input.parceiroPermuta,
        observacoesPermuta: input.observacoesPermuta,
        prazoPermuta: input.prazoPermuta ? new Date(`${input.prazoPermuta}T00:00:00`) : undefined,
        statusPermuta: input.statusPermuta || (input.tipoRecebimento === 'permuta' || input.tipoRecebimento === 'misto' ? 'pendente' : undefined),
        implantacaoParcelada: input.implantacaoParcelada,
        quantidadeParcelasImplantacao: input.quantidadeParcelasImplantacao,
        observacoes: input.observacoes
      }
    });

    const hasCash = (input.tipoRecebimento || 'dinheiro') !== 'permuta';
    const hasBarter = ['permuta', 'misto'].includes(input.tipoRecebimento || 'dinheiro') && Number(input.valorPermuta || 0) > 0;

    const monthly = hasCash ? Array.from({ length: input.validadeMeses }).map((_, index) => ({
      clientId: input.clientId,
      contractId: contract.id,
      tipo: 'mensalidade' as const,
      descricao: `Mensalidade ${index + 1}/${input.validadeMeses} - ${input.titulo}`,
      valor: input.valorMensal,
      dataVencimento: dueDateFrom(start, index, input.diaPagamentoMensal)
    })) : [];

    const implantationBalance = Math.max(input.valorImplantacao - input.entrada, 0);
    const installments = input.implantacaoParcelada ? input.quantidadeParcelasImplantacao || 1 : implantationBalance > 0 ? 1 : 0;
    const implantation = hasCash && implantationBalance > 0
      ? Array.from({ length: installments }).map((_, index) => ({
          clientId: input.clientId,
          contractId: contract.id,
          tipo: 'implantacao' as const,
          descricao: `Parcela de implantação ${index + 1}/${installments} - ${input.titulo}`,
          valor: implantationBalance / installments,
          dataVencimento: dueDateFrom(start, index, input.diaPagamentoMensal)
        }))
      : [];

    const barter = hasBarter ? [{
      clientId: input.clientId,
      contractId: contract.id,
      tipo: 'permuta' as const,
      descricao: input.descricaoPermuta || `Permuta - ${input.titulo}`,
      valor: input.valorPermuta,
      dataVencimento: input.prazoPermuta ? new Date(`${input.prazoPermuta}T00:00:00`) : end,
      status: input.statusPermuta || 'pendente',
      observacoes: input.observacoesPermuta
    }] : [];

    await tx.charge.createMany({ data: [...monthly, ...implantation, ...barter] });

    if (packageWithProducts) {
      await tx.contractedService.createMany({
        data: packageWithProducts.products.map(({ product }) => ({
          contractId: contract.id,
          productId: product.id,
          nomeServico: product.nome,
          descricao: product.descricao
        }))
      });
    }

    return tx.contract.findUnique({
      where: { id: contract.id },
      include: { client: true, package: true, charges: true, services: true }
    });
  });
}
