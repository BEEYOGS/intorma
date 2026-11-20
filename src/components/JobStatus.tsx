export function JobStatus({ color, label }: { color: string; label: string }) {
  return (
    <span className="job-status" style={{ color }}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}44` }} />
      {label}
    </span>
  );
}
