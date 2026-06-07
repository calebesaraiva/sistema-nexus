import { AlertTriangle, Loader2, SearchX } from 'lucide-react';

export function LoadingState({ text = 'Carregando dados...' }: { text?: string }) {
  return <div className="state"><Loader2 className="spin" /><b>{text}</b></div>;
}

export function EmptyState({ title = 'Nada encontrado', text = 'Quando houver dados, eles aparecerão aqui.' }: { title?: string; text?: string }) {
  return <div className="state"><SearchX /><b>{title}</b><span>{text}</span></div>;
}

export function ErrorState({ text = 'Erro ao carregar dados.' }: { text?: string }) {
  return <div className="state danger"><AlertTriangle /><b>{text}</b></div>;
}
