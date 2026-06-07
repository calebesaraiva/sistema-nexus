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
        implantacaoParcelada: input.implantacaoParcelada,
        quantidadeParcelasImplantacao: input.quantidadeParcelasImplantacao,
        observacoes: input.observacoes
      }
    });

    const monthly = Array.from({ length: input.validadeMeses }).map((_, index) => ({
      clientId: input.clientId,
      contractId: contract.id,
      tipo: 'mensalidade' as const,
      descricao: `Mensalidade ${index + 1}/${input.validadeMeses} - ${input.titulo}`,
      valor: input.valorMensal,
      dataVencimento: dueDateFrom(start, index, input.diaPagamentoMensal)
    }));

    const implantationBalance = Math.max(input.valorImplantacao - input.entrada, 0);
    const installments = input.implantacaoParcelada ? input.quantidadeParcelasImplantacao || 1 : implantationBalance > 0 ? 1 : 0;
    const implantation = implantationBalance > 0
      ? Array.from({ length: installments }).map((_, index) => ({
          clientId: input.clientId,
          contractId: contract.id,
          tipo: 'implantacao' as const,
          descricao: `Parcela de implantação ${index + 1}/${installments} - ${input.titulo}`,
          valor: implantationBalance / installments,
          dataVencimento: dueDateFrom(start, index, input.diaPagamentoMensal)
        }))
      : [];

    await tx.charge.createMany({ data: [...monthly, ...implantation] });

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
