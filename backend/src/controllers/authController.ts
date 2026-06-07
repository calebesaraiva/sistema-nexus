import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';
import { audit } from '../services/auditService';
import { addMinutes, compareCode, generateCode, hashCode } from '../utils/security';
import { passwordResetEmail, professionalApprovalEmail, sendMail } from '../services/mailService';

const publicUser = { id: true, nome: true, email: true, role: true, ativo: true, emailVerificado: true, ultimoLogin: true, criadoEm: true, atualizadoEm: true };
const jwtSecret = () => process.env.JWT_SECRET || 'dev-secret';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export async function login(req: Request, res: Response) {
  const { email, senha } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.ativo || !(await bcrypt.compare(senha, user.senhaHash))) throw new AppError(401, 'E-mail ou senha inválidos.');
  if (!user.emailVerificado) throw new AppError(403, 'Confirme seu e-mail antes de acessar o sistema.');
  const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] });
  const refreshToken = jwt.sign({ sub: user.id }, refreshSecret(), { expiresIn: '7d' });
  await prisma.user.update({ where: { id: user.id }, data: { ultimoLogin: new Date() } });
  await audit(req, 'Login', 'User', user.id);
  return ok(res, { token, refreshToken, user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUser }) }, 'Login realizado com sucesso');
}

export async function me(req: Request, res: Response) {
  return ok(res, await prisma.user.findUnique({ where: { id: req.user!.id }, select: publicUser }));
}

export async function register(req: Request, res: Response) {
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
    select: publicUser
  });
  const mail = professionalApprovalEmail(user.nome, code);
  await sendMail({ to: user.email, ...mail });
  await audit(req, 'Criação de usuário', 'User', user.id);
  return ok(res, user, 'Usuário criado com sucesso. Enviamos o código de confirmação por e-mail.');
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const payload = jwt.verify(refreshToken, refreshSecret()) as { sub: string };
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.ativo) throw new AppError(401, 'Sessão inválida.');
  const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] });
  return ok(res, { token });
}

export async function verifyEmail(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) throw new AppError(404, 'Usuário não encontrado.');
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) throw new AppError(400, 'Código expirado. Solicite um novo código.');
  if (!(await compareCode(req.body.code, user.emailVerificationCodeHash))) throw new AppError(400, 'Código de confirmação inválido.');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificado: true, emailVerificationCodeHash: null, emailVerificationExpiresAt: null },
    select: publicUser
  });
  await audit(req, 'Verificação de e-mail', 'User', user.id);
  return ok(res, updated, 'E-mail verificado com sucesso');
}

export async function forgotPassword(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user) {
    const code = generateCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetCodeHash: await hashCode(code), passwordResetExpiresAt: addMinutes(30) }
    });
    const mail = passwordResetEmail(user.nome, code);
    await sendMail({ to: user.email, ...mail });
    await audit(req, 'Solicitação de recuperação de senha', 'User', user.id);
  }
  return ok(res, null, 'Se o e-mail existir no sistema, enviaremos um código de recuperação.');
}

export async function resetPassword(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) throw new AppError(404, 'Usuário não encontrado.');
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) throw new AppError(400, 'Código expirado. Solicite um novo código.');
  if (!(await compareCode(req.body.code, user.passwordResetCodeHash))) throw new AppError(400, 'Código de recuperação inválido.');
  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: await bcrypt.hash(req.body.senha, 12), passwordResetCodeHash: null, passwordResetExpiresAt: null }
  });
  await audit(req, 'Redefinição de senha', 'User', user.id);
  return ok(res, null, 'Senha redefinida com sucesso');
}
