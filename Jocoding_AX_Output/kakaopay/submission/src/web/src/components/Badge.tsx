import type { PropsWithChildren } from 'react';

type BadgeProps = PropsWithChildren<{
  tone?: 'default' | 'strong';
}>;

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
