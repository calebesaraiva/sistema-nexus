import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
page.on('dialog', (dialog) => dialog.accept('Recusa registrada no teste de interface'));
const suffix = Date.now().toString().slice(-6);

await page.goto('http://localhost:5173/login');
await page.getByLabel('E-mail').fill('calebesaraiva60@gmail.com');
await page.getByLabel('Senha').fill('Acesso@202425');
await page.getByRole('button', { name: /Entrar no sistema/i }).click();
await page.getByText('Dashboard financeiro').waitFor({ state: 'visible' });

await page.getByRole('link', { name: /^Produtos$/ }).click();
await page.getByLabel('Nome').fill(`Produto UI ${suffix}`);
await page.getByLabel('Descrição').fill('Produto criado pela interface');
await page.getByLabel('Categoria').fill('Teste UI');
await page.getByLabel('Preço base').fill('1990');
await page.getByRole('button', { name: /Criar item/i }).click();
await page.getByText(`Produto UI ${suffix}`).waitFor({ state: 'visible' });
await page.getByRole('button', { name: /^Editar$/ }).first().click();
await page.getByRole('button', { name: /Salvar alterações/i }).click();
console.log('ui product catalog ok');

await page.getByRole('link', { name: /^Pacotes$/ }).click();
await page.getByLabel('Nome').fill(`Pacote UI ${suffix}`);
await page.getByLabel('Descrição').fill('Pacote criado pela interface');
await page.getByLabel('Valor mensal').fill('899');
await page.getByLabel('Implantação').fill('1400');
await page.getByLabel('Produtos do pacote').selectOption({ index: 0 });
await page.getByRole('button', { name: /Criar item/i }).click();
await page.getByText(`Pacote UI ${suffix}`).waitFor({ state: 'visible' });
console.log('ui package catalog ok');

await page.getByRole('link', { name: /^Projetos$/ }).click();
await page.getByLabel('Cliente').selectOption({ index: 1 });
await page.getByLabel('Título do projeto').fill(`Projeto UI ${suffix}`);
await page.getByLabel('Descrição').first().fill('Projeto criado pela interface');
await page.getByRole('button', { name: /Criar projeto/i }).click();
await page.getByText('Projeto criado com sucesso').waitFor({ state: 'visible' });
await page.getByLabel('Nome do setor/coluna').fill(`Setor UI ${suffix}`);
await page.getByLabel('Setor', { exact: true }).fill('Programacao UI');
await page.getByLabel('Ordem').fill('60');
await page.getByRole('button', { name: /Criar tópico\/setor/i }).click();
await page.getByRole('heading', { name: new RegExp(`Setor UI ${suffix}`) }).waitFor({ state: 'visible' });
await page.locator('select').nth(1).selectOption({ index: 1 });
await page.locator('select').nth(2).selectOption({ index: 1 });
await page.locator('select').nth(3).selectOption({ index: 1 });
await page.getByLabel('Tarefa').fill(`Task UI ${suffix}`);
await page.getByLabel('Descrição').nth(1).fill('Tarefa criada pela interface');
await page.getByLabel('Prioridade').selectOption('alta');
await page.getByRole('button', { name: /Criar tarefa e notificar/i }).click();
await page.getByText(`Task UI ${suffix}`).waitFor({ state: 'visible' });
await page.getByRole('button', { name: /^Aprovar$/ }).first().click();
await page.getByText('Tarefa aprovada').waitFor({ state: 'visible' });
await page.getByRole('button', { name: /^Recusar$/ }).first().click();
await page.getByText('Tarefa recusada').waitFor({ state: 'visible' });
console.log('ui project task board ok');

await browser.close();
console.log('UI_CATALOG_TASKS_E2E_OK');
