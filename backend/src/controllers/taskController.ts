import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ok } from '../utils/apiResponse';
import { AppError } from '../utils/errors';
import { paramId } from '../utils/params';
import { audit } from '../services/auditService';
import { sendMail } from '../services/mailService';

const selectUser = { id: true, nome: true, email: true, role: true, ativo: true, emailVerificado: true, ultimoLogin: true, criadoEm: true, atualizadoEm: true };

async function notifyTask(taskId: string) {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, include: { responsavel: true, project: true, stage: true } });
  if (!task?.responsavel?.email) return;
  await sendMail({
    to: task.responsavel.email,
    subject: `Nova tarefa atribuída - ${task.titulo}`,
    html: `<p>Olá, ${task.responsavel.nome}.</p><p>Você recebeu uma tarefa no Nexus Gestão.</p><p><b>Projeto:</b> ${task.project.titulo}<br/><b>Setor:</b> ${task.stage.setor}<br/><b>Tarefa:</b> ${task.titulo}</p><p>Acesse o sistema para executar, aprovar ou atualizar o andamento.</p>`,
    text: `Nova tarefa atribuída: ${task.titulo} no projeto ${task.project.titulo}.`
  });
}

export async function listStages(_req: Request, res: Response) {
  return ok(res, await prisma.taskStage.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } }));
}

export async function createStage(req: Request, res: Response) {
  const stage = await prisma.taskStage.create({ data: req.body });
  await audit(req, 'Criação de setor de tarefas', 'TaskStage', stage.id);
  return ok(res, stage, 'Setor criado com sucesso');
}

export async function updateStage(req: Request, res: Response) {
  const stage = await prisma.taskStage.update({ where: { id: paramId(req.params.id) }, data: req.body });
  await audit(req, 'Edição de setor de tarefas', 'TaskStage', stage.id);
  return ok(res, stage, 'Setor atualizado com sucesso');
}

export async function deleteStage(req: Request, res: Response) {
  const stage = await prisma.taskStage.update({ where: { id: paramId(req.params.id) }, data: { ativo: false } });
  await audit(req, 'Desativação de setor de tarefas', 'TaskStage', stage.id);
  return ok(res, stage, 'Setor desativado com sucesso');
}

export async function listTasks(_req: Request, res: Response) {
  return ok(res, await prisma.projectTask.findMany({ include: { project: true, stage: true, responsavel: { select: selectUser }, product: true }, orderBy: { criadoEm: 'desc' } }));
}

export async function createTask(req: Request, res: Response) {
  const task = await prisma.projectTask.create({
    data: { ...req.body, prazo: req.body.prazo ? new Date(req.body.prazo) : undefined },
    include: { project: true, stage: true, responsavel: { select: selectUser }, product: true }
  });
  await notifyTask(task.id);
  await audit(req, 'Criação de tarefa', 'ProjectTask', task.id);
  return ok(res, task, 'Tarefa criada com sucesso');
}

export async function updateTask(req: Request, res: Response) {
  const task = await prisma.projectTask.update({
    where: { id: paramId(req.params.id) },
    data: { ...req.body, prazo: req.body.prazo ? new Date(req.body.prazo) : undefined },
    include: { project: true, stage: true, responsavel: { select: selectUser }, product: true }
  });
  await audit(req, 'Edição de tarefa', 'ProjectTask', task.id);
  return ok(res, task, 'Tarefa atualizada com sucesso');
}

export async function moveTask(req: Request, res: Response) {
  const task = await prisma.projectTask.update({ where: { id: paramId(req.params.id) }, data: { stageId: req.body.stageId, status: req.body.status || 'em_andamento' } });
  await audit(req, 'Movimentação de tarefa', 'ProjectTask', task.id);
  return ok(res, task, 'Tarefa movida com sucesso');
}

export async function approveTask(req: Request, res: Response) {
  const task = await prisma.projectTask.update({ where: { id: paramId(req.params.id) }, data: { status: 'aprovada', aprovadoEm: new Date(), approvedById: req.user?.id } });
  await audit(req, 'Aprovação de tarefa', 'ProjectTask', task.id);
  return ok(res, task, 'Tarefa aprovada com sucesso');
}

export async function rejectTask(req: Request, res: Response) {
  const task = await prisma.projectTask.update({ where: { id: paramId(req.params.id) }, data: { status: 'recusada', recusadoEm: new Date(), motivoRecusa: req.body.motivoRecusa } });
  await audit(req, 'Recusa de tarefa', 'ProjectTask', task.id);
  return ok(res, task, 'Tarefa recusada com sucesso');
}

export async function deleteTask(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const task = await prisma.projectTask.findUnique({ where: { id } });
  if (!task) throw new AppError(404, 'Tarefa não encontrada.');
  await prisma.projectTask.delete({ where: { id } });
  await audit(req, 'Exclusão de tarefa', 'ProjectTask', id);
  return ok(res, null, 'Tarefa excluída com sucesso');
}
