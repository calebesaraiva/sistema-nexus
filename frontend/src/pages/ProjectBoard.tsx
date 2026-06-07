import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Header } from './Dashboard';
import { Badge } from '../components/Badge';

type User = { id: string; nome: string; email: string };
type Client = { id: string; nomeEmpresa: string };
type Stage = { id: string; nome: string; setor: string; ordem: number };
type Project = { id: string; titulo: string; client?: Client };
type Task = { id: string; titulo: string; descricao?: string; status: string; prioridade: string; stageId: string; project: Project; responsavel?: User };

export function ProjectBoard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectForm, setProjectForm] = useState({ clientId: '', titulo: '', descricao: '', status: 'planejado' });
  const [stageForm, setStageForm] = useState({ nome: '', setor: '', ordem: 0, ativo: true });
  const [taskForm, setTaskForm] = useState({ projectId: '', stageId: '', responsavelId: '', titulo: '', descricao: '', prioridade: 'media' });

  async function load() {
    const [c, u, p, s, t] = await Promise.all([
      api.get<unknown, { data: Client[] }>('/clients'),
      api.get<unknown, { data: User[] }>('/team-users'),
      api.get<unknown, { data: Project[] }>('/projects'),
      api.get<unknown, { data: Stage[] }>('/task-stages'),
      api.get<unknown, { data: Task[] }>('/tasks')
    ]);
    setClients(c.data);
    setUsers(u.data);
    setProjects(p.data);
    setStages(s.data);
    setTasks(t.data);
  }

  useEffect(() => { load(); }, []);

  async function createProject() {
    await api.post('/projects', projectForm);
    toast.success('Projeto criado com sucesso');
    setProjectForm({ clientId: '', titulo: '', descricao: '', status: 'planejado' });
    await load();
  }

  async function createStage() {
    await api.post('/task-stages', stageForm);
    toast.success('Setor criado com sucesso');
    setStageForm({ nome: '', setor: '', ordem: 0, ativo: true });
    await load();
  }

  async function createTask() {
    await api.post('/tasks', taskForm);
    toast.success('Tarefa criada e e-mail enviado ao responsável');
    setTaskForm({ projectId: '', stageId: '', responsavelId: '', titulo: '', descricao: '', prioridade: 'media' });
    await load();
  }

  async function approve(id: string) {
    await api.patch(`/tasks/${id}/approve`);
    toast.success('Tarefa aprovada');
    await load();
  }

  async function reject(id: string) {
    const motivoRecusa = prompt('Informe o motivo da recusa');
    if (!motivoRecusa) return;
    await api.patch(`/tasks/${id}/reject`, { motivoRecusa });
    toast.success('Tarefa recusada');
    await load();
  }

  return (
    <section>
      <Header title="Projetos e tarefas" action="Quadro por setor com responsáveis, aprovação, recusa e e-mail" />
      <div className="panel form-grid">
        <label>Cliente<select value={projectForm.clientId} onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}><option value="">Selecione</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nomeEmpresa}</option>)}</select></label>
        <label>Título do projeto<input value={projectForm.titulo} onChange={(e) => setProjectForm({ ...projectForm, titulo: e.target.value })} /></label>
        <label>Descrição<input value={projectForm.descricao} onChange={(e) => setProjectForm({ ...projectForm, descricao: e.target.value })} /></label>
        <Button type="button" onClick={createProject}>Criar projeto</Button>
      </div>
      <div className="panel form-grid">
        <label>Nome do setor/coluna<input value={stageForm.nome} onChange={(e) => setStageForm({ ...stageForm, nome: e.target.value })} /></label>
        <label>Setor<input value={stageForm.setor} onChange={(e) => setStageForm({ ...stageForm, setor: e.target.value })} /></label>
        <label>Ordem<input type="number" value={stageForm.ordem} onChange={(e) => setStageForm({ ...stageForm, ordem: Number(e.target.value) })} /></label>
        <Button type="button" onClick={createStage}>Criar tópico/setor</Button>
      </div>
      <div className="panel form-grid">
        <label>Projeto<select value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}><option value="">Selecione</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>
        <label>Coluna/setor<select value={taskForm.stageId} onChange={(e) => setTaskForm({ ...taskForm, stageId: e.target.value })}><option value="">Selecione</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.nome} - {s.setor}</option>)}</select></label>
        <label>Responsável<select value={taskForm.responsavelId} onChange={(e) => setTaskForm({ ...taskForm, responsavelId: e.target.value })}><option value="">Sem responsável</option>{users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
        <label>Tarefa<input value={taskForm.titulo} onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })} /></label>
        <label>Descrição<input value={taskForm.descricao} onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })} /></label>
        <label>Prioridade<select value={taskForm.prioridade} onChange={(e) => setTaskForm({ ...taskForm, prioridade: e.target.value })}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
        <Button type="button" onClick={createTask}>Criar tarefa e notificar</Button>
      </div>
      <div className="kanban-board">
        {stages.map((stage) => (
          <div className="kanban-column" key={stage.id}>
            <h2>{stage.nome}<span>{stage.setor}</span></h2>
            {tasks.filter((task) => task.stageId === stage.id).map((task) => (
              <article className="task-card" key={task.id}>
                <b>{task.titulo}</b>
                <p>{task.project?.titulo}</p>
                <Badge>{task.status}</Badge>
                <small>{task.responsavel?.nome || 'Sem responsável'} - {task.prioridade}</small>
                <div className="actions">
                  <Button type="button" onClick={() => approve(task.id)}>Aprovar</Button>
                  <Button type="button" onClick={() => reject(task.id)}>Recusar</Button>
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
