import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const products = [
  'Site Institucional',
  'Sistema Sob Medida',
  'Aplicativo Mobile',
  'Automação WhatsApp',
  'Automação Instagram',
  'UI/UX Design',
  'Dashboard e Dados',
  'Segurança Digital',
  'Consultoria em Tecnologia',
  'Projeto Personalizado'
];

async function main() {
  const senhaHash = await bcrypt.hash('Acesso@202425', 12);
  await prisma.user.upsert({
    where: { email: 'calebesaraiva60@gmail.com' },
    update: { senhaHash, role: 'ADMIN_MASTER', ativo: true, emailVerificado: true },
    create: { nome: 'Calebe Saraiva', email: 'calebesaraiva60@gmail.com', senhaHash, role: 'ADMIN_MASTER', emailVerificado: true }
  });

  const esposaHash = await bcrypt.hash('21012018', 12);
  await prisma.user.upsert({
    where: { email: 'Herminiacmaria@gmail.com' },
    update: { senhaHash: esposaHash, role: 'ADMIN_MASTER', ativo: true, emailVerificado: true },
    create: { nome: 'Herminia Saraiva', email: 'Herminiacmaria@gmail.com', senhaHash: esposaHash, role: 'ADMIN_MASTER', emailVerificado: true }
  });

  for (const nome of products) {
    await prisma.product.upsert({
      where: { nome },
      update: {},
      create: { nome, categoria: 'Nexus', descricao: `${nome} da Nexus Tecnologia LTDA`, precoBase: 0 }
    });
  }

  const all = await prisma.product.findMany();
  const byName = new Map(all.map((p) => [p.nome, p.id]));
  const packages = [
    { nome: 'Pacote Sistema', valorMensal: 497, itens: ['Sistema Sob Medida', 'Dashboard e Dados'] },
    { nome: 'Pacote Marketing', valorMensal: 697, itens: ['Site Institucional', 'UI/UX Design', 'Automação Instagram'] },
    { nome: 'Pacote Completo', valorMensal: 997, itens: ['Sistema Sob Medida', 'Automação WhatsApp', 'Site Institucional', 'Dashboard e Dados', 'Consultoria em Tecnologia'] }
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { nome: pkg.nome },
      update: { valorMensal: pkg.valorMensal },
      create: {
        nome: pkg.nome,
        descricao: `${pkg.nome} da Nexus`,
        valorMensal: pkg.valorMensal,
        products: { create: pkg.itens.map((item) => ({ productId: byName.get(item)! })) }
      }
    });
  }

  await prisma.messageTemplate.createMany({
    data: [
      {
        nome: 'Lembrete de pagamento',
        tipo: 'lembrete_pagamento',
        conteudo: 'Olá, {{cliente}}! Passando para lembrar que sua mensalidade da Nexus Tecnologia vence no dia {{vencimento}} no valor de {{valor}}.'
      },
      {
        nome: 'Cobrança vencida',
        tipo: 'cobranca_vencida',
        conteudo: 'Olá, {{cliente}}! Identificamos que existe uma cobrança vencida referente ao contrato {{contrato}}, no valor de {{valor}}, vencida em {{vencimento}}.'
      }
    ],
    skipDuplicates: true
  });

  await prisma.taskStage.createMany({
    data: [
      { nome: 'Backlog', setor: 'Administração', ordem: 1 },
      { nome: 'Design', setor: 'Design', ordem: 2 },
      { nome: 'Programação', setor: 'Programação', ordem: 3 },
      { nome: 'Pós-venda', setor: 'Pós-venda', ordem: 4 },
      { nome: 'Aprovação', setor: 'Gestão', ordem: 5 },
      { nome: 'Concluído', setor: 'Entrega', ordem: 6 }
    ],
    skipDuplicates: true
  });
}

main().finally(() => prisma.$disconnect());
