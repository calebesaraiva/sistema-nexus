import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
await page.goto('http://localhost:5173/login');
await page.screenshot({ path: 'dist/login-light.png', fullPage: true });
await page.getByLabel('E-mail').fill('calebesaraiva60@gmail.com');
await page.getByLabel('Senha').fill('Acesso@202425');
await page.getByRole('button', { name: /Entrar no sistema/i }).click();
await page.getByText('Dashboard financeiro').waitFor({ state: 'visible' });
await page.screenshot({ path: 'dist/dashboard-light.png', fullPage: true });
await page.getByRole('button', { name: /Tema escuro/i }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'dist/dashboard-dark.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'dist/dashboard-mobile.png', fullPage: true });
await browser.close();
console.log('VISUAL_SCREENSHOTS_OK');
