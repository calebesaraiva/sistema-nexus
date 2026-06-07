export function Badge({ children }: { children: string }) {
  return <span className={`badge badge-${children.toLowerCase()}`}>{children}</span>;
}
