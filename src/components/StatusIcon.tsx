import { Ban, CheckCircle2, Clock3, Paintbrush, RotateCcw } from "lucide-react";
import { STATUS_META, type Status, type StatusIconName } from "@/lib/status";

const icons = {
  clock: Clock3,
  brush: Paintbrush,
  rotate: RotateCcw,
  check: CheckCircle2,
  ban: Ban,
} as const;

export function StatusIcon({
  name,
  className = "size-4",
}: {
  name: StatusIconName;
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon aria-hidden className={className} strokeWidth={1.8} />;
}

export function IconForStatus({ status, className }: { status: Status; className?: string }) {
  return <StatusIcon name={STATUS_META[status].icon} className={className} />;
}
