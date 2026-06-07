import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
page.on('dialog', (dialog) => dialog.accept());
const suffix = Date.now().toString().slice(-6);

await page.goto('http://localhost:5173/login');
await page.getByLabel('E-mail').fill('calebesaraiva60@gmail.com');
await page.getByLabel('Senha').fill('Acesso@202425');
await page.getByRole('button', { name: /Entrar no sistema/i }).click();
await page.getByText('Dashboard financeiro').waitFor({ state: 'visible' });

await page.getByRole('link', { name: /Clientes/i }).click();
await page.getByRole('link', { name: /Novo cliente/i }).click();
await page.getByLabel('nomeEmpresa').fill(`Cliente UI ${suffix}`);
await page.getByLabel('nomeResponsavel').fill('Responsavel UI');
await page.getByLabel('email').fill(`cliente.ui.${suffix}@nexus.test`);
await page.getByLabel('telefone').fill('999999999');
await page.getByLabel('cidade').fill('Imperatriz');
await page.getByLabel('estado').fill('MA');
await page.getByLabel('Status').selectOption('ativo');
await page.getByRole('button', { name: /Salvar cliente/i }).click();
await page.getByText(`Cliente UI ${suffix}`).waitFor({ state: 'visible' });
console.log('ui client create ok');

await page.getByRole('link', { name: /Contratos/i }).click();
await page.getByRole('link', { name: /Novo contrato/i }).click();
await page.getByLabel('Cliente').selectOption({ index: 0 });
await page.getByLabel('Pacote').selectOption({ index: 1 });
await page.getByLabel('titulo').fill(`Contrato UI ${suffix}`);
await page.getByLabel('descricao').fill('Contrato criado pelo teste de interface');
await page.getByLabel('dataInicio').fill('2026-06-10');
await page.getByLabel('validadeMeses').fill('12');
await page.getByLabel('diaPagamentoMensal').fill('15');
await page.getByLabel('valorMensal').fill('500');
await page.getByLabel('valorTotalContrato').fill('6000');
await page.getByLabel('valorImplantacao').fill('1200');
await page.getByLabel('entrada').fill('300');
await page.getByLabel('quantidadeParcelasImplantacao').fill('3');
await page.getByLabel('observacoes').fill('Contrato assinado fora do sistema');
await page.getByRole('button', { name: /Salvar contrato/i }).click();
await page.getByText(`Contrato UI ${suffix}`).waitFor({ state: 'visible' });
console.log('ui contract create ok');

await page.getByRole('link', { name: /Cobranças/i }).click();
const payButton = page.getByRole('button', { name: /^Pagar$/ }).first();
if (await payButton.count()) {
  await payButton.click();
  await page.getByText('Pagamento confirmado').waitFor({ state: 'visible' });
  console.log('ui charge pay ok');
}

await page.getByRole('link', { name: /Usuários/i }).click();
await page.getByLabel('Nome').fill(`Usuario UI ${suffix}`);
await page.getByLabel('E-mail').fill(`usuario.ui.${suffix}@nexus.test`);
await page.getByLabel('Senha temporária').fill('Senha@12345');
await page.getByLabel('Perfil').selectOption('SUPORTE');
await page.getByRole('button', { name: /Criar usuário e enviar e-mail/i }).click();
await page.getByText(`usuario.ui.${suffix}@nexus.test`).waitFor({ state: 'visible' });
console.log('ui user create ok');

await browser.close();
console.log('UI_ACTIONS_E2E_OK');
