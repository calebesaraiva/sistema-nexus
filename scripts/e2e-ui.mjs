import { chromium } from '@playwright/test';

const base = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const log = [];

async function expectVisible(text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
  log.push(`visible: ${text}`);
}

await page.goto(base);
await expectVisible('Nexus Gestão');
await page.getByLabel('E-mail').fill('calebesaraiva60@gmail.com');
await page.getByLabel('Senha').fill('Acesso@202425');
await page.getByRole('button', { name: /Entrar no sistema/i }).click();
await expectVisible('Dashboard financeiro');
await expectVisible('Clientes ativos');

for (const item of ['Clientes', 'Contratos', 'Financeiro', 'Cobranças', 'Produtos', 'Pacotes', 'Projetos', 'Mensagens', 'Usuários', 'Auditoria', 'Configurações']) {
  await page.getByRole('link', { name: new RegExp(item, 'i') }).click();
  await expectVisible(item === 'Usuários' ? 'Usuários do sistema' : item);
}

await page.getByRole('button', { name: /Tema escuro/i }).click();
await page.waitForTimeout(300);
log.push(`theme after dark click: ${await page.evaluate(() => document.documentElement.dataset.theme)}`);
await page.getByRole('button', { name: /Tema claro/i }).click();
await page.waitForTimeout(300);
log.push(`theme after light click: ${await page.evaluate(() => document.documentElement.dataset.theme)}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.getByTitle('Abrir menu').click();
await page.getByRole('link', { name: /Clientes/i }).click();
await expectVisible('Clientes');
log.push('mobile menu ok');

await browser.close();
console.log(log.join('\n'));
console.log('UI_E2E_OK');
