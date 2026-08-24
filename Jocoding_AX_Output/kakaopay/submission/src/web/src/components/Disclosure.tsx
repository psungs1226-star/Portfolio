import type { PropsWithChildren } from 'react';

type DisclosureProps = PropsWithChildren<{
  title: string;
  open: boolean;
  onToggle: () => void;
}>;

export function Disclosure({ title, open, onToggle, children }: DisclosureProps) {
  return (
    <div className="disclosure">
      <button
        className="disclosure-trigger"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span aria-hidden="true">{open ? '접기' : '열기'}</span>
      </button>
      {open ? <div className="disclosure-panel">{children}</div> : null}
    </div>
  );
}
