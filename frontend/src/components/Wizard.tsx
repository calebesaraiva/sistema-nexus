import { ReactNode, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';

export type WizardStep = {
  title: string;
  description: string;
  content: ReactNode;
  isValid: boolean;
};

export function Wizard({ title, steps, saving, onCancel, onFinish }: { title: string; steps: WizardStep[]; saving?: boolean; onCancel?: () => void; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const progress = useMemo(() => Math.round(((index + 1) / steps.length) * 100), [index, steps.length]);
  const canGoNext = step?.isValid;

  function next() {
    if (!canGoNext) return;
    if (index === steps.length - 1) onFinish();
    else setIndex((current) => current + 1);
  }

  return (
    <div className="wizard-shell">
      <div className="wizard-head">
        <div>
          <span>{title}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </div>
        <b>{index + 1}/{steps.length}</b>
      </div>
      <div className="wizard-progress"><i style={{ width: `${progress}%` }} /></div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="wizard-body"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.18 }}
        >
          {step.content}
        </motion.div>
      </AnimatePresence>
      <div className="wizard-actions">
        {onCancel ? <Button type="button" onClick={onCancel}>Cancelar</Button> : null}
        <Button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>Voltar</Button>
        <Button type="button" onClick={next} disabled={!canGoNext} loading={saving}>{index === steps.length - 1 ? 'Salvar' : 'Próximo'}</Button>
      </div>
    </div>
  );
}

export function SummaryGrid({ items }: { items: { label: string; value?: ReactNode }[] }) {
  return <div className="summary-grid">{items.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.value || '-'}</b></div>)}</div>;
}
