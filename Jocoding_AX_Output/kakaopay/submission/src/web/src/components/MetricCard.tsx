type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: 'default' | 'caution' | 'risk';
};

export function MetricCard({
  label,
  value,
  helper,
  tone = 'default',
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
