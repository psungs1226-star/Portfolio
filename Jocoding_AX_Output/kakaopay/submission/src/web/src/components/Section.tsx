import { useId, type PropsWithChildren } from 'react';

type SectionProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function Section({ title, description, children }: SectionProps) {
  const headingId = useId();

  return (
    <section className="section" aria-labelledby={headingId}>
      <div className="section-heading">
        <h2 id={headingId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
