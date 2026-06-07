# Nexus Gestão

Sistema full-stack para a Nexus Tecnologia LTDA gerenciar clientes, contratos, cobranças, implantação, pacotes, produtos, usuários, mensagens, financeiro, projetos e permissões.

## Instalação

```bash
npm install
cp .env.example .env
```

Configure `DATABASE_URL` no `.env` para um PostgreSQL válido.

## Banco

```bash
npm run prisma:migrate
npm run prisma:seed
```

Login inicial:

- MASTER principal: `calebesaraiva60@gmail.com`
- Segundo MASTER: cadastrado no seed para Herminia Saraiva
- Perfil: `ADMIN_MASTER`

## Rodar

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

URLs padrão:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3333`
- Health check: `http://localhost:3333/health`

## Scripts

- `npm run build`: compila backend e frontend.
- `npm run lint`: executa checagem TypeScript.
- `npm run start`: inicia o backend compilado.
- `npm run preview`: preview do frontend.

## Testes ponta a ponta

Com PostgreSQL e backend/frontend rodando:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e-api.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e-catalog-tasks.ps1
node scripts/e2e-ui.mjs
node scripts/e2e-ui-pay.mjs
node scripts/e2e-ui-catalog-tasks.mjs
node scripts/visual-check.mjs
```

## Rotas principais

- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/register`
- Usuários: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id/block`, `PATCH /api/users/:id/unblock`
- Clientes: `GET /api/clients`, `GET /api/clients/:id`, `POST /api/clients`, `PUT /api/clients/:id`, `DELETE /api/clients/:id`
- Produtos e pacotes: `GET /api/products`, `GET /api/packages`
- Catálogo editável: `POST/PUT/DELETE /api/products`, `POST/PUT/DELETE /api/packages`
- Contratos: `GET /api/contracts`, `POST /api/contracts`, `PATCH /api/contracts/:id/status`
- Cobranças e pagamentos: `GET /api/charges`, `PATCH /api/charges/:id/pay`, `GET /api/payments`
- Dashboard: `GET /api/dashboard/financial`
- Mensagens: `GET /api/message-templates`, `POST /api/messages/generate`, `POST /api/messages/send`
- Projetos: `GET/POST/PUT/DELETE /api/projects`
- Quadro de tarefas: `GET/POST/PUT/DELETE /api/task-stages`, `GET/POST/PUT/DELETE /api/tasks`, `PATCH /api/tasks/:id/approve`, `PATCH /api/tasks/:id/reject`, `PATCH /api/tasks/:id/move`
- Auditoria: `GET /api/audit-logs`
- Uploads: `POST /api/uploads`

## E-mail

O sistema usa SMTP pelo remetente `comercial@nexustecnologialtda.com.br`.

Variáveis:

- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Quando o SMTP não está configurado, o envio é registrado no console para desenvolvimento. Em produção, configure as credenciais reais no `.env` da VPS.

## Permissões

- `ADMIN_MASTER`: acesso total, usuários, auditoria, exclusão segura de clientes e configurações.
- `ADMIN`: clientes, contratos, produtos, pacotes, cobranças e projetos sem gerenciar usuários críticos.
- `FINANCEIRO`: financeiro, cobranças, pagamentos, contratos e mensagens de cobrança.
- `VENDEDOR`: clientes prospectos, produtos, pacotes e mensagens.
- `SUPORTE`: clientes, projetos e observações operacionais.

As permissões são aplicadas no frontend e também no backend via middleware de roles.
