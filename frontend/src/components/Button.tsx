import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Button({ loading, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; children: ReactNode }) {
  return <button {...props} className={`btn ${props.className || ''}`} disabled={loading || props.disabled}>{loading ? <Loader2 className="spin" /> : null}{children}</button>;
}
